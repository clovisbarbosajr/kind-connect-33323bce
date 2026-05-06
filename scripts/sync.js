const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');

const TARGET_URL = 'https://www.starckfilmes-v11.com';
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
  console.log('--- INICIANDO SINCRONIZAÇÃO ---');
  
  // Criar log de início
  const { data: logEntry, error: logError } = await supabase
    .from('sync_logs')
    .insert({ status: 'running', started_at: new Date().toISOString() })
    .select()
    .single();

  if (logError) {
    console.error('Erro ao criar log:', logError.message);
  }

  const logId = logEntry?.id;

  let imported = 0;
  let updated = 0;
  let failed = 0;

  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  try {
    console.log(`Acessando ${TARGET_URL}...`);
    await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 90000 });
    
    // Aguardar o carregamento dos dados principais
    console.log('Aguardando renderização dos dados...');
    
    let catalogData = null;

    try {
      // Tentar esperar pela variável global buttonLinks
      await page.waitForFunction(() => 
        (window.buttonLinks && window.buttonLinks.length > 0) || 
        document.querySelector('.card-movie, .item-movie, .btn-download'), 
        { timeout: 30000 }
      );

      catalogData = await page.evaluate(() => {
        // Fallback: Tentar extrair do DOM se a variável não estiver exposta
        if (!window.buttonLinks || window.buttonLinks.length === 0) {
          console.log('Variável buttonLinks não encontrada. Extraindo via DOM...');
          const items = [];
          document.querySelectorAll('.card-movie, .item-movie').forEach(el => {
            const title = el.querySelector('.title, h2, h3')?.innerText;
            const poster = el.querySelector('img')?.src;
            const magnet = el.querySelector('a[href^="magnet:"]')?.href;
            if (title && magnet) {
              items.push({
                title,
                poster,
                btnInfo: [{ url: magnet }]
              });
            }
          });
          return { buttonLinks: items, imgBk: [] };
        }
        return {
          buttonLinks: window.buttonLinks,
          imgBk: window.imgBk || []
        };
      });
    } catch (e) {
      console.warn('Timeout aguardando buttonLinks. Tentando extração de emergência...');
      // Extração de emergência via scripts inline
      catalogData = await page.evaluate(() => {
        const scripts = Array.from(document.querySelectorAll('script')).map(s => s.innerText);
        const buttonLinksScript = scripts.find(s => s.includes('buttonLinks='));
        if (buttonLinksScript) {
          try {
            // Tentativa bruta de extrair o array usando regex
            const match = buttonLinksScript.match(/buttonLinks\s*=\s*(\[[\s\S]*?\]);/);
            if (match) return { buttonLinks: JSON.parse(match[1]), imgBk: window.imgBk || [] };
          } catch (err) {}
        }
        return null;
      });
    }

    if (!catalogData || !catalogData.buttonLinks || catalogData.buttonLinks.length === 0) {
      throw new Error('Não foi possível encontrar dados do catálogo no site alvo.');
    }

    console.log(`Encontrados ${catalogData.buttonLinks.length} itens.`);

    // Buscar IDs das categorias
    const { data: categories } = await supabase.from('categories').select('*');
    const catMap = categories.reduce((acc, cat) => ({ ...acc, [cat.slug]: cat.id }), {});

    for (let i = 0; i < catalogData.buttonLinks.length; i++) {
      const item = catalogData.buttonLinks[i];
      try {
        if (!item.title) continue;

        const slug = generateSlug(item.title);
        const btn = item.btnInfo?.[0] || {};
        const magnet = btn.url || '';
        
        // Extrair hash do magnet para evitar duplicidade
        const magnetHashMatch = magnet.match(/btih:([a-zA-Z0-9]+)/);
        const magnetHash = magnetHashMatch ? magnetHashMatch[1].toLowerCase() : `slug-${slug}`;
        
        const posterUrl = item.poster ? (item.poster.startsWith('http') ? item.poster : `${TARGET_URL}${item.poster}`) : '';
        const backdropUrl = catalogData.imgBk && catalogData.imgBk[i] ? (catalogData.imgBk[i].startsWith('http') ? catalogData.imgBk[i] : `${TARGET_URL}${catalogData.imgBk[i]}`) : posterUrl;

        const categorySlug = item.category === 'tv' ? 'series' : 'filmes';
        
        const contentData = {
          title: item.title,
          slug: slug,
          description: item.description || '',
          external_id: magnetHash,
          year: parseInt(item.year) || new Date().getFullYear(),
          rating: parseFloat(item.rating) || 0,
          type: item.category === 'tv' ? 'series' : 'movie',
          poster: posterUrl,
          backdrop: backdropUrl,
          audio_type: btn.audioType || 'Dual Áudio',
          resolution: btn.resolution || '1080p',
          size: btn.size || '',
          magnet: magnet,
          seasons: item.seasons || [],
          category_id: catMap[categorySlug],
          last_sync_at: new Date().toISOString()
        };

        const { error, status } = await supabase
          .from('movies')
          .upsert(contentData, { onConflict: 'external_id' });

        if (error) throw error;
        
        if (status === 201) imported++;
        else updated++;

        if (i % 10 === 0) console.log(`Processando... ${i}/${catalogData.buttonLinks.length}`);

      } catch (err) {
        console.error(`Erro ao processar ${item.title}:`, err.message);
        failed++;
      }
    }

    const duration = Math.round((Date.now() - startTime) / 1000);
    console.log(`--- SYNC FINALIZADO EM ${duration}s ---`);
    console.log(`Novos: ${imported} | Atualizados: ${updated} | Falhas: ${failed}`);

    // Atualizar log
    if (logId) {
      await supabase
        .from('sync_logs')
        .update({
          status: 'success',
          finished_at: new Date().toISOString(),
          imported,
          updated,
          failed,
          duration_seconds: duration
        })
        .eq('id', logId);
    }

  } catch (error) {
    console.error('ERRO FATAL NO SYNC:', error.message);
    if (logId) {
      await supabase
        .from('sync_logs')
        .update({
          status: 'error',
          finished_at: new Date().toISOString(),
          raw_error: error.message,
          failed: 1
        })
        .eq('id', logId);
    }
  } finally {
    await browser.close();
  }
}

run();