import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    // Iniciar log
    const { data: logData, error: logError } = await supabase
      .from('sync_logs')
      .insert([{ status: 'running' }])
      .select()
      .single()

    if (logError) throw logError
    logId = logData.id

    // Configuração do alvo (exemplo mockado ou vindo de env se necessário)
    // O usuário não forneceu a URL exata, então usaremos uma placeholder ou tentaremos inferir se houver mais contexto
    const TARGET_URL = Deno.env.get('SYNC_TARGET_URL') || 'https://exemplo-de-filmes.com'
    
    console.log(`Iniciando sincronização de: ${TARGET_URL}`)

    const response = await fetch(TARGET_URL)
    const html = await response.text()

    // Regex para extrair buttonLinks
    // Exemplo: var buttonLinks = [...];
    const buttonLinksMatch = html.match(/var\s+buttonLinks\s*=\s*(\[[\s\S]*?\]);/)
    const imgBkMatch = html.match(/var\s+imgBk\s*=\s*(\[[\s\S]*?\]);/)

    if (!buttonLinksMatch) {
      throw new Error('Não foi possível encontrar a variável buttonLinks no HTML')
    }

    const buttonLinks = JSON.parse(buttonLinksMatch[1])
    const imgBk = imgBkMatch ? JSON.parse(imgBkMatch[1]) : []

    let imported = 0
    let updated = 0
    let failed = 0

    for (const item of buttonLinks) {
      try {
        const slug = item.title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')
        
        // Mapear dados para o formato do nosso banco
        const contentData = {
          title: item.title,
          slug: slug,
          description: item.description || '',
          external_id: item.id || slug, // Usar slug como fallback de id externo
          year: parseInt(item.year) || new Date().getFullYear(),
          rating: parseFloat(item.rating) || 0,
          category: item.category === 'tv' ? 'series' : 'movie',
          poster: item.poster || '',
          backdrop: item.backdrop || (imgBk.length > 0 ? imgBk[0] : ''),
          audio_type: item.btnInfo?.[0]?.audioType || 'Dual Áudio',
          resolution: item.btnInfo?.[0]?.resolution || '1080p',
          size: item.btnInfo?.[0]?.size || '',
          magnet: item.btnInfo?.[0]?.url || '',
          seasons: item.seasons || [],
          last_sync_at: new Date().toISOString()
        }

        // Upsert no catálogo
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

    // Finalizar log com sucesso
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
        .update({
          status: 'error',
          finished_at: new Date().toISOString(),
          raw_error: error.message
        })
        .eq('id', logId)
    }

    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
