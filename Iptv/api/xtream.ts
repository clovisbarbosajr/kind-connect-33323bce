// Vercel Serverless Function — METADATA-ONLY proxy for the Xtream API.
// Path: /api/xtream  (use this instead of functions/ when deploying to Vercel)
//
// Same rule as the Cloudflare version: metadata endpoints only, never video.

const ALLOWED = ["/player_api.php", "/xmltv.php", "/panel_api.php"];

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(204).end();

  // Admin-only (the public page never browses the catalogue).
  const key = (req.headers["x-admin-key"] as string) ?? "";
  if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY)
    return res.status(401).json({ error: "unauthorized" });

  const target = req.query?.url as string | undefined;
  if (!target) return res.status(400).json({ error: "missing url" });

  let t: URL;
  try {
    t = new URL(target);
  } catch {
    return res.status(400).json({ error: "bad url" });
  }
  if (!ALLOWED.some((p) => t.pathname.endsWith(p)))
    return res.status(403).json({ error: "endpoint not allowed (metadata only)" });

  try {
    const upstream = await fetch(t.toString(), { headers: { "User-Agent": "IPTVSmarters/1.0" } });
    const body = await upstream.text();
    res.status(upstream.status);
    res.setHeader("Content-Type", upstream.headers.get("content-type") ?? "application/json");
    return res.send(body);
  } catch (e: any) {
    return res.status(502).json({ error: e?.message ?? "upstream error" });
  }
}
