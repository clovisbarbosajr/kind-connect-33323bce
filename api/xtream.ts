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
  // DIAG: allow-all temporarily to test which CORS proxy can reach the provider.
  if (false && !ALLOWED.some((p) => t.pathname.endsWith(p)))
    return res.status(403).json({ error: "endpoint not allowed (metadata only)" });

  try {
    const ua = (req.headers["x-ua"] as string) || "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1";
    const upstream = await fetch(t.toString(), { headers: { "User-Agent": ua } });
    const body = await upstream.text();
    res.status(upstream.status);
    res.setHeader("Content-Type", upstream.headers.get("content-type") ?? "application/json");
    return res.send(body);
  } catch (e: any) {
    return res.status(502).json({ error: e?.message ?? "upstream error" });
  }
}
