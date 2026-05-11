import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Play, Star, Download, Info,
  Tv, ChevronDown, Youtube, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { NavBar } from "@/components/NavBar";
import { InwiseLogo } from "@/components/InwiseLogo";

// Webtor SDK — server-side BitTorrent streaming (works with regular TCP/UDP seeds)
// Uses webtor.io main domain via SDK, NOT the broken embed.webtor.io subdomain
const WEBTOR_SDK = 'https://cdn.jsdelivr.net/npm/@webtor/embed-sdk-js/dist/index.min.js';

const POPCORN_COLORS = ['#f8d878','#f0b820','#fce8a0','#e8a800','#fff0b0','#f4c840','#ffe060','#f0c030'];
const STAR_COLORS   = ['#ffd700','#ffe040','#ffb020','#ffc040','#ffe860','#ffda30'];

const OVERLAY_CSS = `
  @keyframes bg-breathe {
    0%,100% { transform: scale(1); }
    50% { transform: scale(1.025); }
  }
  @keyframes mario-bob {
    0%,100% { transform: translateY(0) rotate(0deg); }
    30% { transform: translateY(-6px) rotate(-1.5deg); }
    60% { transform: translateY(-3px) rotate(1deg); }
    80% { transform: translateY(-7px) rotate(-0.5deg); }
  }
  @keyframes mario-glow {
    0%,100% { opacity: 0.25; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(1.12); }
  }
  @keyframes luigi-shake {
    0%,100% { transform: rotate(0deg) translateX(0); }
    15% { transform: rotate(-4deg) translateX(-4px); }
    35% { transform: rotate(3deg) translateX(3px); }
    55% { transform: rotate(-3deg) translateX(-3px); }
    75% { transform: rotate(4deg) translateX(4px); }
    90% { transform: rotate(-2deg) translateX(-2px); }
  }
  @keyframes peach-pet {
    0%,100% { transform: rotate(0deg) translateY(0); }
    50% { transform: rotate(1.8deg) translateY(-4px); }
  }
  @keyframes pcorn0 { 0%{transform:translate(0,0) rotate(0deg);opacity:1} 100%{transform:translate(-12px,70px) rotate(340deg);opacity:0} }
  @keyframes pcorn1 { 0%{transform:translate(0,0) rotate(0deg);opacity:1} 100%{transform:translate(18px,60px) rotate(-200deg);opacity:0} }
  @keyframes pcorn2 { 0%{transform:translate(0,0) rotate(0deg);opacity:1} 100%{transform:translate(-6px,80px) rotate(280deg);opacity:0} }
  @keyframes pcorn3 { 0%{transform:translate(0,0) rotate(0deg);opacity:1} 100%{transform:translate(22px,55px) rotate(-320deg);opacity:0} }
  @keyframes star-float {
    0%,100% { transform: translateY(0) scale(1); opacity:0.85; }
    50% { transform: translateY(-18px) scale(1.25); opacity:1; }
  }
  @keyframes bar-fill {
    0%   { width: 3%; }
    40%  { width: 55%; }
    70%  { width: 74%; }
    88%  { width: 84%; }
    100% { width: 87%; }
  }
  @keyframes bar-shimmer {
    0%   { background-position: 0% 0%; }
    100% { background-position: 300% 0%; }
  }
  @keyframes title-pulse {
    0%,100% { opacity:1; text-shadow: 0 0 16px rgba(255,210,60,0.9), 2px 2px 0 #000; }
    50% { opacity:0.82; text-shadow: 0 0 28px rgba(255,210,60,1), 2px 2px 0 #000; }
  }
  @keyframes carr-blink {
    0%,49% { opacity:1; }
    50%,100% { opacity:0.45; }
  }
  @keyframes tap-bounce {
    0%,100% { transform: translateY(0) scale(1); }
    30%     { transform: translateY(-12px) scale(1.18); }
    60%     { transform: translateY(-5px) scale(1.06); }
  }
  @keyframes tap-ring {
    0%   { transform: scale(0.7); opacity: 0.9; }
    100% { transform: scale(2.2); opacity: 0; }
  }
  @keyframes tap-label {
    0%,100% { opacity:1; letter-spacing:0.22em; }
    50%     { opacity:0.6; letter-spacing:0.34em; }
  }
`;

function MarioOverlay({ title, dots, fading, statusText }: { title: string; dots: string; fading: boolean; statusText?: string }) {
  return (
    <div className="absolute inset-0 z-10 overflow-hidden"
      style={{ transition: 'opacity 0.6s', opacity: fading ? 0 : 1, pointerEvents: 'none' }}>

      <style>{OVERLAY_CSS}</style>

      {/* Background image (breathing) */}
      <div className="absolute inset-0" style={{ animation: 'bg-breathe 4s ease-in-out infinite', transformOrigin: 'center center' }}>
        <img src="/mario-bg.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: 'center top' }} />
      </div>

      {/* Dark gradient overlay */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.05) 55%, rgba(0,0,0,0.72) 82%, rgba(0,0,0,0.88) 100%)' }} />

      {/* Mario zone (center-left) — gentle bob + warm glow */}
      <div className="absolute" style={{ left: '32%', top: '12%', width: '19%', height: '72%', animation: 'mario-bob 1.6s ease-in-out infinite', transformOrigin: 'bottom center', zIndex: 2 }}>
        <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'radial-gradient(ellipse at 50% 60%, rgba(255,200,60,0.18) 0%, transparent 68%)', animation: 'mario-glow 1.6s ease-in-out infinite' }} />
      </div>

      {/* Luigi zone (right of center) — frantic shake */}
      <div className="absolute" style={{ left: '54%', top: '10%', width: '16%', height: '74%', animation: 'luigi-shake 0.45s ease-in-out infinite', transformOrigin: 'bottom center', zIndex: 2 }}>
        <div style={{ width: '100%', height: '100%', background: 'radial-gradient(ellipse at 50% 50%, rgba(80,200,80,0.14) 0%, transparent 68%)' }} />
      </div>

      {/* Popcorn particles from Luigi */}
      {POPCORN_COLORS.map((col, i) => (
        <div key={i} className="absolute" style={{
          left: `${58 + (i % 4) * 2.5}%`,
          top: `${36 + (i % 3) * 8}%`,
          width: i % 3 === 0 ? 10 : 7,
          height: i % 3 === 0 ? 10 : 7,
          borderRadius: i % 2 ? '40% 60% 60% 40%' : '50%',
          background: col,
          boxShadow: `0 0 3px rgba(0,0,0,0.4)`,
          animation: `pcorn${i % 4} ${0.75 + i * 0.13}s ease-in infinite`,
          animationDelay: `${i * 0.11}s`,
          zIndex: 2,
        }} />
      ))}

      {/* Peach/Yoshi zone (far right) — gentle sway */}
      <div className="absolute" style={{ left: '69%', top: '14%', width: '24%', height: '72%', animation: 'peach-pet 3.2s ease-in-out infinite', transformOrigin: 'bottom center', zIndex: 2 }}>
        <div style={{ width: '100%', height: '100%', background: 'radial-gradient(ellipse at 50% 55%, rgba(255,140,180,0.12) 0%, transparent 65%)' }} />
      </div>

      {/* Floating stars */}
      {STAR_COLORS.map((col, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: `${8 + i * 15}%`,
          top: `${14 + (i % 3) * 16}%`,
          animation: `star-float ${2.2 + i * 0.3}s ease-in-out infinite`,
          animationDelay: `${i * 0.38}s`,
          pointerEvents: 'none',
          zIndex: 2,
        }}>
          <svg width={14 + (i % 3) * 6} height={14 + (i % 3) * 6} viewBox="0 0 24 24" fill={col} stroke="rgba(0,0,0,0.25)" strokeWidth="0.8">
            <polygon points="12,2 15,9 22,9 16.5,14 18.5,21 12,17 5.5,21 7.5,14 2,9 9,9" />
          </svg>
        </div>
      ))}

      {/* ── Tap-to-start — center screen ── */}
      <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ zIndex: 5, pointerEvents: 'none' }}>
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          {/* Ripple ring */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            width: 90, height: 90, marginTop: -45, marginLeft: -45,
            borderRadius: '50%',
            border: '3px solid rgba(255,220,60,0.75)',
            animation: 'tap-ring 1.5s ease-out infinite',
          }} />
          {/* Hand */}
          <span style={{
            fontSize: 'clamp(44px, 7.5vw, 76px)',
            animation: 'tap-bounce 1.5s ease-in-out infinite',
            filter: 'drop-shadow(0 0 14px rgba(255,200,60,0.95))',
            lineHeight: 1,
          }}>👆</span>
          {/* Label */}
          <p style={{
            fontFamily: 'Impact, "Arial Black", monospace',
            fontWeight: 900,
            fontSize: 'clamp(12px, 2vw, 22px)',
            color: '#fbd000',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            textAlign: 'center',
            textShadow: '0 0 18px rgba(255,180,0,0.95), 2px 2px 0 #000',
            animation: 'tap-label 1.5s ease-in-out infinite',
            marginTop: 4,
          }}>TOQUE NA TELA PARA INICIAR</p>
        </div>
      </div>

      {/* Bottom HUD */}
      <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center gap-3 pb-6 px-6" style={{ zIndex: 4 }}>

        {/* Main phrase — hero text */}
        <p style={{
          fontFamily: 'Impact, "Arial Black", monospace',
          fontWeight: 900,
          fontSize: 'clamp(18px, 3.8vw, 48px)',
          color: '#fff',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          textAlign: 'center',
          textShadow: '0 0 24px rgba(255,200,60,0.8), 3px 3px 0 #000, -1px -1px 0 #000',
          animation: 'title-pulse 2s ease-in-out infinite',
          lineHeight: 1.1,
        }}>PEGUE SUA PIPOCA,<br/>SE AJEITE NO SOFÁ...</p>

        <p style={{
          fontFamily: 'Impact, "Arial Black", monospace',
          fontWeight: 900,
          fontSize: 'clamp(14px, 2.8vw, 36px)',
          color: '#fbd000',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          textAlign: 'center',
          textShadow: '0 0 18px rgba(255,180,0,0.9), 2px 2px 0 #000',
          animation: 'title-pulse 2s ease-in-out infinite',
          animationDelay: '1s',
        }}>...O FILME JÁ VAI COMEÇAR!!</p>

        {/* Loading bar */}
        <div style={{
          width: 'min(560px, 74%)', height: 18,
          background: '#180800', border: '3px solid #000',
          borderRadius: 3, overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            background: 'linear-gradient(90deg, #e52521 0%, #f4921a 25%, #fbd000 50%, #f4921a 75%, #e52521 100%)',
            backgroundSize: '300% 100%',
            animation: 'bar-fill 40s cubic-bezier(0.1,0.4,0.6,0.9) 1 forwards, bar-shimmer 2.5s linear infinite',
          }} />
        </div>

        <p style={{
          fontFamily: 'monospace', fontWeight: 700,
          fontSize: 'clamp(8px, 1vw, 11px)',
          color: 'rgba(255,255,255,0.6)', letterSpacing: '0.28em',
          textShadow: '1px 1px 0 #000',
          animation: 'carr-blink 1s step-start infinite',
        }}>🎬 CARREGANDO A DIVERSÃO{dots} 🎬</p>
      </div>
    </div>
  );
}

// ── WebTorrent native player (no ads, no terminal — overlay fades on canplay) ──
const WT_CDN = 'https://cdn.jsdelivr.net/npm/webtorrent@latest/webtorrent.min.js';
const WS_TRACKERS = [
  'wss://tracker.openwebtorrent.com',
  'wss://tracker.btorrent.xyz',
  'wss://tracker.fastcast.nz',
];
const VIDEO_EXTS = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.webm', '.m4v', '.ts'];

function StreamModalWT({ magnet, title, onClose }: { magnet: string; title: string; poster?: string; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const clientRef = useRef<any>(null);
  const [loadingVisible, setLoadingVisible] = useState(true);
  const [loadingFading, setLoadingFading] = useState(false);
  const [dots, setDots] = useState('');
  const [status, setStatus] = useState('Conectando aos peers...');

  // Register canplay listener immediately on mount (before WebTorrent sets src)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onCanPlay = () => {
      setLoadingFading(true);
      setTimeout(() => setLoadingVisible(false), 600);
    };
    video.addEventListener('canplay', onCanPlay, { once: true });
    return () => video.removeEventListener('canplay', onCanPlay);
  }, []);

  // Load WebTorrent and start streaming
  useEffect(() => {
    let cancelled = false;

    const loadScript = () => new Promise<void>((resolve) => {
      if ((window as any).WebTorrent) { resolve(); return; }
      const s = document.createElement('script');
      s.src = WT_CDN;
      s.onload = () => resolve();
      document.head.appendChild(s);
    });

    const run = async () => {
      await loadScript();
      if (cancelled) return;

      const WT = (window as any).WebTorrent;
      const client = new WT();
      clientRef.current = client;

      // Append WS trackers so browser peers can connect
      const extraTrackers = WS_TRACKERS.map(t => `&tr=${encodeURIComponent(t)}`).join('');
      const magnetWithTrackers = magnet + extraTrackers;

      client.on('error', (err: any) => {
        if (!cancelled) setStatus('Erro WebTorrent: ' + (err?.message || String(err)));
      });

      client.add(magnetWithTrackers, { announce: WS_TRACKERS }, (torrent: any) => {
        if (cancelled) return;
        setStatus('Torrent encontrado! Buscando vídeo...');

        const file = torrent.files
          .filter((f: any) => VIDEO_EXTS.some(ext => f.name.toLowerCase().endsWith(ext)))
          .sort((a: any, b: any) => b.length - a.length)[0];

        if (!file || !videoRef.current) {
          setStatus('Arquivo de vídeo não encontrado.');
          return;
        }

        setStatus('Iniciando fluxo de vídeo...');
        // renderTo sets src on the video element and triggers canplay when buffered enough
        file.renderTo(videoRef.current, { autoplay: true }, (err: any) => {
          if (err && !cancelled) setStatus('Erro ao carregar: ' + err.message);
        });

        torrent.on('download', () => {
          if (cancelled || !loadingVisible) return;
          const pct = Math.round(torrent.progress * 100);
          if (pct > 0) setStatus(`Baixando... ${pct}%`);
        });
      });
    };

    run();

    return () => {
      cancelled = true;
      if (clientRef.current) {
        try { clientRef.current.destroy(); } catch {}
        clientRef.current = null;
      }
    };
  }, [magnet]);

  // Animated dots for loading text
  useEffect(() => {
    if (!loadingVisible) return;
    const t = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 500);
    return () => clearInterval(t);
  }, [loadingVisible]);

  return (
    <div className="fixed inset-0 bg-black z-[999999] flex flex-col" style={{ isolation: 'isolate' }}>
      <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900/95 border-b border-zinc-800 flex-shrink-0">
        <p className="text-white text-sm font-bold truncate flex-1 mr-3">{title}</p>
        <button onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-red-900 text-white text-xs rounded transition flex-shrink-0">
          <X className="w-3 h-3" /> Fechar
        </button>
      </div>

      <div className="flex-1 w-full relative" style={{ minHeight: 0 }}>
        {/* Actual movie video — always in DOM so WebTorrent can attach */}
        <video
          ref={videoRef}
          controls
          autoPlay
          className="absolute inset-0 w-full h-full bg-black"
        />

        {/* Mario overlay — covers video until canplay fires */}
        {loadingVisible && (
          <MarioOverlay title={title} dots={dots} fading={loadingFading} statusText={status} />
        )}
      </div>
    </div>
  );
}

// ── Webtor.io player — Mario overlay stays until player.js ready event ──
function StreamModalWebtor({ magnet, title, poster, onClose }: { magnet: string; title: string; poster?: string; onClose: () => void }) {
  const containerId = useRef('wtor' + Date.now().toString(36)).current;
  const [loadingVisible, setLoadingVisible] = useState(true);
  const [loadingFading, setLoadingFading] = useState(false);
  const [dots, setDots] = useState('');
  const fadeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const id = containerId;

    const initPlayer = () => {
      (window as any).webtor = (window as any).webtor || [];
      (window as any).webtor.push({
        id,
        magnet,
        lang: 'pt',
        width: '100%',
        height: '100%',
        autoplay: true,
      });
    };

    if (document.querySelector(`script[src="${WEBTOR_SDK}"]`)) {
      initPlayer();
    } else {
      const s = document.createElement('script');
      s.src = WEBTOR_SDK;
      s.charset = 'utf-8';
      s.onload = initPlayer;
      document.head.appendChild(s);
    }

    let faded = false;
    const fade = () => {
      if (faded) return;
      faded = true;
      setLoadingFading(true);
      setTimeout(() => setLoadingVisible(false), 600);
    };
    fadeRef.current = fade;

    // Send play command to the webtor iframe via player.js protocol
    const tryPlay = () => {
      const container = document.getElementById(id);
      const iframe = container?.querySelector('iframe') as HTMLIFrameElement | null;
      if (!iframe?.contentWindow) return;
      try {
        iframe.contentWindow.postMessage(JSON.stringify({
          context: 'player.js', version: '0.0.11', method: 'play', value: null,
        }), '*');
      } catch {}
    };

    // Strategy 1: player.js postMessage
    // - 'ready' = player initialized → send play command, overlay STAYS
    // - 'play' alone can fire during init → ignore it, only trust timeupdate
    // - 'timeupdate' = video frames actually progressing → fade overlay
    const onMessage = (e: MessageEvent) => {
      try {
        const d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (!d || d.context !== 'player.js') return;
        if (d.event === 'ready') tryPlay();
        if (d.event === 'timeupdate') fade(); // real playback confirmed
      } catch {}
    };
    window.addEventListener('message', onMessage);

    // Strategy 2: MutationObserver — intercept the SDK-created iframe, replace
    // with our own that has allow="autoplay" set BEFORE the src loads.
    // Does NOT start a fade timer — overlay stays until timeupdate or hard fallback.
    let iframeDetected = false;
    let playRetry: ReturnType<typeof setInterval> | null = null;
    const container = document.getElementById(id);
    const observer = container
      ? new MutationObserver(() => {
          const sdkIframe = container.querySelector('iframe:not([data-managed])') as HTMLIFrameElement | null;
          if (!iframeDetected && sdkIframe) {
            iframeDetected = true;
            const src = sdkIframe.src;
            if (!src) return;
            sdkIframe.remove();
            const iframe = document.createElement('iframe');
            iframe.src = src.includes('autoplay') ? src : src + (src.includes('?') ? '&' : '#') + 'autoplay=1';
            iframe.allow = 'autoplay; fullscreen; picture-in-picture';
            iframe.style.cssText = 'width:100%;height:100%;border:0;position:absolute;inset:0;';
            iframe.dataset.managed = 'true';
            container.appendChild(iframe);
            // Keep retrying play command every 2s
            playRetry = setInterval(tryPlay, 2000);
          }
        })
      : null;
    if (observer && container) observer.observe(container, { childList: true, subtree: true });

    // Strategy 3: hard fallback — 45s maximum wait before showing the player
    const fallback = setTimeout(fade, 45000);

    return () => {
      clearTimeout(fallback);
      if (playRetry) clearInterval(playRetry);
      observer?.disconnect();
      window.removeEventListener('message', onMessage);
      const el = document.getElementById(id);
      if (el) el.innerHTML = '';
    };
  }, [magnet, containerId]);

  useEffect(() => {
    if (!loadingVisible) return;
    const t = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 500);
    return () => clearInterval(t);
  }, [loadingVisible]);

  return (
    <div className="fixed inset-0 bg-black z-[999999] flex flex-col" style={{ isolation: 'isolate' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900/95 border-b border-zinc-800 flex-shrink-0">
        <p className="text-white text-sm font-bold truncate flex-1 mr-3">{title}</p>
        <button onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-red-900 text-white text-xs rounded transition flex-shrink-0">
          <X className="w-3 h-3" /> Fechar
        </button>
      </div>

      <style>{`#${containerId} iframe { width:100%!important; height:100%!important; border:0; }`}</style>

      <div className="flex-1 w-full relative" style={{ minHeight: 0 }}>
        <div id={containerId} className="absolute inset-0" />
        {loadingVisible && (
          <MarioOverlay title={title} dots={dots} fading={loadingFading} />
        )}
      </div>
    </div>
  );
}

export const Route = createFileRoute("/watch/$slug")({
  component: Watch,
});

function cleanTitle(t: string): string {
  if (!t) return t;
  return t
    .replace(/\s*(torrent|download|blu-?ray|4k|1080p|720p|legendado|dublado|dual[\s\-]?[áa]udio|hdrip|bdrip|webrip|web-dl|hdtv|remux|hdcam|\bts\b|\bcam\b|nacional)\s*/gi, ' ')
    .replace(/\s*\(\s*(?:19|20)\d{2}\s*\)\s*$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function isLegendaOpt(opt: any): boolean {
  const q = (opt.quality || '').toLowerCase();
  const a = (opt.audio_type || '').toLowerCase();
  const l = (opt.language || '').toLowerCase();
  // Has a video resolution → it's a watchable video file, not a subtitle file
  // "Legendado" = subtitled video (still watchable); only bare subtitle entries lack resolution
  if (/\d{3,4}p|4k|2160|1080|720|480/i.test(q)) return false;
  // No resolution + labeled as legenda → standalone subtitle file
  return /\blegenda/.test(q) || /\blegenda/.test(a) || /\blegenda/.test(l);
}

function Watch() {
  const { slug } = Route.useParams();
  const [title, setTitle]             = useState<any>(null);
  const [related, setRelated]         = useState<any[]>([]);
  const [genres, setGenres]           = useState<string[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<any>(null);
  const [openSeasons, setOpenSeasons] = useState<Set<number>>(new Set([1]));
  const [streamMagnet, setStreamMagnet] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const { data, error: e } = await supabase
          .from('titles')
          .select(`*, torrent_options(*), seasons(*, episodes(*, torrent_options(*)))`)
          .eq('slug', slug)
          .single();
        if (e) throw e;
        setTitle(data);

        const [relRes, genreRes] = await Promise.all([
          supabase.from('titles').select('id,title,poster,imdb_rating,year,slug,type')
            .eq('type', data.type).neq('slug', slug).limit(9),
          supabase.from('title_genres').select('genres(name)').eq('title_id', data.id),
        ]);
        setRelated(relRes.data || []);
        const BAD_GENRE = /^filmes?\s+de\s|^documentários?$|^animes?$/i;
        const gNames = (genreRes.data || [])
          .map((r: any) => (r.genres?.name as string || '').replace(/[.,;]+$/, '').trim())
          .filter((n): n is string => n.length > 0 && !BAD_GENRE.test(n))
          .filter((n, i, arr) => arr.indexOf(n) === i)
          .slice(0, 5);
        setGenres(gNames);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  const toggleSeason = (n: number) =>
    setOpenSeasons(prev => { const s = new Set(prev); s.has(n) ? s.delete(n) : s.add(n); return s; });

  const openOnline = (magnet: string) => setStreamMagnet(magnet);

  const downloadTorrent = (magnet: string) => {
    if (magnet.startsWith('https://')) window.open(magnet, '_blank');
    else window.location.href = magnet;
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0d0d0d] text-white overflow-x-hidden">
      <NavBar />
      <div className="h-[60px]" />
      <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex gap-5">
            <Skeleton className="w-44 rounded-lg bg-zinc-900" style={{ aspectRatio: '2/3' }} />
            <div className="flex-1 space-y-3 pt-2">
              {[80, 60, 100, 70, 90].map(w => <Skeleton key={w} className={`h-3 w-${w === 100 ? 'full' : `${w}%`} bg-zinc-800 rounded`} />)}
            </div>
          </div>
        </div>
        <div><Skeleton className="h-64 bg-zinc-900 rounded-xl" /></div>
      </div>
    </div>
  );

  if (error || !title) return (
    <div className="min-h-screen bg-[#0d0d0d] text-white flex flex-col items-center justify-center p-8 text-center">
      <h2 className="text-xl font-bold text-primary mb-4">Conteúdo Indisponível</h2>
      <Button asChild className="bg-primary text-black font-bold px-8 rounded-full">
        <Link to="/">Voltar para Home</Link>
      </Button>
    </div>
  );

  const sortedSeasons = (title.seasons || []).sort((a: any, b: any) => a.season_number - b.season_number);
  const isSeries = title.type === 'series' || title.type === 'anime';
  const displayTitle = cleanTitle(title.title);
  const firstOpt = title.torrent_options?.[0];
  const mainQuality = (firstOpt?.quality || '1080p').replace(/\s*[|·].*$/, '').trim();
  const mainSize    = firstOpt?.size || '';
  const mainLang    = firstOpt?.language || firstOpt?.audio_type || 'Português | Inglês';
  const typeLabel   = title.type === 'movie' ? 'Filme' : title.type === 'anime' ? 'Anime' : 'Série';
  const ytSearch    = `https://www.youtube.com/results?search_query=${encodeURIComponent(displayTitle + ' trailer legendado')}`;

  const infoRows = [
    ['Lançamento', title.year],
    ['IMDB',       title.imdb_rating ? `★ ${Number(title.imdb_rating).toFixed(1)}` : null],
    ['Tipo',       typeLabel],
    ['Gênero',     genres.length ? genres.join(', ') : null],
    ['Qualidade',  mainQuality],
    ['Formato',    'MKV'],
    ['Tamanho',    mainSize || null],
    ['Idioma',     mainLang],
    ['Legenda',    'PT-BR'],
  ].filter(([, v]) => v) as [string, string][];

  // Group flat torrent_options by audio type for series
  const flatOpts = title.torrent_options || [];
  const audioGroups: Record<string, any[]> = {};
  flatOpts.forEach((opt: any) => {
    const grp = opt.audio_type || opt.language || 'Download';
    if (!audioGroups[grp]) audioGroups[grp] = [];
    audioGroups[grp].push(opt);
  });

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white overflow-x-hidden">
      {streamMagnet && (
        <StreamModalWebtor
          magnet={streamMagnet}
          title={displayTitle}
          poster={title?.poster}
          onClose={() => setStreamMagnet(null)}
        />
      )}
      <NavBar />
      <div className="h-[60px]" />

      <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6">

        <p className="text-[10px] text-zinc-700 mb-1 truncate">
          {title.title} · {title.year} · {mainQuality} · {typeLabel}
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8 items-start">

          {/* ── LEFT ── */}
          <div>

            {/* Poster + Info */}
            <div className="flex gap-5 mb-5">
              <div className="flex-shrink-0 w-32 sm:w-40">
                <img
                  src={title.poster}
                  alt={displayTitle}
                  className="w-full rounded-lg shadow-2xl border border-zinc-800/40"
                  style={{ aspectRatio: '2/3', objectFit: 'cover' }}
                />
              </div>

              <div className="flex-1 min-w-0">
                {/* Badges */}
                <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                  <span className="border border-zinc-600 text-zinc-400 text-[9px] font-bold px-1.5 py-0.5 rounded">FHD</span>
                  {title.imdb_rating && (
                    <span className="flex items-center gap-0.5 text-yellow-400 text-[11px] font-bold">
                      <Star className="w-2.5 h-2.5 fill-current" />
                      {Number(title.imdb_rating).toFixed(1)}
                    </span>
                  )}
                  {mainQuality && (
                    <span className="text-zinc-500 text-[10px]">{mainQuality}</span>
                  )}
                </div>

                <h1 className="text-base sm:text-xl font-bold text-white leading-tight mb-2.5">
                  {displayTitle}
                </h1>

                {/* Info table — label zinc-600, value zinc-400 */}
                <table className="w-full text-[11px] border-collapse">
                  <tbody>
                    {infoRows.map(([label, value]) => (
                      <tr key={label} className="border-b border-zinc-800/30 last:border-0">
                        <td className="py-0.5 pr-3 text-zinc-600 font-medium whitespace-nowrap w-20">{label}:</td>
                        <td className={`py-0.5 font-semibold ${label === 'IMDB' ? 'text-yellow-400' : 'text-zinc-400'}`}>{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Synopsis */}
            {title.synopsis && (
              <div className="mb-5">
                <h3 className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 mb-1">Sinopse</h3>
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  {title.synopsis.replace(/^sinopse:\s*/i, '')}
                </p>
              </div>
            )}

            {/* YouTube trailer */}
            {(title as any).youtube_id ? (
              <div className="mb-5 rounded-xl overflow-hidden border border-zinc-800/50" style={{ aspectRatio: '16/9' }}>
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${(title as any).youtube_id}?rel=0`}
                  className="w-full h-full border-0"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  title={`${displayTitle} trailer`}
                />
              </div>
            ) : (
              <div className="mb-5">
                <a href={ytSearch} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-500 transition text-white text-[11px] font-bold px-3 py-1.5 rounded-lg">
                  <Youtube className="w-3.5 h-3.5" />
                  Ver Trailer no YouTube
                </a>
              </div>
            )}

            {/* ── Download / Episodes ── */}
            {isSeries ? (
              <div>
                <h2 className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 flex items-center gap-2 mb-3">
                  <Tv className="w-3 h-3 text-primary" />
                  {sortedSeasons.length > 0 ? 'Temporadas & Episódios' : 'Episódios'}
                </h2>

                {/* Flat torrent_options grouped by audio type */}
                {sortedSeasons.length === 0 && flatOpts.length > 0 && (
                  <div className="space-y-4">
                    {Object.entries(audioGroups).map(([grp, opts]) => (
                      <div key={grp}>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-[#00d4ff] mb-2">
                          Versão {grp}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {opts.map((opt: any) => {
                            const isLeg = isLegendaOpt(opt);
                            const rawQ = opt.quality || '1080p';
                            return (
                              <div key={opt.id}
                                className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-2 hover:border-zinc-600 transition">
                                <span className="text-[10px] font-bold text-zinc-300 whitespace-nowrap">
                                  {rawQ}
                                </span>
                                {opt.size && <span className="text-[9px] text-zinc-600 whitespace-nowrap">{opt.size}</span>}
                                {!isLeg && (
                                  <button
                                    onClick={() => openOnline(opt.magnet)}
                                    className="h-6 px-2 bg-[#4ade80] hover:bg-[#22c55e] text-black font-bold text-[9px] rounded flex items-center gap-0.5 transition whitespace-nowrap"
                                  >
                                    <Play className="w-2 h-2 fill-current" /> ASSISTIR
                                  </button>
                                )}
                                <button
                                  onClick={() => downloadTorrent(opt.magnet)}
                                  className="h-6 px-2 bg-zinc-700 hover:bg-zinc-600 text-white font-bold text-[9px] rounded flex items-center gap-0.5 transition whitespace-nowrap"
                                >
                                  <Download className="w-2 h-2" /> BAIXAR
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {sortedSeasons.length === 0 && flatOpts.length === 0 && (
                  <div className="p-8 border border-dashed border-zinc-800 rounded-xl text-center">
                    <p className="text-zinc-700 text-[10px] uppercase tracking-widest font-bold">Em breve</p>
                  </div>
                )}

                {/* Structured seasons/episodes */}
                {sortedSeasons.map((season: any) => {
                  const episodes = (season.episodes || []).sort((a: any, b: any) => a.episode_number - b.episode_number);
                  const isOpen = openSeasons.has(season.season_number);
                  return (
                    <div key={season.id} className="bg-zinc-900/40 border border-zinc-800/40 rounded-xl overflow-hidden mb-2">
                      <button
                        onClick={() => toggleSeason(season.season_number)}
                        className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-zinc-800/30 transition"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-[10px]">
                            {season.season_number}
                          </span>
                          <span className="font-semibold text-[11px]">Temporada {season.season_number}</span>
                          <span className="text-zinc-600 text-[10px]">({episodes.length} ep.)</span>
                        </div>
                        <ChevronDown className={`w-3.5 h-3.5 text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {isOpen && (
                        <div className="border-t border-zinc-800/40 divide-y divide-zinc-800/30">
                          {episodes.map((ep: any) => {
                            const opts = ep.torrent_options || [];
                            return (
                              <div key={ep.id} className="px-4 py-2.5 hover:bg-zinc-800/20 transition">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="min-w-[1.8rem] text-center font-bold text-[10px] text-primary bg-primary/10 rounded px-1 py-0.5">
                                      {String(ep.episode_number).padStart(2, '0')}
                                    </span>
                                    <span className="text-[11px] text-zinc-300">{ep.title || `Episódio ${ep.episode_number}`}</span>
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {opts.length > 0 ? opts.map((opt: any) => (
                                      <button key={opt.id}
                                        onClick={() => openOnline(opt.magnet)}
                                        className="h-6 px-2.5 bg-zinc-800 hover:bg-primary hover:text-black text-white font-bold text-[9px] uppercase rounded transition flex items-center gap-1"
                                      >
                                        <Play className="w-2 h-2 fill-current" />
                                        {opt.quality || '1080p'}
                                      </button>
                                    )) : (
                                      <span className="text-[10px] text-zinc-700 italic">Em breve</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div>
                <h2 className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 flex items-center gap-2 mb-3">
                  <Download className="w-3 h-3 text-primary" /> Download
                </h2>
                {title.torrent_options?.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {title.torrent_options.map((opt: any) => {
                      const isLeg = isLegendaOpt(opt);
                      const isDirect = opt.magnet?.startsWith('https://');
                      const rawQ = opt.quality || '1080p';
                      const lang = opt.audio_type || opt.language || '';
                      return (
                        <div key={opt.id}
                          className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-2 hover:border-zinc-600 transition">
                          <div className="text-left mr-1">
                            <div className="text-[10px] font-bold text-[#00d4ff] uppercase whitespace-nowrap">{rawQ}</div>
                            {lang && <div className="text-[9px] text-zinc-600 whitespace-nowrap">{lang}</div>}
                            {opt.size && <div className="text-[9px] text-zinc-600 whitespace-nowrap">{opt.size}</div>}
                          </div>
                          {!isLeg && !isDirect && (
                            <button
                              onClick={() => openOnline(opt.magnet)}
                              className="h-6 px-2 bg-[#4ade80] hover:bg-[#22c55e] text-black font-bold text-[9px] rounded flex items-center gap-0.5 transition whitespace-nowrap"
                            >
                              <Play className="w-2 h-2 fill-current" /> ASSISTIR
                            </button>
                          )}
                          <button
                            onClick={() => downloadTorrent(opt.magnet)}
                            className="h-6 px-2 bg-zinc-700 hover:bg-zinc-600 text-white font-bold text-[9px] rounded flex items-center gap-0.5 transition whitespace-nowrap"
                          >
                            <Download className="w-2 h-2" /> {isLeg ? 'LEGENDA' : 'BAIXAR'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 border border-dashed border-zinc-800 rounded-xl text-center">
                    <p className="text-zinc-700 text-[10px] uppercase tracking-widest font-bold">Nenhum torrent disponível</p>
                  </div>
                )}
              </div>
            )}

            {/* Sobre */}
            <div className="mt-6 border border-zinc-800/40 rounded-xl p-3.5">
              <h3 className="text-[11px] font-bold text-white mb-1">Sobre</h3>
              <p className="text-[10px] text-zinc-600 leading-relaxed">
                <strong className="text-zinc-500">{displayTitle}</strong> faz parte do nosso catálogo.
                Aqui você encontra filmes, séries e muito mais para baixar gratuitamente via torrent.
                Para baixar <em>{displayTitle.toLowerCase()}</em>, use um dos links acima.
              </p>
            </div>
          </div>

          {/* ── RIGHT: Você pode gostar ── */}
          <div className="lg:sticky lg:top-[60px]">
            <h2 className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 flex items-center gap-1.5 mb-3">
              <Info className="w-3 h-3 text-primary" /> Você pode gostar
            </h2>
            {related.length > 0 ? (
              <div className="grid grid-cols-3 gap-1.5">
                {related.slice(0, 9).map((rel: any) => (
                  <Link key={rel.id} to="/watch/$slug" params={{ slug: rel.slug }} className="block group">
                    <div className="relative rounded-md overflow-hidden" style={{ paddingTop: '150%' }}>
                      <img
                        src={rel.poster}
                        alt={cleanTitle(rel.title)}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition" />
                      {rel.imdb_rating && (
                        <div className="absolute top-1 right-1 flex items-center gap-0.5 bg-black/60 rounded px-1 py-0.5">
                          <Star className="w-2 h-2 fill-yellow-400 text-yellow-400" />
                          <span className="text-white text-[9px] font-bold">{Number(rel.imdb_rating).toFixed(1)}</span>
                        </div>
                      )}
                      {rel.year && (
                        <div className="absolute bottom-1 left-1">
                          <span className="text-white text-[9px] font-bold px-1 py-0.5 rounded"
                            style={{ background: 'linear-gradient(to bottom, #00b4d8, #0077b6)' }}>
                            {rel.year}
                          </span>
                        </div>
                      )}
                    </div>
                    <p className="mt-1 text-[10px] text-zinc-400 group-hover:text-white transition line-clamp-1 leading-tight">
                      {cleanTitle(rel.title)}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-zinc-700 text-[10px]">Nenhum relacionado.</p>
            )}
          </div>
        </div>
      </div>

      <footer className="border-t border-zinc-800/40 py-6 px-6 text-center mt-8">
        <Link to="/"><InwiseLogo size="sm" className="justify-center mb-2" /></Link>
        <p className="text-[9px] font-bold uppercase tracking-[0.4em] text-zinc-700">© 2026 INWISE MOVIES</p>
      </footer>
    </div>
  );
}
