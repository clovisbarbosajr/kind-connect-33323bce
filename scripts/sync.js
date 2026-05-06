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
  console.log('--- INICIANDO SINCRONIZAÇÃO INCREMENTAL INTELIGENTE ---');
  
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
  let ignored = 0;
  let failed = 0;
  let finalBaseUrl = '';

  try {
    // 1. Verificar se é a primeira execução (banco vazio)
    currentStep = 'check_db_state';
    const { count: movieCount } = await supabase.from('movies').select('*', { count: 'exact', head: true });
    const isFullSync = movieCount === 0;
    console.log(`Estado do banco: ${movieCount} títulos. Modo: ${isFullSync ? 'CARGA COMPLETA' : 'INCREMENTAL'}`);

    // 2. Resolver URL Base (Acesso Starck)
    currentStep = 'resolving_base_url';
    const { data: settings } = await supabase.from('sync_settings').select('value').eq('key', 'last_discovered_url').single();
    let startUrl = settings?.value || 'https://acesso-starck.com';
    
    await page.goto(startUrl, { waitUntil: 'networkidle', timeout: 60000 });

    if (page.url().includes('acesso-starck.com')) {
      console.log('Executando bypass do gateway...');
      const alertBtn = page.locator('#alert:has-text("👉 IR PARA O NOVO DOMÍNIO")');
      if (await alertBtn.isVisible()) await alertBtn.click();
      const proximoBtn = page.getByRole('button', { name: 'Próximo' });
      await proximoBtn.waitFor({ state: 'visible', timeout: 20000 });
      await proximoBtn.click();
      const okBtn = page.getByRole('button', { name: 'OK' });
      await okBtn.waitFor({ state: 'visible', timeout: 40000 });
      await okBtn.click();
      await page.waitForLoadState('networkidle');
    }

    finalBaseUrl = new URL(page.url()).origin;
    await supabase.from('sync_settings').upsert({ key: 'last_discovered_url', value: finalBaseUrl, updated_at: new Date().toISOString() });

    // 3. Definir URL de Captura (Todo o catálogo se vazio, ou Year=2026 se incremental)
    const targetPath = isFullSync ? '/catalog/all' : '/catalog/all?year=2026';
    const pagesToScan = isFullSync ? 20 : 3; // Varre mais se for a primeira vez
    
    // 4. Buscar hashes existentes para pular
    const { data: existingMovies } = await supabase.from('movies').select('external_id');
    const existingIds = new Set(existingMovies?.map(m => m.external_id) || []);

    for (let p = 1; p <= pagesToScan; p++) {
      currentStep = `scanning_page_${p}`;
      const pageUrl = `${finalBaseUrl}${targetPath}${targetPath.includes('?') ? '&' : '?'}page=${p}`;
      console.log(`[Página ${p}/${pagesToScan}] Acessando: ${pageUrl}`);
      
      await page.goto(pageUrl, { waitUntil: 'networkidle', timeout: 60000 });
      
      // --- REMOVER POPUPS E MODAIS (Telegram, etc) ---
      await page.evaluate(() => {
        const selectors = ['.modal', '.popup', '#telegram-popup', '.swal2-container', '[class*="popup"]', '[id*="modal"]'];
        selectors.forEach(s => {
          document.querySelectorAll(s).forEach(el => el.remove());
        });
        // Remove overlays que impedem clique
        document.querySelectorAll('.modal-backdrop, .overlay').forEach(el => el.remove());
        document.body.style.overflow = 'auto';
      });

      await page.waitForTimeout(3000);

      // Extração
      const catalogData = await page.evaluate(() => {
        const results = { items: [], bks: [] };
        if (window.buttonLinks && Array.isArray(window.buttonLinks)) {
          results.items = window.buttonLinks;
          results.bks = window.imgBk || [];
        }
        return results;
      });

      if (catalogData.items.length === 0) {
        console.log(`Página ${p} vazia ou fim do catálogo.`);
        break;
      }

      console.log(`Encontrados ${catalogData.items.length} itens na página ${p}.`);

      for (let i = 0; i < catalogData.items.length; i++) {
        const item = catalogData.items[i];
        const magnet = item.btnInfo?.[0]?.url || '';
        const magnetHash = magnet.match(/btih:([a-zA-Z0-9]+)/)?.[1]?.toLowerCase() || `slug-${generateSlug(item.title)}`;

        if (existingIds.has(magnetHash)) {
          ignored++;
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
          if (error) {
            console.error(`Erro ao salvar ${item.title}:`, error.message);
            failed++;
          } else {
            status === 201 ? imported++ : updated++;
            existingIds.add(magnetHash); // Evita duplicados na mesma run
          }
        } catch (e) { failed++; }
      }
      
      // Se for incremental e não encontramos nada novo em uma página inteira, podemos parar mais cedo
      if (!isFullSync && imported === 0 && p > 1) {
        console.log('Nenhum título novo nesta página. Encerrando busca incremental.');
        break;
      }
    }

    console.log(`FINALIZADO: Novos: ${imported} | Atualizados: ${updated} | Ignorados: ${ignored} | Falhas: ${failed}`);

    if (logId) {
      await supabase.from('sync_logs').update({
        status: 'success',
        finished_at: new Date().toISOString(),
        imported, updated, ignored, failed,
        base_url: finalBaseUrl,
        duration_seconds: Math.round((Date.now() - startTime) / 1000)
      }).eq('id', logId);
    }

  } catch (error) {
    console.error(`ERRO CRÍTICO no passo "${currentStep}":`, error.message);
    
    // Artifacts
    try {
      const timestamp = Date.now();
      const screenshotName = `error-${timestamp}.png`;
      const htmlName = `error-${timestamp}.html`;
      
      await page.screenshot({ path: `/tmp/${screenshotName}`, fullPage: true });
      const htmlContent = await page.content();
      fs.writeFileSync(`/tmp/${htmlName}`, htmlContent);
      
      await supabase.storage.from('sync-artifacts').upload(screenshotName, fs.readFileSync(`/tmp/${screenshotName}`), { contentType: 'image/png' });
      await supabase.storage.from('sync-artifacts').upload(htmlName, fs.readFileSync(`/tmp/${htmlName}`), { contentType: 'text/html' });
      
      if (logId) {
        await supabase.from('sync_logs').update({
          status: 'error',
          finished_at: new Date().toISOString(),
          raw_error: error.message,
          failed_at_step: currentStep,
          artifact_path: screenshotName,
          base_url: finalBaseUrl || page.url()
        }).eq('id', logId);
      }
    } catch (e) { console.error('Erro ao salvar artefatos:', e.message); }
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
