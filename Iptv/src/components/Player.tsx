import { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";

type Track = { id: number; label: string };

type Props = {
  src: string;
  live?: boolean;
  poster?: string;
  title?: string;
  onClose?: () => void;
  enableSubtitles?: boolean; // surface subtitle tracks (VOD)
};

// Player tuned for low latency / fast zapping, with fullscreen, close and
// (best-effort) subtitle selection.
export function Player({ src, live = true, poster, title, onClose, enableSubtitles }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [activeTrack, setActiveTrack] = useState<number>(-1);
  const [fs, setFs] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;
    setError(null);
    setLoading(true);
    setTracks([]);
    setActiveTrack(-1);

    const onPlaying = () => setLoading(false);
    video.addEventListener("playing", onPlaying);

    // Reads <track>/textTracks the browser exposes (native path).
    const readNativeTracks = () => {
      if (!enableSubtitles) return;
      const list: Track[] = [];
      for (let i = 0; i < video.textTracks.length; i++) {
        const t = video.textTracks[i];
        if (t.kind === "subtitles" || t.kind === "captions") list.push({ id: i, label: t.label || t.language || `Faixa ${i + 1}` });
      }
      setTracks(list);
    };

    let triedProxy = false;

    // hls.js needs CORS on the manifest/segments. If the provider doesn't send
    // it, we retry through a CORS proxy that rewrites every request URL.
    const startHls = (useProxy: boolean) => {
      hlsRef.current?.destroy();
      const cfg: any = {
        enableWorker: true,
        lowLatencyMode: live,
        backBufferLength: live ? 15 : 90,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 6,
        maxBufferLength: live ? 8 : 30,
        maxMaxBufferLength: live ? 20 : 60,
        maxLiveSyncPlaybackRate: live ? 1.5 : 1,
        manifestLoadingTimeOut: 12000,
        fragLoadingTimeOut: 20000,
      };
      if (useProxy) {
        cfg.loader = class extends (Hls.DefaultConfig.loader as any) {
          load(context: any, config: any, callbacks: any) {
            if (/^https?:\/\//i.test(context.url) && !context.url.includes("corsproxy.io")) {
              context.url = `https://corsproxy.io/?url=${encodeURIComponent(context.url)}`;
            }
            super.load(context, config, callbacks);
          }
        };
      }
      const hls = new Hls(cfg);
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
      if (enableSubtitles) {
        hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, (_e, data) => {
          setTracks(data.subtitleTracks.map((t: any, i: number) => ({ id: i, label: t.name || t.lang || `Faixa ${i + 1}` })));
        });
      }
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          // First network failure (likely CORS) → retry through the proxy.
          if (!useProxy && !triedProxy) {
            triedProxy = true;
            startHls(true);
          } else {
            hls.startLoad();
          }
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hls.recoverMediaError();
        } else {
          setError("Não foi possível abrir o stream (canal offline ou formato não suportado).");
          setLoading(false);
        }
      });
    };

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari / iOS native HLS — plays cross-origin media without needing CORS.
      video.src = src;
      video.play().catch(() => {});
      video.addEventListener("loadedmetadata", readNativeTracks);
    } else if (Hls.isSupported()) {
      startHls(false);
    } else {
      video.src = src;
      video.play().catch(() => setError("Navegador não suporta este stream."));
    }

    return () => {
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("loadedmetadata", readNativeTracks);
      hlsRef.current?.destroy();
      hlsRef.current = null;
      video.removeAttribute("src");
      video.load();
    };
  }, [src, live, enableSubtitles]);

  // fullscreen state sync
  useEffect(() => {
    const onFs = () => setFs(document.fullscreenElement === wrapRef.current);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else el.requestFullscreen?.().catch(() => {});
  }, []);

  const selectTrack = useCallback(
    (id: number) => {
      setActiveTrack(id);
      const hls = hlsRef.current;
      const video = videoRef.current;
      if (hls) {
        hls.subtitleTrack = id; // -1 = off
        hls.subtitleDisplay = id >= 0;
      } else if (video) {
        for (let i = 0; i < video.textTracks.length; i++) {
          video.textTracks[i].mode = i === id ? "showing" : "disabled";
        }
      }
    },
    [],
  );

  return (
    <div className="player" ref={wrapRef}>
      <video ref={videoRef} poster={poster} controls autoPlay playsInline />

      <div className="player-controls">
        {enableSubtitles && tracks.length > 0 && (
          <select
            className="cc-select"
            value={activeTrack}
            onChange={(e) => selectTrack(Number(e.target.value))}
            title="Legendas"
          >
            <option value={-1}>CC: desligado</option>
            {tracks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        )}
        <button className="pc-btn" onClick={toggleFullscreen} title="Tela cheia">
          {fs ? "⤡" : "⤢"}
        </button>
        {onClose && (
          <button className="pc-btn" onClick={onClose} title="Fechar">
            ✕
          </button>
        )}
      </div>

      {loading && !error && (
        <div className="player-overlay">
          <div className="spinner" />
          {title && <span>{title}</span>}
        </div>
      )}
      {error && (
        <div className="player-overlay error">
          <span>⚠ {error}</span>
        </div>
      )}
    </div>
  );
}
