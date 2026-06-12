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
};

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
  const u = new URL(`${p.host.replace(/\/+$/, "")}/player_api.php`);
  u.searchParams.set("username", p.username);
  u.searchParams.set("password", p.password);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  return `/api/xtream?url=${encodeURIComponent(u.toString())}`;
}

async function call<T>(p: Provider, params: Record<string, string>): Promise<T> {
  const res = await fetch(endpoint(p, params));
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

// ---- DIRECT stream URLs (provider -> browser, never proxied) ----
const clean = (p: Provider) => p.host.replace(/\/+$/, "");

export const liveUrl = (p: Provider, streamId: number, ext = "m3u8") =>
  `${clean(p)}/live/${p.username}/${p.password}/${streamId}.${ext}`;

export const movieUrl = (p: Provider, streamId: number, ext: string) =>
  `${clean(p)}/movie/${p.username}/${p.password}/${streamId}.${ext}`;

export const seriesEpisodeUrl = (p: Provider, episodeId: string | number, ext: string) =>
  `${clean(p)}/series/${p.username}/${p.password}/${episodeId}.${ext}`;

// EPG titles/descriptions come base64-encoded.
export const decodeB64 = (s?: string): string => {
  if (!s) return "";
  try {
    return decodeURIComponent(escape(atob(s)));
  } catch {
    return s;
  }
};
