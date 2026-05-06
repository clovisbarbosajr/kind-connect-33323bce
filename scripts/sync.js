import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

// DOMÍNIO REAL ATUALIZADO
const TARGET_URL = 'https://acesso-starck.com/catalog/all'; 
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Erro: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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
  console.log('--- INICIANDO SINCRONIZAÇÃO (PLAYWRIGHT) ---');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  
  let logId = null;
  try {
    const { data: logEntry, error: logError } = await supabase
      .from('sync_logs')
      .insert({ status: 'running', started_at: new Date().toISOString() })
      .select()
      .single();
    
    if (logError) console.error('Erro ao criar log:', logError.message);
    logId = logEntry?.id;
  } catch (e) {
    console.error('Erro ao registrar início no Supabase:', e.message);
  }

  let imported = 0;
  let updated = 0;
  let failed = 0;

  console.log('Lançando navegador...');
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
  });
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();

  try {
    console.log(`[1/4] Acessando URL: ${TARGET_URL}`);
    const response = await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 90000 });
    console.log(`Status da resposta: ${response?.status()}`);
    
    if (response?.status() !== 200) {
      console.warn(`Aviso: Status HTTP ${response?.status()}. O site pode estar inacessível.`);
    }

    console.log('Aguardando renderização (10s)...');
    await page.waitForTimeout(10000); 

    console.log('[2/4] Extraindo dados...');
    
    // Tenta esperar pela variável buttonLinks
    try {
      await page.waitForFunction(() => window.buttonLinks && Array.isArray(window.buttonLinks), { timeout: 15000 });
      console.log('Variável buttonLinks encontrada!');
    } catch (e) {
      console.log('Variável buttonLinks não encontrada no tempo limite. Tentando extração alternativa...');
    }

    const catalogData = await page.evaluate(() => {
      const results = { items: [], bks: [], source: 'unknown' };
      
      // Prioridade 1: Variáveis globais
      if (window.buttonLinks && Array.isArray(window.buttonLinks) && window.buttonLinks.length > 0) {
        results.items = window.buttonLinks;
        results.bks = window.imgBk || [];
        results.source = 'window.buttonLinks';
        return results;
      }
      
      // Prioridade 2: Scraper DOM refinado
      const cards = document.querySelectorAll('.card-movie, .item-movie, .movie-card, [class*="card"], .v-card');
      results.source = `dom-scraper (${cards.length} cards)`;
      
      cards.forEach(card => {
        const titleEl = card.querySelector('h1, h2, h3, .title, .name, .v-card-title');
        const imgEl = card.querySelector('img');
        const linkEl = card.querySelector('a');
        
        if (titleEl && (imgEl || linkEl)) {
          results.items.push({
            title: titleEl.innerText.trim(),
            poster: imgEl?.src || imgEl?.getAttribute('data-src') || '',
            btnInfo: [{ url: linkEl?.href || '' }],
            category: 'movie' // default
          });
        }
      });
      
      return results;
    });

    console.log(`Fonte de dados: ${catalogData.source}`);
    console.log(`Itens extraídos: ${catalogData.items.length}`);

    if (catalogData.items.length === 0) {
      const htmlSnippet = await page.evaluate(() => document.body.innerHTML.substring(0, 1000));
      console.log('Snippet do HTML inicial:', htmlSnippet);
      throw new Error('Nenhum item encontrado. Estrutura do site mudou ou bloqueio ativo.');
    }

    console.log(`[3/4] Salvando ${catalogData.items.length} itens no Supabase...`);

    for (let i = 0; i < catalogData.items.length; i++) {
      const item = catalogData.items[i];
      if (!item.title) continue;

      try {
        const slug = generateSlug(item.title);
        const magnet = item.btnInfo?.[0]?.url || '';
        // Usar hash do magnet ou slug como fallback
        const magnetHash = magnet.match(/btih:([a-zA-Z0-9]+)/)?.[1]?.toLowerCase() || `slug-${slug}`;

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
          console.error(`Erro ao salvar "${item.title}":`, error.message);
          failed++;
        } else {
          if (status === 201) {
            imported++;
          } else {
            updated++;
          }
        }
      } catch (e) {
        console.error(`Erro no loop para "${item.title}":`, e.message);
        failed++;
      }
    }

    console.log(`[4/4] Finalizado! Novos: ${imported} | Atualizados: ${updated} | Falhas: ${failed}`);

    if (logId) {
      await supabase.from('sync_logs').update({
        status: 'success',
        finished_at: new Date().toISOString(),
        imported, 
        updated, 
        failed,
        duration_seconds: Math.round((Date.now() - startTime) / 1000)
      }).eq('id', logId);
    }

  } catch (error) {
    console.error('--- ERRO DETALHADO NO CRAWLER ---');
    console.error('Mensagem:', error.message);
    console.error('Stack:', error.stack);
    
    if (logId) {
      await supabase.from('sync_logs').update({
        status: 'error',
        finished_at: new Date().toISOString(),
        raw_error: `${error.message}\n${error.stack}`
      }).eq('id', logId);
    }
    process.exit(1);
  } finally {
    await browser.close();
    console.log('Navegador fechado.');
  }
}

run();