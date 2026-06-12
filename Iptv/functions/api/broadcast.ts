// Cloudflare Pages Function — shared "now playing" broadcast state.
// Path: /api/broadcast
//
// GET  -> public: returns the channel the admin is currently broadcasting.
// POST -> admin only (x-admin-key must match ADMIN_KEY env): sets/clears it.
//
// Requires a KV namespace bound as IPTV_KV and an ADMIN_KEY env var.
// This stores a tiny JSON record — never video.

interface Env {
  IPTV_KV: KVNamespace;
  ADMIN_KEY?: string;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-admin-key",
};

export const onRequest = async (ctx: { request: Request; env: Env }): Promise<Response> => {
  const { request, env } = ctx;
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  if (request.method === "GET") {
    const raw = await env.IPTV_KV.get("now_playing");
    return json({ now_playing: raw ? JSON.parse(raw) : null });
  }

  if (request.method === "POST") {
    const key = request.headers.get("x-admin-key") ?? "";
    if (!env.ADMIN_KEY || key !== env.ADMIN_KEY) return json({ error: "unauthorized" }, 401);
    const body = (await request.json().catch(() => ({}))) as { now_playing?: unknown };
    if (body.now_playing == null) await env.IPTV_KV.delete("now_playing");
    else await env.IPTV_KV.put("now_playing", JSON.stringify(body.now_playing));
    return json({ ok: true });
  }

  return json({ error: "method not allowed" }, 405);
};

function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}
