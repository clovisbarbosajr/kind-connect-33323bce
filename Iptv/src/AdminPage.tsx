import { useEffect, useMemo, useState, useCallback } from "react";
import {
  xtream,
  liveUrl,
  movieUrl,
  seriesEpisodeUrl,
  decodeB64,
  type Provider,
  type Category,
  type LiveStream,
  type VodStream,
  type Series,
  type EpgEntry,
} from "./lib/xtream";
import { store } from "./lib/store";
import { Player } from "./components/Player";
import { getNowPlaying, setNowPlaying, type NowPlaying } from "./lib/broadcast";
import { TEST_PROVIDER } from "./lib/config";

/* ============================ ADMIN ============================ */

export function AdminApp() {
  // No login, no password — straight into the dashboard with the test provider.
  return <AdminDashboard provider={TEST_PROVIDER} />;
}

/* --------------------------- Admin Dashboard --------------------------- */

type Tab = "live" | "movies" | "series" | "favorites";

function AdminDashboard({ provider }: { provider: Provider }) {
  const [tab, setTab] = useState<Tab>("live");
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCat, setActiveCat] = useState<string>("");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [seriesView, setSeriesView] = useState<Series | null>(null);
  const [liveDetail, setLiveDetail] = useState<LiveStream | null>(null);
  const [movieDetail, setMovieDetail] = useState<VodStream | null>(null);

  const [onAir, setOnAir] = useState<NowPlaying>(null);
  const [preview, setPreview] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => setFavorites(store.getFavorites()), []);
  useEffect(() => {
    getNowPlaying().then(setOnAir).catch(() => {});
  }, []);

  // categories per tab
  useEffect(() => {
    if (tab === "favorites") {
      setCategories([]);
      setActiveCat("");
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const cats =
          tab === "live"
            ? await xtream.liveCategories(provider)
            : tab === "movies"
              ? await xtream.vodCategories(provider)
              : await xtream.seriesCategories(provider);
        if (cancelled) return;
        setCategories(cats);
        setActiveCat(cats[0]?.category_id ?? "");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, provider]);

  // items per category
  useEffect(() => {
    if (tab === "favorites") {
      let cancelled = false;
      (async () => {
        setLoading(true);
        const all = await xtream.liveStreams(provider);
        if (cancelled) return;
        setItems(all.filter((s) => favorites.has(s.stream_id)));
        setLoading(false);
      })();
      return () => {
        cancelled = true;
      };
    }
    if (!activeCat) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data =
          tab === "live"
            ? await xtream.liveStreams(provider, activeCat)
            : tab === "movies"
              ? await xtream.vodStreams(provider, activeCat)
              : await xtream.series(provider, activeCat);
        if (!cancelled) setItems(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeCat, tab, provider, favorites]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => (i.name ?? "").toLowerCase().includes(q));
  }, [items, search]);

  const toggleFav = (id: number) => setFavorites(new Set(store.toggleFavorite(id)));

  async function broadcast(np: NonNullable<NowPlaying>) {
    // Set the shared "now playing" AND open the preview so the admin sees the
    // video immediately.
    setOnAir(np);
    setPreview(true);
    const ok = await setNowPlaying(np);
    setFlash(ok ? `No ar: ${np.title}` : `Falha ao salvar — tente de novo`);
    setTimeout(() => setFlash(null), 2500);
  }
  const airLive = (s: LiveStream) =>
    broadcast({ url: liveUrl(provider, s.stream_id), title: s.name, live: true, poster: s.stream_icon, ts: Date.now() });
  const airMovie = (s: VodStream) =>
    broadcast({
      url: movieUrl(provider, s.stream_id, s.container_extension || "mp4"),
      title: s.name,
      live: false,
      poster: s.stream_icon || s.cover,
      ts: Date.now(),
    });

  async function stop() {
    if (await setNowPlaying(null)) {
      setOnAir(null);
      setPreview(false);
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo-dot" /> Admin · WorldCup
        </div>
        <nav className="tabs">
          {(["live", "movies", "series", "favorites"] as Tab[]).map((t) => (
            <button
              key={t}
              className={tab === t ? "active" : ""}
              onClick={() => {
                setTab(t);
                setSeriesView(null);
                setLiveDetail(null);
                setMovieDetail(null);
                setSearch("");
              }}
            >
              {t === "live" ? "Ao Vivo" : t === "movies" ? "Filmes" : t === "series" ? "Séries" : "★ Favoritos"}
            </button>
          ))}
        </nav>
        <div className="topbar-right">
          <input className="search" placeholder="Buscar…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </header>

      {/* On-air banner */}
      <div className={`onair ${onAir ? "live" : ""}`}>
        {onAir ? (
          <>
            <span className="onair-dot" /> No ar: <strong>{onAir.title}</strong>
            <button className="ghost" onClick={() => setPreview((p) => !p)}>
              {preview ? "Ocultar prévia" : "Pré-visualizar"}
            </button>
            <button className="ghost danger" onClick={stop}>
              Parar transmissão
            </button>
          </>
        ) : (
          <span className="muted">Nada no ar. Clique em "Transmitir" em qualquer canal/filme.</span>
        )}
        <span className="onair-hint muted small">
          Público assiste em <code>/worldcup</code>
        </span>
      </div>

      {preview && onAir && (
        <div className="admin-preview">
          <Player
            key={onAir.url}
            src={onAir.url}
            live={onAir.live}
            poster={onAir.poster}
            title={onAir.title}
            enableSubtitles={!onAir.live}
            onClose={() => setPreview(false)}
          />
          <p className="muted small">A prévia consome 1 conexão do seu plano. Feche para liberar.</p>
        </div>
      )}

      {flash && <div className="flash">{flash}</div>}

      <div className="body">
        {tab !== "favorites" && (
          <aside className="sidebar">
            {categories.map((c) => (
              <button
                key={c.category_id}
                className={activeCat === c.category_id ? "active" : ""}
                onClick={() => {
                  setActiveCat(c.category_id);
                  setLiveDetail(null);
                  setMovieDetail(null);
                }}
              >
                {c.category_name}
              </button>
            ))}
          </aside>
        )}

        <main className="content">
          {/* ---- Live channel detail (logo + EPG) ---- */}
          {(tab === "live" || tab === "favorites") && liveDetail && (
            <LiveDetail
              provider={provider}
              channel={liveDetail}
              onAir={onAir?.url === liveUrl(provider, liveDetail.stream_id)}
              fav={favorites.has(liveDetail.stream_id)}
              onBack={() => setLiveDetail(null)}
              onFav={() => toggleFav(liveDetail.stream_id)}
              onBroadcast={() => airLive(liveDetail)}
            />
          )}

          {/* ---- Movie detail (banner + description) ---- */}
          {tab === "movies" && movieDetail && (
            <MovieDetail
              provider={provider}
              movie={movieDetail}
              onBack={() => setMovieDetail(null)}
              onBroadcast={() => airMovie(movieDetail)}
            />
          )}

          {loading && <div className="grid-msg">Carregando…</div>}
          {!loading && !liveDetail && !movieDetail && filtered.length === 0 && <div className="grid-msg">Nada encontrado.</div>}

          {!loading && (tab === "live" || tab === "favorites") && !liveDetail && (
            <div className="grid live-grid">
              {filtered.map((s: LiveStream) => (
                <LiveCard
                  key={s.stream_id}
                  s={s}
                  fav={favorites.has(s.stream_id)}
                  onAir={onAir?.url === liveUrl(provider, s.stream_id)}
                  onBroadcast={() => setLiveDetail(s)}
                  onFav={() => toggleFav(s.stream_id)}
                />
              ))}
            </div>
          )}

          {!loading && tab === "movies" && !movieDetail && (
            <div className="grid poster-grid">
              {filtered.map((s: VodStream) => (
                <PosterCard key={s.stream_id} title={s.name} img={s.stream_icon || s.cover} onClick={() => setMovieDetail(s)} actionLabel="Detalhes" />
              ))}
            </div>
          )}

          {!loading && tab === "series" && !seriesView && (
            <div className="grid poster-grid">
              {filtered.map((s: Series) => (
                <PosterCard key={s.series_id} title={s.name} img={s.cover} onClick={() => setSeriesView(s)} actionLabel="Abrir" />
              ))}
            </div>
          )}

          {tab === "series" && seriesView && (
            <SeriesDetail
              provider={provider}
              series={seriesView}
              onBack={() => setSeriesView(null)}
              onBroadcast={(url, title) => broadcast({ url, title, live: false, poster: seriesView.cover, ts: Date.now() })}
            />
          )}
        </main>
      </div>
    </div>
  );
}

/* ----------------------------- Cards ----------------------------- */

function LiveCard({
  s,
  fav,
  onAir,
  onBroadcast,
  onFav,
}: {
  s: LiveStream;
  fav: boolean;
  onAir: boolean;
  onBroadcast: () => void;
  onFav: () => void;
}) {
  return (
    <div className={`live-card ${onAir ? "is-onair" : ""}`} onClick={onBroadcast}>
      <div className="live-logo">
        {s.stream_icon ? <img src={s.stream_icon} alt="" loading="lazy" /> : <div className="logo-fallback">{s.name?.[0]}</div>}
      </div>
      <div className="live-name">{s.name}</div>
      <button
        className={`fav ${fav ? "on" : ""}`}
        onClick={(e) => {
          e.stopPropagation();
          onFav();
        }}
        title="Favoritar"
      >
        ★
      </button>
      <div className="card-action">{onAir ? "● No ar" : "Transmitir"}</div>
    </div>
  );
}

function PosterCard({ title, img, onClick, actionLabel }: { title: string; img?: string; onClick: () => void; actionLabel: string }) {
  return (
    <div className="poster-card" onClick={onClick}>
      <div className="poster">
        {img ? <img src={img} alt="" loading="lazy" /> : <div className="logo-fallback">{title?.[0]}</div>}
        <span className="poster-action">{actionLabel}</span>
      </div>
      <div className="poster-title">{title}</div>
    </div>
  );
}

/* ------------------------- Live detail (EPG) ------------------------- */

function LiveDetail({
  provider,
  channel,
  onAir,
  fav,
  onBack,
  onFav,
  onBroadcast,
}: {
  provider: Provider;
  channel: LiveStream;
  onAir: boolean;
  fav: boolean;
  onBack: () => void;
  onFav: () => void;
  onBroadcast: () => void;
}) {
  const [epg, setEpg] = useState<EpgEntry[] | null>(null);

  useEffect(() => {
    setEpg(null);
    xtream
      .shortEpg(provider, channel.stream_id)
      .then((d) => setEpg(d.epg_listings ?? []))
      .catch(() => setEpg([]));
  }, [provider, channel.stream_id]);

  return (
    <div className="detail">
      <button className="back" onClick={onBack}>
        ← Voltar
      </button>
      <div className="detail-head live">
        <div className="detail-logo">
          {channel.stream_icon ? <img src={channel.stream_icon} alt="" /> : <div className="logo-fallback big">{channel.name?.[0]}</div>}
        </div>
        <div className="detail-info">
          <h2>{channel.name}</h2>
          <div className="detail-actions">
            <button className="primary" onClick={onBroadcast}>
              {onAir ? "● No ar — retransmitir" : "▶ Transmitir agora"}
            </button>
            <button className={`ghost ${fav ? "fav-on" : ""}`} onClick={onFav}>
              {fav ? "★ Favorito" : "☆ Favoritar"}
            </button>
          </div>
        </div>
      </div>

      <h3 className="epg-h">Programação</h3>
      {epg === null && <div className="grid-msg">Carregando EPG…</div>}
      {epg !== null && epg.length === 0 && <p className="muted">Sem EPG para este canal.</p>}
      {epg !== null && epg.length > 0 && (
        <ul className="epg-list">
          {epg.slice(0, 8).map((e, i) => (
            <li key={i} className={i === 0 ? "now" : ""}>
              <span className="epg-time">
                {fmtTime(e.start)} – {fmtTime(e.end)}
              </span>
              <span className="epg-prog">
                <strong>{decodeB64(e.title)}</strong>
                {i === 0 && <span className="badge-now">AGORA</span>}
                {decodeB64(e.description) && <span className="epg-desc">{decodeB64(e.description)}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function fmtTime(s: string): string {
  return s?.split(" ")[1]?.slice(0, 5) ?? "";
}

/* ------------------------- Movie detail (banner) ------------------------- */

function MovieDetail({
  provider,
  movie,
  onBack,
  onBroadcast,
}: {
  provider: Provider;
  movie: VodStream;
  onBack: () => void;
  onBroadcast: () => void;
}) {
  const [info, setInfo] = useState<any | null>(null);

  useEffect(() => {
    setInfo(null);
    xtream
      .vodInfo(provider, movie.stream_id)
      .then((d) => setInfo(d?.info ?? {}))
      .catch(() => setInfo({}));
  }, [provider, movie.stream_id]);

  const backdrop = (Array.isArray(info?.backdrop_path) ? info.backdrop_path[0] : info?.backdrop_path) || info?.movie_image || movie.stream_icon || movie.cover;
  const poster = info?.movie_image || movie.stream_icon || movie.cover;
  const year = (info?.releasedate || info?.release_date || "").toString().slice(0, 4);

  return (
    <div className="detail">
      <button className="back" onClick={onBack}>
        ← Voltar
      </button>
      <div className="movie-banner">
        {backdrop && <img className="movie-backdrop" src={backdrop} alt="" />}
        <div className="movie-banner-shade" />
        <div className="movie-banner-content">
          {poster && <img className="movie-poster" src={poster} alt="" />}
          <div className="movie-meta">
            <h2>{movie.name}</h2>
            <div className="movie-tags">
              {year && <span>{year}</span>}
              {info?.genre && <span>{info.genre}</span>}
              {info?.duration && <span>{info.duration}</span>}
              {(info?.rating || movie.rating) && <span>★ {info?.rating || movie.rating}</span>}
            </div>
            {info === null ? (
              <p className="muted">Carregando informações…</p>
            ) : (
              <p className="movie-plot">{info?.plot || info?.description || "Sem descrição disponível."}</p>
            )}
            {info?.cast && <p className="muted small">Elenco: {info.cast}</p>}
            {info?.director && <p className="muted small">Direção: {info.director}</p>}
            <div className="detail-actions">
              <button className="primary" onClick={onBroadcast}>
                ▶ Transmitir agora
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------- Series detail ------------------------- */

function SeriesDetail({
  provider,
  series,
  onBack,
  onBroadcast,
}: {
  provider: Provider;
  series: Series;
  onBack: () => void;
  onBroadcast: (url: string, title: string) => void;
}) {
  const [info, setInfo] = useState<any>(null);
  const [season, setSeason] = useState<string>("");

  useEffect(() => {
    xtream.seriesInfo(provider, series.series_id).then((d) => {
      setInfo(d);
      setSeason(Object.keys(d?.episodes ?? {})[0] ?? "");
    });
  }, [provider, series.series_id]);

  if (!info) return <div className="grid-msg">Carregando episódios…</div>;
  const seasons = Object.keys(info.episodes ?? {});
  const eps: any[] = info.episodes?.[season] ?? [];

  return (
    <div className="series-detail">
      <button className="back" onClick={onBack}>
        ← Voltar
      </button>
      <div className="series-head">
        {series.cover && <img src={series.cover} alt="" />}
        <div>
          <h2>{series.name}</h2>
          <p className="muted">{info.info?.plot ?? series.plot}</p>
          <div className="season-tabs">
            {seasons.map((s) => (
              <button key={s} className={season === s ? "active" : ""} onClick={() => setSeason(s)}>
                Temp. {s}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="episodes">
        {eps.map((ep) => (
          <button
            key={ep.id}
            className="episode"
            onClick={() => onBroadcast(seriesEpisodeUrl(provider, ep.id, ep.container_extension || "mp4"), `${series.name} — ${ep.title}`)}
          >
            <span className="ep-num">{ep.episode_num}</span>
            <span className="ep-title">{ep.title}</span>
            <span className="ep-play">Transmitir ▶</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* -------------------------- Profile menu -------------------------- */

function ProfileMenu({
  provider,
  providers,
  onSwitch,
  onLogout,
}: {
  provider: Provider;
  providers: Provider[];
  onSwitch: (p: Provider) => void;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="profile-menu">
      <button className="avatar" onClick={() => setOpen((o) => !o)}>
        {provider.name[0]?.toUpperCase()}
      </button>
      {open && (
        <div className="menu" onMouseLeave={() => setOpen(false)}>
          <div className="menu-title">{provider.name}</div>
          {providers
            .filter((p) => p.id !== provider.id)
            .map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  onSwitch(p);
                  setOpen(false);
                }}
              >
                Trocar para {p.name}
              </button>
            ))}
          <button onClick={onLogout}>Adicionar / Sair do provedor</button>
        </div>
      )}
    </div>
  );
}
