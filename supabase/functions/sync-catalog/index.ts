import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const BASE_URL = 'https://www.starckfilmes-v11.com'

function extractJSVariable(html: string, varName: string): any {
  const regex = new RegExp(`${varName}\\s*=\\s*(\\[[\\s\\S]*?\\]);?`, 'm')
  const match = html.match(regex)
  if (!match) return null

  try {
    // Tentar converter o formato JS solto para JSON válido
    let jsonStr = match[1]
      .replace(/([{,])\s*([a-zA-Z0-9_]+)\s*:/g, '$1"$2":') // aspas nas chaves
      .replace(/'/g, '"') // aspas simples para duplas
      .replace(/,(\s*[\]}])/g, '$1') // remover vírgulas extras no final de arrays/objetos
    
    return JSON.parse(jsonStr)
  } catch (e) {
    console.error(`Erro ao parsear ${varName}:`, e)
    // Fallback: Tentativa mais agressiva ou retornar null
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

    console.log(`Buscando HTML de: ${BASE_URL}`)
    const response = await fetch(BASE_URL)
    const html = await response.text()

    const buttonLinks = extractJSVariable(html, 'buttonLinks')
    const imgBk = extractJSVariable(html, 'imgBk')

    if (!buttonLinks) {
      throw new Error('Não foi possível encontrar ou parsear a variável buttonLinks no HTML')
    }

    let imported = 0
    let updated = 0
    let failed = 0

    for (let i = 0; i < buttonLinks.length; i++) {
      const item = buttonLinks[i]
      try {
        if (!item.title) continue

        const slug = generateSlug(item.title)
        
        // No site original, imgBk costuma mapear 1:1 com os itens ou ser um pool
        let backdrop = ''
        if (imgBk && imgBk[i]) {
          backdrop = imgBk[i].startsWith('http') ? imgBk[i] : `${BASE_URL}${imgBk[i]}`
        }

        const btn = item.btnInfo?.[0] || {}
        
        // Extrair hash do magnet para proteção anti-duplicidade
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

