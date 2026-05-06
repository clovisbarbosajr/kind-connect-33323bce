import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import fs from 'fs';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
  realtime: { transport: WebSocket }
});

function generateSlug(title) {
  return title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/--+/g, '-').trim();
}

async function saveArtifact(page, name, type) {
  try {
    const timestamp = Date.now();
    const fileName = `${name}-${timestamp}.${type}`;
    const filePath = `/tmp/${fileName}`;
    
    if (type === 'png') {
      await page.screenshot({ path: filePath, fullPage: true });
    } else {
      const html = await page.content();
      fs.writeFileSync(filePath, html);
    }
    
    const fileBuffer = fs.readFileSync(filePath);
    await supabase.storage.from('sync-artifacts').upload(fileName, fileBuffer, { 
      contentType: type === 'png' ? 'image/png' : 'text/html',
      upsert: true 
    });
    console.log(`[Artefato] Salvo: ${fileName}`);
    return fileName;
  } catch (e) {
    console.error(`[Artefato] Erro ao salvar ${name}:`, e.message);
    return null;
  }
}

async function run() {
  console.log('--- INICIANDO CRAWLER DE VALIDAÇÃO REAL ---');
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' });
  const page = await context.newPage();

  try {
    // PASSO 0: Desativar animações para evitar "element is not stable"
    await page.addStyleTag({
      content: `* { 
        transition: none !important; 
        animation: none !important; 
        transition-duration: 0s !important; 
        animation-duration: 0s !important; 
      }`
    });

    // PASSO 1: Acesso Inicial
    console.log('[1/5] Acessando gateway...');
    await page.goto('https://acesso-starck.com', { waitUntil: 'networkidle' });
    await saveArtifact(page, 'step1-gateway', 'png');

    // PASSO 2: Bypass Gateway
    console.log('[2/5] Iniciando fluxo de bypass...');
    
    // Botão #alert
    console.log('Tentando clicar em #alert...');
    await page.evaluate(() => {
      const el = document.querySelector('#alert');
      if (el) el.click();
    });
    // Fallback com force: true
    try {
      await page.locator('#alert').click({ force: true, timeout: 5000 });
    } catch (e) {
      console.log('#alert click fallback (may have already clicked):', e.message);
    }
    console.log('Botão "IR PARA O NOVO DOMÍNIO" processado.');

    // Botão "Próximo"
    console.log('Aguardando botão "Próximo"...');
    const proximoBtn = page.getByRole('button', { name: 'Próximo' });
    await proximoBtn.waitFor({ state: 'visible', timeout: 15000 });
    await saveArtifact(page, 'step2-modal-analise', 'png');
    
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.innerText.includes('Próximo'));
      if (btn) btn.click();
    });
    try {
      await proximoBtn.click({ force: true, timeout: 5000 });
    } catch (e) {
      console.log('"Próximo" click fallback:', e.message);
    }
    console.log('Botão "Próximo" processado.');

    // Botão "OK"
    console.log('Aguardando botão "OK"...');
    const okBtn = page.getByRole('button', { name: 'OK' });
    await okBtn.waitFor({ state: 'visible', timeout: 30000 });
    
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.innerText.includes('OK'));
      if (btn) btn.click();
    });
    try {
      await okBtn.click({ force: true, timeout: 5000 });
    } catch (e) {
      console.log('"OK" click fallback:', e.message);
    }
    console.log('Botão "OK" processado.');
    console.log('Fluxo de bypass concluído.');

    // PASSO 3: Navegação Catálogo
    await page.waitForLoadState('networkidle');
    const finalBaseUrl = new URL(page.url()).origin;
    const catalogUrl = `${finalBaseUrl}/catalog/all`;
    console.log(`[3/5] URL FINAL DETECTADA: ${finalBaseUrl}`);
    console.log(`Navegando para catálogo: ${catalogUrl}`);
    
    await page.goto(catalogUrl, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(5000); // Aguardar renderização JS
    await saveArtifact(page, 'step3-catalog-loaded', 'png');
    await saveArtifact(page, 'step3-catalog-html', 'html');

    // PASSO 4: Extração de Dados
    console.log('[4/5] Extraindo títulos...');
    const data = await page.evaluate(() => {
      const items = window.buttonLinks || [];
      const posters = window.imgBk || [];
      const domCards = document.querySelectorAll('.card-movie, .item-movie, [class*="card"]');
      return { 
        count: items.length, 
        titles: items.slice(0, 5).map(i => i.title),
        items,
        posters,
        domCount: domCards.length
      };
    });

    console.log(`Cards encontrados (window.buttonLinks): ${data.count}`);
    console.log(`Cards encontrados (DOM): ${data.domCount}`);
    
    if (data.count === 0 && data.domCount === 0) {
      console.error('ERRO: Nenhum título encontrado no catálogo.');
      await saveArtifact(page, 'error-empty-catalog', 'png');
      process.exit(1);
    }

    console.log('Primeiros 5 títulos encontrados:', data.titles);

    // PASSO 5: Inserção no Banco
    console.log('[5/5] Preparando dados para o Supabase...');
    const movieItems = data.items.map((item, i) => {
      const magnet = item.btnInfo?.[0]?.url || '';
      const magnetHash = magnet.match(/btih:([a-zA-Z0-9]+)/)?.[1]?.toLowerCase() || `slug-${generateSlug(item.title)}`;
      
      return {
        title: item.title,
        slug: generateSlug(item.title),
        external_id: magnetHash,
        poster: item.poster || '',
        backdrop: data.posters[i] || item.poster || '',
        magnet: magnet,
        rating: parseFloat(item.rating) || 8.0,
        year: parseInt(item.year) || 2024,
        type: (item.category === 'tv' || item.title.toLowerCase().includes('série')) ? 'series' : 'movie',
      };
    });

    console.log(`Total de títulos detectados: ${movieItems.length}`);
    console.log('Primeiros 5 títulos prontos para insert:', JSON.stringify(movieItems.slice(0, 5), null, 2));

    const BATCH_SIZE = 20;
    let imported = 0;
    let failed = 0;
    let ignored = 0;

    for (let i = 0; i < movieItems.length; i += BATCH_SIZE) {
      const batch = movieItems.slice(i, i + BATCH_SIZE);
      console.log(`\n--- Processando Batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} itens) ---`);
      console.log(`Enviando ${batch.length} registros para a tabela 'movies'...`);
      console.log(`Payload parcial (primeiro item do batch):`, JSON.stringify(batch[0], null, 2));

      try {
        const startTime = Date.now();
        
        // Timeout de 30 segundos para a operação do Supabase
        const { data: upsertData, error, status, statusText } = await Promise.race([
          supabase.from('movies').upsert(batch, { onConflict: 'external_id' }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT_SUPABASE')), 30000))
        ]);

        const endTime = Date.now();
        console.log(`Resposta do Supabase (HTTP ${status} ${statusText}) em ${endTime - startTime}ms`);

        if (error) {
          console.error('ERRO NO UPSERT DO SUPABASE:');
          console.error('Mensagem:', error.message);
          console.error('Detalhes:', error.details);
          console.error('Dica:', error.hint);
          console.error('Código:', error.code);
          console.error('Status HTTP:', status);
          console.error('Retorno completo:', JSON.stringify(error, null, 2));
          
          failed += batch.length;
          
          // Registrar falha no sync_logs
          await supabase.from('sync_logs').insert({
            status: 'batch_error',
            raw_error: `Batch ${i}-${i + BATCH_SIZE}: ${error.message}`,
            failed_at_step: 'upsert_movies',
            base_url: finalBaseUrl
          });
        } else {
          console.log(`Batch processado com sucesso.`);
          imported += batch.length;
        }
      } catch (e) {
        console.error(`EXCEÇÃO CRÍTICA NO BATCH:`, e.message);
        if (e.message === 'TIMEOUT_SUPABASE') {
          console.error('A operação do Supabase excedeu 30 segundos.');
        }
        failed += batch.length;
        
        await supabase.from('sync_logs').insert({
          status: 'exception',
          raw_error: `Exceção no Batch ${i}: ${e.message}`,
          failed_at_step: 'upsert_movies_catch',
          base_url: finalBaseUrl
        });
      }
    }

    console.log('\n--- RESUMO DA IMPORTAÇÃO ---');
    console.log(`Detectados: ${movieItems.length}`);
    console.log(`Inseridos/Atualizados: ${imported}`);
    console.log(`Falhas: ${failed}`);
    console.log(`Ignorados (estimado): ${movieItems.length - imported - failed}`);

    // Registrar log final de sucesso
    await supabase.from('sync_logs').insert({
      status: failed === 0 ? 'success' : 'partial_success',
      imported: imported,
      failed: failed,
      base_url: finalBaseUrl,
      finished_at: new Date().toISOString()
    });

    console.log(`Imported ${imported} movies`);
    process.exit(0);

  } catch (error) {
    console.error('FALHA NO CRAWLER:', error.message);
    await saveArtifact(page, 'critical-error', 'png');
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
