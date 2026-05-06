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
  console.log('Iniciando navegador...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log(`Acessando ${TARGET_URL}...`);
    // O site tem uma página de verificação de 5s, então aguardamos a transição
    await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 60000 });
    
    console.log('Aguardando window.buttonLinks...');
    // Esperamos até que as variáveis globais estejam presentes (pode demorar devido ao check inicial do site)
    await page.waitForFunction(() => typeof window.buttonLinks !== 'undefined' && Array.isArray(window.buttonLinks), { timeout: 30000 });

    const data = await page.evaluate(() => {
      return {
        buttonLinks: window.buttonLinks,
        imgBk: window.imgBk
      };
    });

    console.log(`Encontrados ${data.buttonLinks.length} itens.`);

    let imported = 0;
    let updated = 0;
    let failed = 0;

    for (let i = 0; i < data.buttonLinks.length; i++) {
      const item = data.buttonLinks[i];
      try {
        if (!item.title) continue;

        const slug = generateSlug(item.title);
        const btn = item.btnInfo?.[0] || {};
        const magnet = btn.url || '';
        
        // Extrair hash do magnet para evitar duplicidade
        const magnetHashMatch = magnet.match(/btih:([a-zA-Z0-9]+)/);
        const magnetHash = magnetHashMatch ? magnetHashMatch[1] : null;
        
        if (!magnetHash) {
            console.log(`Item sem magnet hash ignorado: ${item.title}`);
            continue;
        }

        const posterUrl = item.poster ? (item.poster.startsWith('http') ? item.poster : `https://www.starckfilmes-v11.com${item.poster}`) : '';
        const backdropUrl = data.imgBk && data.imgBk[i] ? (data.imgBk[i].startsWith('http') ? data.imgBk[i] : `https://www.starckfilmes-v11.com${data.imgBk[i]}`) : '';

        const contentData = {
          title: item.title,
          slug: slug,
          description: item.description || '',
          external_id: magnetHash,
          year: parseInt(item.year) || new Date().getFullYear(),
          rating: parseFloat(item.rating) || 0,
          category: item.category === 'tv' ? 'series' : 'movie',
          poster: posterUrl,
          backdrop: backdropUrl,
          audio_type: btn.audioType || 'Dual Áudio',
          resolution: btn.resolution || '1080p',
          size: btn.size || '',
          magnet: magnet,
          seasons: item.seasons || [],
          last_sync_at: new Date().toISOString()
        };

        const { error, status } = await supabase
          .from('catalog')
          .upsert(contentData, { onConflict: 'external_id' });

        if (error) throw error;
        
        if (status === 201) imported++;
        else updated++;

      } catch (err) {
        console.error(`Erro ao processar ${item.title}:`, err.message);
        failed++;
      }
    }

    console.log(`Sync finalizado: ${imported} novos, ${updated} atualizados, ${failed} falhas.`);

  } catch (error) {
    console.error('Erro durante o sync:', error);
  } finally {
    await browser.close();
  }
}

run();
