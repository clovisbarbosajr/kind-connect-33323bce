// Real-Debrid proxy logic — used by server.ts to handle /api/rd requests.
// Runs directly in the Cloudflare Worker (no CSRF, no session needed).
//
// IMPORTANT: Real-Debrid blocks addMagnet from Cloudflare Worker IPs.
// To work around this, addMagnet is delegated to a Supabase Edge Function
// (runs on Deno Deploy / AWS, non-CF IP). All other RD calls work fine from CF.

const RD_API  = 'https://api.real-debrid.com/rest/1.0'
const RD_KEY  = 'F3BSVQIQ7DPGIKR7GV5WBOJQ2AVUEBMGMCTGKEZTYA2RRZTMQTSQ'
// Supabase Edge Function URL — handles addMagnet from a non-Cloudflare IP.
const RD_ADD_URL = 'https://ylveejhawvxwhvfubeeu.supabase.co/functions/v1/rd-add'
const RD_ADD_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlsdmVlamhhd3Z4d2h2ZnViZWV1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEwMDgzNSwiZXhwIjoyMDkzNjc2ODM1fQ.eI5Yr9iSLIy5Yik0fsMXvIq2WaaK7RTcAvIXVqtqQgM'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
}

const ERROR_STATUSES = new Set(['error', 'magnet_error', 'virus', 'dead'])

async function rdFetch(path: string, init: RequestInit = {}) {
  const res = await fetch(`${RD_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${RD_KEY}`,
      ...init.headers,
    },
  })
  return res.json() as Promise<Record<string, any>>
}

async function unrestrict(link: string): Promise<string> {
  const d = await rdFetch('/unrestrict/link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `link=${encodeURIComponent(link)}`,
  })
  if (!d.download) throw new Error('unrestrict failed: ' + JSON.stringify(d))
  return d.download as string
}

// addMagnet via Supabase Edge Function (Deno Deploy / AWS IP — not blocked by RD)
async function addMagnet(hash: string, dn: string): Promise<Record<string, any>> {
  const res = await fetch(RD_ADD_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RD_ADD_KEY}`,
    },
    body: JSON.stringify({ hash, dn }),
  })
  return res.json() as Promise<Record<string, any>>
}

async function handleStart(hash: string, dn: string) {
  // https:// links → unrestrict/link directly (works from CF)
  if (hash.startsWith('http')) {
    const d = await rdFetch('/unrestrict/link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `link=${encodeURIComponent(hash)}`,
    })
    if (d.download) return { status: 'ready', url: d.download, id: '' }
    return { status: 'error', message: 'unrestrict: ' + JSON.stringify(d) }
  }

  // magnet → delegate addMagnet to Supabase Edge Function (non-CF IP)
  const added = await addMagnet(hash, dn)
  if (!added.id) return { status: 'error', message: 'addMagnet: ' + JSON.stringify(added) }

  const id = added.id as string

  await rdFetch(`/torrents/selectFiles/${id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'files=all',
  })

  await new Promise(r => setTimeout(r, 1500))

  const info = await rdFetch(`/torrents/info/${id}`)
  if (ERROR_STATUSES.has(info.status))
    return { status: 'error', message: `RD: ${info.status}` }

  if (info.status === 'downloaded' && info.links?.length) {
    const url = await unrestrict(info.links[0])
    return { status: 'ready', url, id }
  }

  return {
    status: info.status === 'downloading' ? 'downloading'
          : info.status === 'queued'       ? 'queued'
          : (info.status as string).includes('waiting') ? 'waiting'
          : 'other',
    id,
    progress: (info.progress as number) ?? 0,
    seeders:  (info.seeders  as number) ?? 0,
  }
}

async function handleStatus(id: string) {
  const info = await rdFetch(`/torrents/info/${id}`)
  if (ERROR_STATUSES.has(info.status))
    return { status: 'error', message: `RD: ${info.status}` }

  if (info.status === 'downloaded' && info.links?.length) {
    const url = await unrestrict(info.links[0])
    return { status: 'ready', url }
  }

  return {
    status: info.status === 'downloading' ? 'downloading'
          : info.status === 'queued'       ? 'queued'
          : (info.status as string).includes('waiting') ? 'waiting'
          : 'other',
    progress: (info.progress as number) ?? 0,
    seeders:  (info.seeders  as number) ?? 0,
  }
}

export async function handleRdProxy(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS')
    return new Response(null, { status: 204, headers: CORS })

  try {
    const rawText = await request.text()
    const body = JSON.parse(rawText) as { action?: string; hash?: string; dn?: string; id?: string }
    const { action, id } = body
    const hash = body.hash ?? ''
    const dn   = body.dn ?? 'film'

    let result: Record<string, any>
    if (action === 'start' && hash)       result = await handleStart(hash, dn)
    else if (action === 'status' && id)   result = await handleStatus(id)
    else result = { status: 'error', message: 'invalid request' }

    return new Response(JSON.stringify(result), { headers: CORS })
  } catch (e: any) {
    return new Response(
      JSON.stringify({ status: 'error', message: e?.message ?? 'server error' }),
      { status: 500, headers: CORS },
    )
  }
}
