// Cloudflare Pages Function — METADATA-ONLY proxy for the Xtream API.
// Path: /api/xtream  (deployed automatically by Cloudflare Pages)
//
// This solves CORS for the small JSON catalog/EPG. It REFUSES to proxy
// anything other than the metadata endpoints, so it can never be turned
// into a video proxy — video always streams provider -> browser directly.

const ALLOWED = ["/player_api.php", "/xmltv.php", "/panel_api.php"];

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const onRequest = async (ctx: { request: Request }): Promise<Response> => {
  const { request } = ctx;
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  const reqUrl = new URL(request.url);
  const target = reqUrl.searchParams.get("url");
  if (!target) return json({ error: "missing url" }, 400);

  let t: URL;
  try {
    t = new URL(target);
  } catch {
    return json({ error: "bad url" }, 400);
  }
  if (!ALLOWED.some((p) => t.pathname.endsWith(p)))
    return json({ error: "endpoint not allowed (metadata only)" }, 403);

  try {
    const upstream = await fetch(t.toString(), { headers: { "User-Agent": "IPTVSmarters/1.0" } });
    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: { ...CORS, "Content-Type": upstream.headers.get("content-type") ?? "application/json" },
    });
  } catch (e: any) {
    return json({ error: e?.message ?? "upstream error" }, 502);
  }
};

function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}
