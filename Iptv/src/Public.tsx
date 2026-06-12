import { useEffect, useState } from "react";
import { Player } from "./components/Player";
import { getNowPlaying, type NowPlaying } from "./lib/broadcast";

// PUBLIC page (/worldcup/). Viewers only watch what the admin is airing.
// This file imports NO login / admin / xtream-client code.
export function PublicView() {
  const [np, setNp] = useState<NowPlaying>(null);
  const [booted, setBooted] = useState(false);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      const cur = await getNowPlaying().catch(() => null);
      if (alive) {
        setNp((prev) => (prev?.url === cur?.url && prev?.ts === cur?.ts ? prev : cur));
        setBooted(true);
      }
    };
    tick();
    const id = setInterval(tick, 5000); // pick up channel changes within 5s
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  if (!booted) return <div className="boot">Carregando…</div>;

  if (!np || closed)
    return (
      <div className="public off">
        <div className="brand big">
          <span className="logo-dot" /> WorldCup IPTV
        </div>
        {np && closed ? (
          <>
            <p className="muted">
              Transmissão no ar: <strong>{np.title}</strong>
            </p>
            <button className="primary" onClick={() => setClosed(false)}>
              ▶ Assistir
            </button>
          </>
        ) : (
          <>
            <p className="muted">Nenhuma transmissão no ar no momento.</p>
            <p className="muted small">A página atualiza sozinha quando uma transmissão começar.</p>
          </>
        )}
      </div>
    );

  return (
    <div className="public">
      <div className="public-bar">
        <div className="brand">
          <span className="logo-dot" /> WorldCup IPTV
        </div>
        {np.live && <span className="live-badge">● AO VIVO</span>}
        <span className="public-title">{np.title}</span>
      </div>
      <div className="public-stage">
        {/* key forces a clean reload when the admin switches channel */}
        <Player
          key={np.url}
          src={np.url}
          live={np.live}
          poster={np.poster}
          title={np.title}
          enableSubtitles={!np.live}
          onClose={() => setClosed(true)}
        />
      </div>
    </div>
  );
}
