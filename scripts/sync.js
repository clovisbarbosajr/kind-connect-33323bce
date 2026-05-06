const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');

// NOVO DOMÍNIO REAL DO CATÁLOGO
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
  console.log('--- INICIANDO SINCRONIZAÇÃO (NOVO DOMÍNIO: acesso-starck.com) ---');
  
  const { data: logEntry, error: logError } = await supabase
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
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();

  try {
    console.log(`Acessando ${TARGET_URL}...`);
    // O site pode ter um splash screen ou loader, então esperamos o carregamento completo
    await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 90000 });
    
    // Pequena pausa para garantir que os scripts executem
    await page.waitForTimeout(5000);

    console.log('Aguardando variáveis buttonLinks ou estrutura do DOM...');
    
    const catalogData = await page.evaluate(() => {
      // Prioridade 1: Variáveis globais
      if (window.buttonLinks && window.buttonLinks.length > 0) {
        return { 
          buttonLinks: window.buttonLinks, 
          imgBk: window.imgBk || [] 
        };
      }
      
      // Prioridade 2: Extração via DOM
      const items = [];
      const cards = document.querySelectorAll('.card-movie, .item-movie, .movie-card, [class*="card"]');
      
      cards.forEach((card, index) => {
        const titleEl = card.querySelector('h1, h2, h3, .title, .name');
        const imgEl = card.querySelector('img');
        const linkEl = card.querySelector('a');
        
        if (titleEl && imgEl) {
          items.push({
            title: titleEl.innerText.trim(),
            poster: imgEl.src || imgEl.getAttribute('data-src'),
            category: card.innerText.toLowerCase().includes('série') ? 'tv' : 'movie',
            // O magnet link pode estar num atributo data ou no href de um botão interno
            btnInfo: [{ url: linkEl?.href || '' }]
          });
        }
      });
      
      return { buttonLinks: items, imgBk: [] };
    });

    if (!catalogData || !catalogData.buttonLinks || catalogData.buttonLinks.length === 0) {
      // Tentativa final: Procurar qualquer JSON no código fonte que pareça o catálogo
      const content = await page.content();
      const match = content.match(/buttonLinks\s*=\s*(\[[\s\S]*?\]);/);
      if (match) {
        try {
          const parsed = JSON.parse(match[1]);
          console.log('Catálogo encontrado via Regex no Script!');
          processCatalog(parsed, []);
        } catch(e) {}
      }
      throw new Error('Nenhum dado de catálogo encontrado no novo domínio.');
    }

    console.log(`Dados capturados! Processando ${catalogData.buttonLinks.length} itens.`);

    // Buscar categorias
    const { data: dbCats } = await supabase.from('categories').select('*');
    const catMap = dbCats?.reduce((acc, c) => ({ ...acc, [c.slug]: c.id }), {}) || {};

    for (let i = 0; i < catalogData.buttonLinks.length; i++) {
      const item = catalogData.buttonLinks[i];
      try {
        if (!item.title) continue;

        const slug = generateSlug(item.title);
        const btn = item.btnInfo?.[0] || {};
        const magnet = btn.url || '';
        
        // Se não tiver magnet agora, vamos tentar entrar na página individual (opcional para v2)
        // Por agora, usaremos o slug como fallback de ID se o magnet falhar
        const magnetHashMatch = magnet.match(/btih:([a-zA-Z0-9]+)/);
        const externalId = magnetHashMatch ? magnetHashMatch[1].toLowerCase() : `id-${slug}`;
        
        const posterUrl = item.poster || '';
        const backdropUrl = catalogData.imgBk?.[i] || posterUrl;

        const contentData = {
          title: item.title,
          slug: slug,
          description: item.description || '',
          external_id: externalId,
          year: parseInt(item.year) || 2024,
          rating: parseFloat(item.rating) || 8.5,
          type: (item.category === 'tv' || item.title.toLowerCase().includes('série')) ? 'series' : 'movie',
          poster: posterUrl,
          backdrop: backdropUrl,
          audio_type: btn.audioType || 'Dual Áudio',
          resolution: btn.resolution || '1080p',
          size: btn.size || '',
          magnet: magnet,
          category_id: catMap[item.category === 'tv' ? 'series' : 'filmes'],
          last_sync_at: new Date().toISOString()
        };

        const { error, status } = await supabase
          .from('movies')
          .upsert(contentData, { onConflict: 'external_id' });

        if (error) console.error(`Erro no banco para ${item.title}:`, error.message);
        else if (status === 201) imported++;
        else updated++;

      } catch (err) {
        failed++;
      }
    }

    const duration = Math.round((Date.now() - startTime) / 1000);
    console.log(`Sync finalizado! Importados: ${imported}, Atualizados: ${updated}, Falhas: ${failed}`);

    if (logId) {
      await supabase.from('sync_logs').update({
        status: 'success',
        finished_at: new Date().toISOString(),
        imported, updated, failed,
        duration_seconds: duration
      }).eq('id', logId);
    }

  } catch (error) {
    console.error('ERRO:', error.message);
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