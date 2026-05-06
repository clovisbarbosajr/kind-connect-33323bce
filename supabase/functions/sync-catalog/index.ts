import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TARGET_DOMAIN = 'acesso-starck.com'
const BASE_URL = `https://${TARGET_DOMAIN}`

function extractJSVariable(html: string, varName: string): any {
  // Regex flexível para capturar a variável mesmo que esteja minificada ou com espaços variados
  const regex = new RegExp(`${varName}\\s*=\\s*(\\[[\\s\\S]*?\\]);?(\\n|\\r|<|\\s|$)`, 'm')
  const match = html.match(regex)
  if (!match) return null

  try {
    let jsonStr = match[1]
      // Tentar converter o formato JS solto (sem aspas nas chaves) para JSON válido
      .replace(/([{,])\s*([a-zA-Z0-9_]+)\s*:/g, '$1"$2":') 
      .replace(/'/g, '"')
      .replace(/,(\s*[\]}])/g, '$1')
    
    return JSON.parse(jsonStr)
  } catch (e) {
    console.error(`Erro ao parsear ${varName}:`, e)
    return null
  }
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .trim()
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  let logId: string | null = null

  try {
    const { data: logData, error: logError } = await supabase
      .from('sync_logs')
      .insert([{ status: 'running' }])
      .select()
      .single()

    if (logError) throw logError
    logId = logData.id

    // URL real do catálogo conforme descoberto pela investigação
    const catalogUrl = `${BASE_URL}/catalog/all`
    console.log(`Buscando catálogo real em: ${catalogUrl}`)
    
    const response = await fetch(catalogUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Referer': BASE_URL
      }
    })
    
    if (!response.ok) {
      throw new Error(`Falha ao acessar ${catalogUrl}: ${response.status} ${response.statusText}`)
    }

    const html = await response.text()

    const buttonLinks = extractJSVariable(html, 'buttonLinks')
    const imgBk = extractJSVariable(html, 'imgBk')

    if (!buttonLinks || !Array.isArray(buttonLinks)) {
      console.log("HTML length:", html.length);
      console.log("HTML preview:", html.substring(0, 500));
      throw new Error('Não foi possível encontrar a variável buttonLinks no HTML do catálogo. O site pode estar usando proteção contra bots ou mudou a estrutura.')
    }

    let imported = 0
    let updated = 0
    let failed = 0

    for (let i = 0; i < buttonLinks.length; i++) {
      const item = buttonLinks[i]
      try {
        if (!item.title) continue

        const slug = generateSlug(item.title)
        
        let backdrop = ''
        if (imgBk && imgBk[i]) {
          backdrop = imgBk[i].startsWith('http') ? imgBk[i] : `${BASE_URL}${imgBk[i]}`
        }

        const btn = item.btnInfo?.[0] || {}
        const magnet = btn.url || ''
        const magnetHashMatch = magnet.match(/btih:([a-zA-Z0-9]+)/)
        const magnetHash = magnetHashMatch ? magnetHashMatch[1] : null

        const contentData = {
          title: item.title,
          slug: slug,
          description: item.description || '',
          external_id: magnetHash || slug, 
          year: parseInt(item.year) || new Date().getFullYear(),
          rating: parseFloat(item.rating) || 0,
          category: item.category === 'tv' ? 'series' : 'movie',
          poster: item.poster ? (item.poster.startsWith('http') ? item.poster : `${BASE_URL}${item.poster}`) : '',
          backdrop: backdrop,
          audio_type: btn.audioType || 'Dual Áudio',
          resolution: btn.resolution || '1080p',
          size: btn.size || '',
          magnet: magnet,
          seasons: item.seasons || [],
          last_sync_at: new Date().toISOString()
        }

        const { error: upsertError, status } = await supabase
          .from('catalog')
          .upsert(contentData, { onConflict: 'external_id' })

        if (upsertError) throw upsertError
        
        if (status === 201) imported++
        else updated++

      } catch (err) {
        console.error(`Erro ao processar item ${item.title}:`, err)
        failed++
      }
    }

    await supabase
      .from('sync_logs')
      .update({
        status: 'success',
        finished_at: new Date().toISOString(),
        imported,
        updated,
        failed
      })
      .eq('id', logId)

    return new Response(JSON.stringify({ message: 'Sincronização concluída', imported, updated, failed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Erro na sincronização:', error)
    if (logId) {
      await supabase
        .from('sync_logs')
        .update({ status: 'error', finished_at: new Date().toISOString(), raw_error: error.message })
        .eq('id', logId)
    }
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})


