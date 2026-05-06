const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');

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
  
  const { data: logEntry } = await supabase
    .from('sync_logs')
    .insert({ status: 'running', started_at: new Date().toISOString() })
    .select()
    .single();

  const logId = logEntry?.id;
  let imported = 0;
  let updated = 0;
  let failed = 0;

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
    await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 60000 });
    
    // Bypass splash/loading do site
    await page.waitForTimeout(8000); 

    console.log('[2/4] Extraindo dados via Injeção de Script...');
    
    const catalogData = await page.evaluate(() => {
      // Tentar variável global buttonLinks
      if (window.buttonLinks && window.buttonLinks.length > 0) {
        return { items: window.buttonLinks, bks: window.imgBk || [] };
      }
      
      // Fallback: DOM Scraper
      const scraped = [];
      const cards = document.querySelectorAll('.card-movie, .item-movie, .movie-card, [class*="card"]');
      cards.forEach(card => {
        const title = card.querySelector('h1, h2, h3, .title, .name')?.innerText;
        const poster = card.querySelector('img')?.src || card.querySelector('img')?.getAttribute('data-src');
        const link = card.querySelector('a')?.href;
        if (title && poster) {
          scraped.push({ title, poster, btnInfo: [{ url: link || '' }] });
        }
      });
      return { items: scraped, bks: [] };
    });

    if (!catalogData.items || catalogData.items.length === 0) {
      throw new Error('Bloqueio detectado ou estrutura do site mudou.');
    }

    console.log(`[3/4] Encontrados ${catalogData.items.length} itens. Salvando no Supabase...`);

    for (let i = 0; i < catalogData.items.length; i++) {
      const item = catalogData.items[i];
      try {
        const slug = generateSlug(item.title);
        const magnet = item.btnInfo?.[0]?.url || '';
        const magnetHash = magnet.match(/btih:([a-zA-Z0-9]+)/)?.[1]?.toLowerCase() || `id-${slug}`;

        const { error, status } = await supabase.from('movies').upsert({
          title: item.title,
          slug: slug,
          external_id: magnetHash,
          poster: item.poster || '',
          backdrop: catalogData.bks[i] || item.poster || '',
          magnet: magnet,
          rating: parseFloat(item.rating) || 8.0,
          year: parseInt(item.year) || 2024,
          type: item.category === 'tv' ? 'series' : 'movie',
          last_sync_at: new Date().toISOString()
        }, { onConflict: 'external_id' });

        if (!error) {
          if (status === 201) imported++;
          else updated++;
        }
      } catch (e) { failed++; }
    }

    console.log(`[4/4] Concluído! Novos: ${imported} | Atualizados: ${updated}`);

    if (logId) {
      await supabase.from('sync_logs').update({
        status: 'success',
        finished_at: new Date().toISOString(),
        imported, updated, failed,
        duration_seconds: Math.round((Date.now() - startTime) / 1000)
      }).eq('id', logId);
    }

  } catch (error) {
    console.error('FALHA NO CRAWLER:', error.message);
    if (logId) {
      await supabase.from('sync_logs').update({
        status: 'error',
        finished_at: new Date().toISOString(),
        raw_error: error.message
      }).eq('id', logId);
    }
  } finally {
    await browser.close();
  }
}

run();