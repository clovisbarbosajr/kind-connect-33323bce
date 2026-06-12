import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

// Dev-only middleware that mirrors the production /api/xtream proxy
// (metadata-only). Lets `npm run dev` work without Cloudflare/Vercel.
function xtreamDevProxy(): Plugin {
  const ALLOWED = ["/player_api.php", "/xmltv.php", "/panel_api.php"];
  return {
    name: "xtream-dev-proxy",
    configureServer(server) {
      server.middlewares.use("/api/xtream", async (req, res) => {
        try {
          const reqUrl = new URL(req.url ?? "", "http://localhost");
          const target = reqUrl.searchParams.get("url");
          if (!target) return send(res, 400, { error: "missing url" });
          const t = new URL(target);
          if (!ALLOWED.some((p) => t.pathname.endsWith(p)))
            return send(res, 403, { error: "endpoint not allowed (metadata only)" });
          const upstream = await fetch(t.toString(), {
            headers: { "User-Agent": "IPTVSmarters/1.0" },
          });
          const body = await upstream.text();
          res.statusCode = upstream.status;
          res.setHeader("content-type", upstream.headers.get("content-type") ?? "application/json");
          res.setHeader("access-control-allow-origin", "*");
          res.end(body);
        } catch (e: any) {
          send(res, 502, { error: e?.message ?? "upstream error" });
        }
      });
    },
  };
}

function send(res: any, status: number, obj: unknown) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.setHeader("access-control-allow-origin", "*");
  res.end(JSON.stringify(obj));
}

export default defineConfig({
  // Served under /worldcup on your domain. Change if you mount it elsewhere.
  base: "/worldcup/",
  plugins: [react(), xtreamDevProxy()],
});
