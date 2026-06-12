// Xtream Codes client.
//
// METADATA (categories/channels/EPG — small JSON) goes through /api/xtream,
// a tiny CORS-only passthrough, because most providers don't send CORS headers.
//
// VIDEO never touches our infra: stream URLs are built here and played
// DIRECTLY from the provider to the user's device. See *Url() helpers below.

export type Provider = {
  id: string;
  name: string;
  host: string; // http://host:port (no trailing slash)
  username: string;
  password: string;
  direct?: boolean; // talk straight to the provider over HTTPS (no proxy)
};

// The provider is HTTP-only. An HTTPS page can't read HTTP directly (browser
// "mixed content" rule), so in direct mode we route through a public HTTPS
// CORS proxy that fetches the HTTP provider for us.
const CORS_PROXY = "https://corsproxy.io/?url=";
const proxied = (url: string) => `${CORS_PROXY}${encodeURIComponent(url)}`;

function base(p: Provider): string {
  let h = p.host.trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(h)) h = "http://" + h;
  return h;
}

export type Category = { category_id: string; category_name: string };

export type LiveStream = {
  stream_id: number;
  name: string;
  stream_icon: string;
  epg_channel_id: string;
  category_id: string;
  num: number;
};

export type VodStream = {
  stream_id: number;
  name: string;
  stream_icon: string;
  cover?: string;
  container_extension: string;
  category_id: string;
  rating?: string;
};

export type Series = {
  series_id: number;
  name: string;
  cover: string;
  category_id: string;
  plot?: string;
  rating?: string;
};

export type EpgEntry = {
  title: string;
  description: string;
  start: string;
  end: string;
  start_timestamp: string;
  stop_timestamp: string;
};

function endpoint(p: Provider, params: Record<string, string>): string {
  const u = new URL(`${base(p)}/player_api.php`);
  u.searchParams.set("username", p.username);
  u.searchParams.set("password", p.password);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  // Direct: route the HTTP provider through the HTTPS CORS proxy. Otherwise our own proxy.
  if (p.direct) return proxied(u.toString());
  return `/api/xtream?url=${encodeURIComponent(u.toString())}`;
}

async function call<T>(p: Provider, params: Record<string, string>): Promise<T> {
  let key = "";
  try {
    key = sessionStorage.getItem("iptv.adminKey") ?? "";
  } catch {
    /* ignore */
  }
  const res = await fetch(endpoint(p, params), { headers: p.direct ? {} : { "x-admin-key": key } });
  if (res.status === 401) throw new Error("UNAUTHORIZED");
  if (!res.ok) throw new Error(`Xtream HTTP ${res.status}`);
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Resposta inválida do provedor");
  }
}

export const xtream = {
  auth: (p: Provider) => call<any>(p, {}),

  liveCategories: (p: Provider) => call<Category[]>(p, { action: "get_live_categories" }),
  liveStreams: (p: Provider, categoryId?: string) =>
    call<LiveStream[]>(p, { action: "get_live_streams", ...(categoryId ? { category_id: categoryId } : {}) }),

  vodCategories: (p: Provider) => call<Category[]>(p, { action: "get_vod_categories" }),
  vodStreams: (p: Provider, categoryId?: string) =>
    call<VodStream[]>(p, { action: "get_vod_streams", ...(categoryId ? { category_id: categoryId } : {}) }),

  seriesCategories: (p: Provider) => call<Category[]>(p, { action: "get_series_categories" }),
  series: (p: Provider, categoryId?: string) =>
    call<Series[]>(p, { action: "get_series", ...(categoryId ? { category_id: categoryId } : {}) }),
  seriesInfo: (p: Provider, seriesId: number) =>
    call<any>(p, { action: "get_series_info", series_id: String(seriesId) }),

  vodInfo: (p: Provider, vodId: number) =>
    call<any>(p, { action: "get_vod_info", vod_id: String(vodId) }),

  shortEpg: (p: Provider, streamId: number) =>
    call<{ epg_listings: EpgEntry[] }>(p, {
      action: "get_short_epg",
      stream_id: String(streamId),
      limit: "8",
    }),
};

// ---- Stream URLs (routed through the HTTPS proxy in direct mode) ----
export const liveUrl = (p: Provider, streamId: number, ext = "m3u8") => {
  const u = `${base(p)}/live/${p.username}/${p.password}/${streamId}.${ext}`;
  return p.direct ? proxied(u) : u;
};

export const movieUrl = (p: Provider, streamId: number, ext: string) => {
  const u = `${base(p)}/movie/${p.username}/${p.password}/${streamId}.${ext}`;
  return p.direct ? proxied(u) : u;
};

export const seriesEpisodeUrl = (p: Provider, episodeId: string | number, ext: string) => {
  const u = `${base(p)}/series/${p.username}/${p.password}/${episodeId}.${ext}`;
  return p.direct ? proxied(u) : u;
};

// EPG titles/descriptions come base64-encoded.
export const decodeB64 = (s?: string): string => {
  if (!s) return "";
  try {
    return decodeURIComponent(escape(atob(s)));
  } catch {
    return s;
  }
};
