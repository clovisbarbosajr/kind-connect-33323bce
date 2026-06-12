// Shared "now playing" state via Supabase REST (works on a static site like
// GitHub Pages — the browser talks straight to Supabase over HTTPS).
//
// This is NOT video. It's a tiny JSON record ({ title, url, ... }) so every
// public viewer plays the same channel the admin selected.

import { SUPABASE_URL, SUPABASE_ANON } from "./config";

export type NowPlaying = {
  url: string;
  title: string;
  live: boolean;
  poster?: string;
  ts: number;
} | null;

const ROW = `${SUPABASE_URL}/rest/v1/iptv_now_playing?id=eq.1`;
const headers = {
  apikey: SUPABASE_ANON,
  Authorization: `Bearer ${SUPABASE_ANON}`,
  "Content-Type": "application/json",
};

export async function getNowPlaying(): Promise<NowPlaying> {
  const res = await fetch(`${ROW}&select=data`, { headers, cache: "no-store" });
  if (!res.ok) return null;
  const rows = (await res.json().catch(() => [])) as Array<{ data: NowPlaying }>;
  return rows[0]?.data ?? null;
}

export async function setNowPlaying(np: NowPlaying): Promise<boolean> {
  const res = await fetch(ROW, {
    method: "PATCH",
    headers: { ...headers, Prefer: "return=minimal" },
    body: JSON.stringify({ data: np, updated_at: new Date().toISOString() }),
  });
  return res.ok;
}
