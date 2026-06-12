// Shared "now playing" state — what the admin is broadcasting right now.
//
// This is NOT video. It's a tiny JSON record ({ title, url, ... }) saved
// server-side (Cloudflare KV) so every public viewer plays the same channel
// the admin selected. The video itself still streams provider -> browser.

export type NowPlaying = {
  url: string;
  title: string;
  live: boolean;
  poster?: string;
  ts: number;
} | null;

const ADMIN_KEY = "iptv.adminKey";

export const adminKey = {
  get: () => {
    try {
      return sessionStorage.getItem(ADMIN_KEY) ?? "";
    } catch {
      return "";
    }
  },
  set: (k: string) => {
    try {
      sessionStorage.setItem(ADMIN_KEY, k);
    } catch {
      /* ignore */
    }
  },
  clear: () => {
    try {
      sessionStorage.removeItem(ADMIN_KEY);
    } catch {
      /* ignore */
    }
  },
};

export async function getNowPlaying(): Promise<NowPlaying> {
  const res = await fetch("/api/broadcast", { cache: "no-store" });
  if (!res.ok) return null;
  const d = await res.json().catch(() => null);
  return (d?.now_playing as NowPlaying) ?? null;
}

// Returns true on success, false if the admin key was rejected.
export async function setNowPlaying(np: NowPlaying): Promise<boolean> {
  const res = await fetch("/api/broadcast", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-admin-key": adminKey.get() },
    body: JSON.stringify({ now_playing: np }),
  });
  return res.ok;
}
