import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import fs from 'fs';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const INITIAL_FULL_SYNC = process.env.INITIAL_FULL_SYNC === 'true';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERRO: Variáveis de ambiente SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configuradas.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
  realtime: { transport: WebSocket }
});

function generateSlug(title) {
  return title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/--+/g, '-').trim();
}

async function closePopups(page) {
  try {
    // Tenta fechar modal do Telegram ou popups comuns
    await page.evaluate(() => {
      const selectors = [
        'button[aria-label="Close"]',
        '.modal-close',
        '.close-button',
        'button:has-text("X")',
        '.telegram-join-popup .close'
      ];
      selectors.forEach(s => {
        try {
          const el = document.querySelector(s);
          if (el) el.click();
        } catch (e) {}
      });
      // Remove overlays
      const overlays = document.querySelectorAll('.modal-backdrop, .overlay');
      overlays.forEach(o => o.remove());
    });
  } catch (e) {}
}

async function extractTitleData(page, url) {
  console.log(`[Discovery] Extraindo dados da URL: ${url}`);
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    await closePopups(page);
    await page.waitForTimeout(3000);

    const data = await page.evaluate(() => {
      // Esta lógica depende da estrutura real do site Starck
      // Usando window.buttonLinks que já vimos ser usado no catálogo
      const items = window.buttonLinks || [];
      const posters = window.imgBk || [];
      
      const titleElement = document.querySelector('h1');
      const synopsisElement = document.querySelector('.description, .synopsis, p');
      const imdbElement = document.querySelector('.imdb-rating, .rating');
      
      return {
        title: titleElement?.innerText?.trim(),
        synopsis: synopsisElement?.innerText?.trim(),
        imdb_rating: imdbElement?.innerText?.match(/[\d.]+/)?.[0],
        items: items,
        posters: posters
      };
    });

    if (!data.title) return null;

    const slug = generateSlug(data.title);
    const type = (url.includes('/series/') || data.title.toLowerCase().includes('série')) ? 'series' : 'movie';

    // Salvar Título Principal
    const { data: titleRecord, error: titleError } = await supabase.from('titles').upsert({
      external_id: `url-${slug}`,
      title: data.title,
      slug: slug,
      type: type,
      synopsis: data.synopsis,
      imdb_rating: parseFloat(data.imdb_rating) || 0,
      source_url: url,
      poster: data.posters?.[0] || '',
      backdrop: data.posters?.[1] || data.posters?.[0] || ''
    }, { onConflict: 'slug' }).select().single();

    if (titleError) throw titleError;

    // Salvar Torrent Options
    if (data.items && data.items.length > 0) {
      const torrents = data.items.map(item => {
        const magnet = item.btnInfo?.[0]?.url || '';
        return {
          title_id: titleRecord.id,
          magnet: magnet,
          quality: item.quality || 'HD',
          audio_type: item.audio || 'Dublado',
          language: 'PT-BR'
        };
      });

      const { error: torrentError } = await supabase.from('torrent_options').upsert(torrents, { onConflict: 'magnet' });
      if (torrentError) console.error(`[Discovery] Erro ao salvar torrents:`, torrentError.message);
      console.log(`[Discovery] ${torrents.length} torrents processados para: ${data.title}`);
      console.log(`[Discovery] ${torrents.length} torrents salvos para: ${data.title}`);
    }

    return titleRecord;
  } catch (e) {
    console.error(`[Discovery] Erro ao extrair dados de ${url}:`, e.message);
    return null;
  }
}

async function run() {
  console.log('--- INICIANDO CRAWLER BASEADO EM DISCOVERY ---');
  
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 1. Bypass inicial para pegar a URL base real
    console.log('[1] Realizando bypass do gateway...');
    await page.goto('https://acesso-starck.com', { waitUntil: 'networkidle' });
    
    // Simular o fluxo de bypass (simplificado aqui, reusando lógica anterior se necessário)
    await page.locator('#alert').click({ force: true }).catch(() => {});
    await page.getByRole('button', { name: 'Próximo' }).click({ force: true }).catch(() => {});
    await page.getByRole('button', { name: 'OK' }).click({ force: true }).catch(() => {});
    
    await page.waitForLoadState('networkidle');
    const baseUrl = new URL(page.url()).origin;
    console.log(`[2] URL Base detectada: ${baseUrl}`);

    const queue = new Set([baseUrl]);
    const visited = new Set();
    const titlesProcessed = new Set();
    
    // Início da descoberta
    while (queue.size > 0) {
      const currentUrl = Array.from(queue)[0];
      queue.delete(currentUrl);
      
      if (visited.has(currentUrl) || visited.size > 500) continue;
      visited.add(currentUrl);

      console.log(`\n--- Visitando: ${currentUrl} (Fila: ${queue.size}, Visitados: ${visited.size}) ---`);
      
      try {
        await page.goto(currentUrl, { waitUntil: 'networkidle', timeout: 30000 });
        await closePopups(page);
        
        // Extrair novos links
        const links = await page.evaluate((base) => {
          return Array.from(document.querySelectorAll('a'))
            .map(a => a.href)
            .filter(href => href.startsWith(base) && !href.includes('#'));
        }, baseUrl);

        for (const link of links) {
          if (!visited.has(link)) queue.add(link);
        }

        // Se for uma página de título (ex: /filme/ ou /serie/), extrair dados
        if (currentUrl.includes('/filme/') || currentUrl.includes('/serie/') || currentUrl.match(/\/catalog\/item\/\d+/)) {
          await extractTitleData(page, currentUrl);
        }

        // Se for uma página de listagem, tentar pegar links de itens
        const itemLinks = await page.evaluate(() => {
          // No Starck, os itens costumam estar em window.buttonLinks
          // mas também podem estar no DOM
          return Array.from(document.querySelectorAll('a'))
            .filter(a => a.href.includes('/filme/') || a.href.includes('/serie/') || a.href.includes('/catalog/item/'))
            .map(a => a.href);
        });

        for (const link of itemLinks) {
          if (!visited.has(link)) queue.add(link);
        }

      } catch (e) {
        console.error(`Erro ao processar ${currentUrl}:`, e.message);
      }
    }

    console.log('\n--- CRAWLER FINALIZADO ---');
    console.log(`Páginas visitadas: ${visited.size}`);
    process.exit(0);

  } catch (error) {
    console.error('ERRO CRÍTICO:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();