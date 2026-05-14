// Real-Debrid proxy logic — used by server.ts to handle /api/rd requests.
// Runs directly in the Cloudflare Worker (no CSRF, no session needed).

const RD_API = 'https://api.real-debrid.com/rest/1.0'
const RD_KEY = 'F3BSVQIQ7DPGIKR7GV5WBOJQ2AVUEBMGMCTGKEZTYA2RRZTMQTSQ'

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
    headers: { Authorization: `Bearer ${RD_KEY}`, ...init.headers },
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

async function handleStart(magnet: string) {
  // https:// links → try unrestrict/link directly (hoster support)
  if (magnet.startsWith('http')) {
    const d = await rdFetch('/unrestrict/link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `link=${encodeURIComponent(magnet)}`,
    })
    if (d.download) return { status: 'ready', url: d.download, id: '' }
    return { status: 'error', message: 'unrestrict: ' + JSON.stringify(d) }
  }

  // magnet: → add to RD, select files, check status
  const added = await rdFetch('/torrents/addMagnet', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `magnet=${encodeURIComponent(magnet)}`,
  })
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
    const body = await request.json() as { action?: string; magnet?: string; id?: string }
    const { action, magnet, id } = body

    let result: Record<string, any>
    if (action === 'start' && magnet)       result = await handleStart(magnet)
    else if (action === 'status' && id)     result = await handleStatus(id)
    else result = { status: 'error', message: 'invalid request' }

    return new Response(JSON.stringify(result), { headers: CORS })
  } catch (e: any) {
    return new Response(
      JSON.stringify({ status: 'error', message: e?.message ?? 'server error' }),
      { status: 500, headers: CORS },
    )
  }
}
