import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Erro: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
  realtime: { transport: WebSocket }
});

function generateSlug(title) {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .trim();
}

async function run() {
  const startTime = Date.now();
  console.log('--- INICIANDO SINCRONIZAÇÃO RESILIENTE ---');
  
  let logId = null;
  let currentStep = 'initializing';
  
  try {
    const { data: logEntry } = await supabase
      .from('sync_logs')
      .insert({ status: 'running', started_at: new Date().toISOString(), failed_at_step: currentStep })
      .select().single();
    logId = logEntry?.id;
  } catch (e) { console.error('Erro ao criar log:', e.message); }

  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
  });
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await context.newPage();
  let imported = 0;
  let updated = 0;
  let failed = 0;
  let finalBaseUrl = '';

  try {
    // 1. Verificar URL em cache
    currentStep = 'fetching_cached_url';
    const { data: settings } = await supabase.from('sync_settings').select('value').eq('key', 'last_discovered_url').single();
    let startUrl = settings?.value || 'https://acesso-starck.com';
    
    console.log(`[1/6] Acessando URL de entrada: ${startUrl}`);
    await page.goto(startUrl, { waitUntil: 'networkidle', timeout: 60000 });

    // 2. Fluxo de validação se necessário
    if (page.url().includes('acesso-starck.com')) {
      currentStep = 'bypass_gateway';
      console.log('Detectado gateway de acesso. Iniciando bypass...');
      
      // Clique em "IR PARA O NOVO DOMÍNIO"
      const alertBtn = page.locator('#alert:has-text("👉 IR PARA O NOVO DOMÍNIO")');
      if (await alertBtn.isVisible()) {
        await alertBtn.click();
        console.log('Botão "IR PARA O NOVO DOMÍNIO" clicado.');
      }

      // Aguardar modal "Análise de acesso" e clicar "Próximo"
      const proximoBtn = page.getByRole('button', { name: 'Próximo' });
      await proximoBtn.waitFor({ state: 'visible', timeout: 30000 });
      await proximoBtn.click();
      console.log('Botão "Próximo" clicado.');

      // Aguardar validação e clicar "OK"
      const okBtn = page.getByRole('button', { name: 'OK' });
      await okBtn.waitFor({ state: 'visible', timeout: 60000 });
      await okBtn.click();
      console.log('Botão "OK" clicado. Validação concluída.');
      
      await page.waitForLoadState('networkidle');
    }

    finalBaseUrl = new URL(page.url()).origin;
    console.log(`[2/6] URL Final Descoberta: ${finalBaseUrl}`);
    
    // Salvar URL descoberta
    await supabase.from('sync_settings').upsert({ key: 'last_discovered_url', value: finalBaseUrl, updated_at: new Date().toISOString() });

    // 3. Navegar para o catálogo
    currentStep = 'navigating_to_catalog';
    const catalogUrl = `${finalBaseUrl}/catalog/all`;
    console.log(`[3/6] Acessando Catálogo: ${catalogUrl}`);
    await page.goto(catalogUrl, { waitUntil: 'networkidle', timeout: 60000 });
    
    // Pequena pausa para garantir carregamento dinâmico
    await page.waitForTimeout(5000);

    // 4. Extração Incremental
    currentStep = 'extracting_data';
    console.log('[4/6] Extraindo dados e verificando duplicatas...');
    
    // Buscar hashes existentes para ignorar
    const { data: existingMovies } = await supabase.from('movies').select('external_id');
    const existingIds = new Set(existingMovies?.map(m => m.external_id) || []);

    const catalogData = await page.evaluate(() => {
      const results = { items: [], bks: [] };
      if (window.buttonLinks && Array.isArray(window.buttonLinks)) {
        results.items = window.buttonLinks;
        results.bks = window.imgBk || [];
      }
      return results;
    });

    if (catalogData.items.length === 0) {
      throw new Error('Nenhum dado encontrado no catálogo. A variável buttonLinks está vazia.');
    }

    console.log(`[5/6] Processando ${catalogData.items.length} itens encontrados...`);

    for (let i = 0; i < catalogData.items.length; i++) {
      const item = catalogData.items[i];
      const magnet = item.btnInfo?.[0]?.url || '';
      const magnetHash = magnet.match(/btih:([a-zA-Z0-9]+)/)?.[1]?.toLowerCase() || `slug-${generateSlug(item.title)}`;

      // Incremental: pular se já existe e não for atualização forçada (aqui fazemos sempre upsert mas poderíamos pular)
      // Para performance, só fazemos o upsert se necessário ou se o usuário quiser atualizar metadados.
      // O usuário pediu "não reimportar conteúdo existente", então vamos pular se o hash existir.
      if (existingIds.has(magnetHash)) {
        continue; 
      }

      try {
        const slug = generateSlug(item.title);
        const movieData = {
          title: item.title,
          slug: slug,
          external_id: magnetHash,
          poster: item.poster || '',
          backdrop: catalogData.bks[i] || item.poster || '',
          magnet: magnet,
          rating: parseFloat(item.rating) || 8.0,
          year: parseInt(item.year) || new Date().getFullYear(),
          type: (item.category === 'tv' || item.title.toLowerCase().includes('série')) ? 'series' : 'movie',
          last_sync_at: new Date().toISOString()
        };

        const { error, status } = await supabase.from('movies').upsert(movieData, { onConflict: 'external_id' });
        if (error) failed++;
        else status === 201 ? imported++ : updated++;
      } catch (e) { failed++; }
    }

    console.log(`[6/6] Sincronização concluída. Novos: ${imported}, Atualizados: ${updated}, Falhas: ${failed}`);

    if (logId) {
      await supabase.from('sync_logs').update({
        status: 'success',
        finished_at: new Date().toISOString(),
        imported, updated, failed,
        base_url: finalBaseUrl,
        duration_seconds: Math.round((Date.now() - startTime) / 1000)
      }).eq('id', logId);
    }

  } catch (error) {
    console.error(`ERRO no passo "${currentStep}":`, error.message);
    
    // Capturar screenshot de falha
    let artifactPath = null;
    try {
      const screenshotName = `error-${Date.now()}.png`;
      const screenshotPath = path.join('/tmp', screenshotName);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      
      const fileBuffer = fs.readFileSync(screenshotPath);
      const { data: uploadData } = await supabase.storage
        .from('sync-artifacts')
        .upload(screenshotName, fileBuffer, { contentType: 'image/png' });
      
      if (uploadData) artifactPath = uploadData.path;
    } catch (e) { console.error('Falha ao salvar screenshot:', e.message); }

    if (logId) {
      await supabase.from('sync_logs').update({
        status: 'error',
        finished_at: new Date().toISOString(),
        raw_error: error.message,
        failed_at_step: currentStep,
        artifact_path: artifactPath,
        base_url: finalBaseUrl || page.url()
      }).eq('id', logId);
    }
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
