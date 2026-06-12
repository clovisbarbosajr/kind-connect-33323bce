import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";

type Props = {
  src: string;
  live?: boolean;
  poster?: string;
  title?: string;
};

// Player tuned for low latency / fast zapping on live channels.
export function Player({ src, live = true, poster, title }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;
    setError(null);
    setLoading(true);

    let hls: Hls | null = null;
    const onPlaying = () => setLoading(false);
    video.addEventListener("playing", onPlaying);

    // Native HLS (Safari / iOS / many Android TV browsers) — lowest latency,
    // hardware accelerated, no JS layer.
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      video.play().catch(() => {});
    } else if (Hls.isSupported()) {
      hls = new Hls({
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
      });
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (!data.fatal) return;
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            hls?.startLoad();
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            hls?.recoverMediaError();
            break;
          default:
            setError("Não foi possível abrir o stream (CORS, canal offline ou formato não suportado).");
            setLoading(false);
        }
      });
    } else {
      // Last resort — let the browser try the URL directly.
      video.src = src;
      video.play().catch(() => setError("Navegador não suporta este stream."));
    }

    return () => {
      video.removeEventListener("playing", onPlaying);
      hls?.destroy();
      video.removeAttribute("src");
      video.load();
    };
  }, [src, live]);

  return (
    <div className="player">
      <video ref={videoRef} poster={poster} controls autoPlay playsInline />
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
