// Supabase Edge Function — runs on Deno Deploy (AWS), NOT on Cloudflare.
// This is the ONLY part of the RD flow that needs a non-CF IP:
// Real-Debrid blocks addMagnet calls from Cloudflare Workers IPs.
// All other RD calls (status, unrestrict) work fine from CF Workers.

const RD_API = 'https://api.real-debrid.com/rest/1.0'
const RD_KEY = 'F3BSVQIQ7DPGIKR7GV5WBOJQ2AVUEBMGMCTGKEZTYA2RRZTMQTSQ'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS })
  }

  try {
    const { hash, dn } = await req.json() as { hash?: string; dn?: string }
    if (!hash) {
      return new Response(JSON.stringify({ error: 'missing hash' }), { status: 400, headers: CORS })
    }

    const magnet = `magnet:?xt=urn:btih:${hash}&dn=${encodeURIComponent(dn ?? 'film')}`

    const res = await fetch(`${RD_API}/torrents/addMagnet`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RD_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `magnet=${encodeURIComponent(magnet)}`,
    })

    const data = await res.json()
    return new Response(JSON.stringify(data), { headers: CORS })
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e?.message ?? 'server error' }),
      { status: 500, headers: CORS },
    )
  }
})
