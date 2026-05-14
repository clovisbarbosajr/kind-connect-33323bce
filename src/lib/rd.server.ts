// Real-Debrid server functions — run inside the Cloudflare Worker (never sent to the browser)
// The API key is intentionally server-side only; it does NOT appear in the client JS bundle.
import { createServerFn } from '@tanstack/react-start'

const RD_API = 'https://api.real-debrid.com/rest/1.0'

// Falls back to build-time constant if the runtime env var is not set.
// For Cloudflare Workers: set RD_API_KEY as a Worker secret in the Cloudflare Dashboard.
const RD_KEY = (typeof process !== 'undefined' && process.env?.RD_API_KEY)
  ? process.env.RD_API_KEY
  : 'F3BSVQIQ7DPGIKR7GV5WBOJQ2AVUEBMGMCTGKEZTYA2RRZTMQTSQ'

// ─── helpers ────────────────────────────────────────────────────────────────

async function rdFetch(path: string, init: RequestInit = {}) {
  const res = await fetch(`${RD_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${RD_KEY}`,
      ...init.headers,
    },
  })
  const text = await res.text()
  try { return JSON.parse(text) } catch { return { _raw: text } }
}

async function unrestrict(link: string): Promise<string> {
  const data = await rdFetch('/unrestrict/link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `link=${encodeURIComponent(link)}`,
  })
  if (!data.download) throw new Error('unrestrict failed: ' + JSON.stringify(data))
  return data.download as string
}

const ERROR_STATUSES = new Set(['error', 'magnet_error', 'virus', 'dead'])

// ─── rdStart ────────────────────────────────────────────────────────────────
// Adds the magnet to RD, selects files, waits 1.5 s and returns:
//   { status:'ready', url, id }         – cached torrent → immediate stream URL
//   { status:'downloading'|…, id, progress, seeders } – still downloading
//   { status:'error', message }         – something went wrong

export type RdStartResult =
  | { status: 'ready';       url: string;  id: string }
  | { status: 'downloading' | 'queued' | 'waiting' | 'other'; id: string; progress: number; seeders: number }
  | { status: 'error';       message: string }

export const rdStart = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => d as { magnet: string })
  .handler(async ({ data }): Promise<RdStartResult> => {
    const { magnet } = data
    try {
      // 1 – add magnet
      const added = await rdFetch('/torrents/addMagnet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `magnet=${encodeURIComponent(magnet)}`,
      })
      if (!added.id) return { status: 'error', message: 'addMagnet: ' + JSON.stringify(added) }

      const id: string = added.id

      // 2 – select all files
      await rdFetch(`/torrents/selectFiles/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'files=all',
      })

      // 3 – small wait then check status (most YTS films are already cached → instant)
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
              : info.status.includes('waiting')? 'waiting'
              : 'other',
        id,
        progress: info.progress ?? 0,
        seeders:  info.seeders  ?? 0,
      }
    } catch (e: any) {
      return { status: 'error', message: e?.message ?? 'Erro desconhecido' }
    }
  })

// ─── rdStatus ───────────────────────────────────────────────────────────────
// Poll a torrent that was previously added; returns same shape as rdStart.

export type RdStatusResult =
  | { status: 'ready';       url: string }
  | { status: 'downloading' | 'queued' | 'waiting' | 'other'; progress: number; seeders: number }
  | { status: 'error';       message: string }

export const rdStatus = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => d as { id: string })
  .handler(async ({ data }): Promise<RdStatusResult> => {
    const { id } = data
    try {
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
              : info.status.includes('waiting')? 'waiting'
              : 'other',
        progress: info.progress ?? 0,
        seeders:  info.seeders  ?? 0,
      }
    } catch (e: any) {
      return { status: 'error', message: e?.message ?? 'Erro desconhecido' }
    }
  })
