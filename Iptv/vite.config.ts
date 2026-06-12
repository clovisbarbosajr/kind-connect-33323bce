import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

// Dev-only middleware mirroring the production functions so `npm run dev`
// works without Cloudflare/Vercel. Admin key defaults to "admin" in dev.
function devApi(): Plugin {
  const ALLOWED = ["/player_api.php", "/xmltv.php", "/panel_api.php"];
  const DEV_ADMIN_KEY = process.env.ADMIN_KEY ?? "admin";
  let nowPlaying: unknown = null; // in-memory broadcast state for dev

  return {
    name: "iptv-dev-api",
    configureServer(server) {
      // ---- metadata proxy (admin-gated) ----
      server.middlewares.use("/api/xtream", async (req, res) => {
        try {
          if ((req.headers["x-admin-key"] ?? "") !== DEV_ADMIN_KEY)
            return send(res, 401, { error: "unauthorized" });
          const reqUrl = new URL(req.url ?? "", "http://localhost");
          const target = reqUrl.searchParams.get("url");
          if (!target) return send(res, 400, { error: "missing url" });
          const t = new URL(target);
          if (!ALLOWED.some((p) => t.pathname.endsWith(p)))
            return send(res, 403, { error: "endpoint not allowed (metadata only)" });
          const upstream = await fetch(t.toString(), { headers: { "User-Agent": "IPTVSmarters/1.0" } });
          const body = await upstream.text();
          res.statusCode = upstream.status;
          res.setHeader("content-type", upstream.headers.get("content-type") ?? "application/json");
          res.setHeader("access-control-allow-origin", "*");
          res.end(body);
        } catch (e: any) {
          send(res, 502, { error: e?.message ?? "upstream error" });
        }
      });

      // ---- broadcast state ----
      server.middlewares.use("/api/broadcast", async (req, res) => {
        if (req.method === "GET") return send(res, 200, { now_playing: nowPlaying });
        if (req.method === "POST") {
          if ((req.headers["x-admin-key"] ?? "") !== DEV_ADMIN_KEY)
            return send(res, 401, { error: "unauthorized" });
          let raw = "";
          for await (const c of req) raw += c;
          try {
            nowPlaying = JSON.parse(raw).now_playing ?? null;
          } catch {
            nowPlaying = null;
          }
          return send(res, 200, { ok: true });
        }
        send(res, 405, { error: "method not allowed" });
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
  plugins: [react(), devApi()],
  build: {
    rollupOptions: {
      // Two separate pages / bundles: public (index) and admin.
      input: {
        main: "index.html",
        admin: "admin.html",
      },
    },
  },
});
