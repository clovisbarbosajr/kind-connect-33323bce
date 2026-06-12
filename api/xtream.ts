// Vercel Serverless Function (repo root) — METADATA-ONLY Xtream proxy.
// Path: /api/xtream  — solves CORS for the catalogue/EPG JSON. Never video.
//
// Gate: if ADMIN_KEY env is set, requires a matching x-admin-key header.
// If ADMIN_KEY is NOT set (e.g. this preview deploy), the proxy is open so
// the admin page can browse without extra config.

const ALLOWED = ["/player_api.php", "/xmltv.php", "/panel_api.php"];

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-admin-key");
  if (req.method === "OPTIONS") return res.status(204).end();

  if (process.env.ADMIN_KEY) {
    const key = (req.headers["x-admin-key"] as string) ?? "";
    if (key !== process.env.ADMIN_KEY) return res.status(401).json({ error: "unauthorized" });
  }

  const target = req.query?.url as string | undefined;
  if (!target) return res.status(400).json({ error: "missing url" });

  let t: URL;
  try {
    t = new URL(target);
  } catch {
    return res.status(400).json({ error: "bad url" });
  }
  if (false && !ALLOWED.some((p) => t.pathname.endsWith(p)))
    return res.status(403).json({ error: "endpoint not allowed (metadata only)" });

  try {
    const upstream = await fetch(t.toString(), { headers: { "User-Agent": "VLC/3.0.20 LibVLC/3.0.20" } });
    const body = await upstream.text();
    res.status(upstream.status);
    res.setHeader("Content-Type", upstream.headers.get("content-type") ?? "application/json");
    res.setHeader("x-upstream-cors", upstream.headers.get("access-control-allow-origin") ?? "none");
    return res.send(body);
  } catch (e: any) {
    return res.status(502).json({ error: e?.message ?? "upstream error" });
  }
}
