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
import { store, uid } from "./lib/store";
import { Player } from "./components/Player";

type Tab = "live" | "movies" | "series" | "favorites";

export function App() {
  const [provider, setProvider] = useState<Provider | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [booted, setBooted] = useState(false);

  // Auto-login from saved profile.
  useEffect(() => {
    setProviders(store.getProviders());
    const active = store.getActive();
    if (active) setProvider(active);
    setBooted(true);
  }, []);

  const onLogin = useCallback((p: Provider) => {
    store.saveProvider(p);
    store.setActiveId(p.id);
    setProviders(store.getProviders());
    setProvider(p);
  }, []);

  const onLogout = useCallback(() => {
    store.setActiveId(null);
    setProvider(null);
  }, []);

  if (!booted) return <div className="boot">Carregando…</div>;
  if (!provider)
    return <Login providers={providers} onLogin={onLogin} onPickExisting={onLogin} />;

  return <Dashboard provider={provider} onLogout={onLogout} onSwitch={onLogin} providers={providers} />;
}

/* ----------------------------- Login ----------------------------- */

function Login({
  providers,
  onLogin,
  onPickExisting,
}: {
  providers: Provider[];
  onLogin: (p: Provider) => void;
  onPickExisting: (p: Provider) => void;
}) {
  const [name, setName] = useState("");
  const [host, setHost] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const p: Provider = {
      id: uid(),
      name: name.trim() || new URL(host).hostname,
      host: host.trim().replace(/\/+$/, ""),
      username: username.trim(),
      password: password.trim(),
    };
    try {
      const auth = await xtream.auth(p);
      if (!auth?.user_info || auth.user_info.auth === 0)
        throw new Error("Usuário ou senha inválidos.");
      onLogin(p);
    } catch (e: any) {
      setErr(e?.message ?? "Falha ao conectar. Verifique a URL/credenciais.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <div className="login-card">
        <h1>
          <span className="logo-dot" /> WorldCup IPTV
        </h1>
        <p className="muted">Conecte seu provedor (Xtream Codes). Conexão direta — sem restream.</p>

        {providers.length > 0 && (
          <div className="profiles">
            <span className="muted small">Perfis salvos</span>
            <div className="profile-chips">
              {providers.map((p) => (
                <button key={p.id} className="chip" onClick={() => onPickExisting(p)}>
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={submit}>
          <input placeholder="Nome do perfil (opcional)" value={name} onChange={(e) => setName(e.target.value)} />
          <input
            placeholder="URL do servidor — http://servidor.com:8080"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            required
          />
          <input placeholder="Usuário" value={username} onChange={(e) => setUsername(e.target.value)} required />
          <input
            placeholder="Senha"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {err && <div className="err">{err}</div>}
          <button className="primary" disabled={busy}>
            {busy ? "Conectando…" : "Entrar"}
          </button>
        </form>
        <p className="muted small">
          As credenciais ficam salvas só no seu navegador. O vídeo vai direto do provedor para você.
        </p>
      </div>
    </div>
  );
}

/* --------------------------- Dashboard --------------------------- */

type PlayTarget = { url: string; title: string; live: boolean; poster?: string; streamId?: number } | null;

function Dashboard({
  provider,
  providers,
  onLogout,
  onSwitch,
}: {
  provider: Provider;
  providers: Provider[];
  onLogout: () => void;
  onSwitch: (p: Provider) => void;
}) {
  const [tab, setTab] = useState<Tab>("live");
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCat, setActiveCat] = useState<string>("");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [play, setPlay] = useState<PlayTarget>(null);
  const [seriesView, setSeriesView] = useState<Series | null>(null);

  useEffect(() => setFavorites(store.getFavorites()), []);

  // Load categories whenever tab changes.
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

  // Load items for the active category.
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

  const toggleFav = (streamId: number) => setFavorites(new Set(store.toggleFavorite(streamId)));

  function openLive(s: LiveStream) {
    store.pushRecent(s.stream_id);
    setPlay({ url: liveUrl(provider, s.stream_id), title: s.name, live: true, poster: s.stream_icon, streamId: s.stream_id });
  }
  function openMovie(s: VodStream) {
    setPlay({
      url: movieUrl(provider, s.stream_id, s.container_extension || "mp4"),
      title: s.name,
      live: false,
      poster: s.stream_icon || s.cover,
    });
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo-dot" /> WorldCup IPTV
        </div>
        <nav className="tabs">
          {(["live", "movies", "series", "favorites"] as Tab[]).map((t) => (
            <button key={t} className={tab === t ? "active" : ""} onClick={() => { setTab(t); setSeriesView(null); setSearch(""); }}>
              {t === "live" ? "Ao Vivo" : t === "movies" ? "Filmes" : t === "series" ? "Séries" : "★ Favoritos"}
            </button>
          ))}
        </nav>
        <div className="topbar-right">
          <input className="search" placeholder="Buscar…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <ProfileMenu provider={provider} providers={providers} onSwitch={onSwitch} onLogout={onLogout} />
        </div>
      </header>

      <div className="body">
        {tab !== "favorites" && (
          <aside className="sidebar">
            {categories.map((c) => (
              <button
                key={c.category_id}
                className={activeCat === c.category_id ? "active" : ""}
                onClick={() => setActiveCat(c.category_id)}
              >
                {c.category_name}
              </button>
            ))}
          </aside>
        )}

        <main className="content">
          {loading && <div className="grid-msg">Carregando…</div>}
          {!loading && filtered.length === 0 && <div className="grid-msg">Nada encontrado.</div>}

          {!loading && tab === "live" && (
            <div className="grid live-grid">
              {filtered.map((s: LiveStream) => (
                <LiveCard
                  key={s.stream_id}
                  s={s}
                  fav={favorites.has(s.stream_id)}
                  onPlay={() => openLive(s)}
                  onFav={() => toggleFav(s.stream_id)}
                />
              ))}
            </div>
          )}

          {!loading && tab === "favorites" && (
            <div className="grid live-grid">
              {filtered.map((s: LiveStream) => (
                <LiveCard key={s.stream_id} s={s} fav onPlay={() => openLive(s)} onFav={() => toggleFav(s.stream_id)} />
              ))}
            </div>
          )}

          {!loading && tab === "movies" && (
            <div className="grid poster-grid">
              {filtered.map((s: VodStream) => (
                <PosterCard key={s.stream_id} title={s.name} img={s.stream_icon || s.cover} onClick={() => openMovie(s)} />
              ))}
            </div>
          )}

          {!loading && tab === "series" && !seriesView && (
            <div className="grid poster-grid">
              {filtered.map((s: Series) => (
                <PosterCard key={s.series_id} title={s.name} img={s.cover} onClick={() => setSeriesView(s)} />
              ))}
            </div>
          )}

          {tab === "series" && seriesView && (
            <SeriesDetail
              provider={provider}
              series={seriesView}
              onBack={() => setSeriesView(null)}
              onPlay={(url, title) => setPlay({ url, title, live: false, poster: seriesView.cover })}
            />
          )}
        </main>
      </div>

      {play && (
        <PlayerModal target={play} provider={provider} onClose={() => setPlay(null)} />
      )}
    </div>
  );
}

/* ----------------------------- Cards ----------------------------- */

function LiveCard({ s, fav, onPlay, onFav }: { s: LiveStream; fav: boolean; onPlay: () => void; onFav: () => void }) {
  return (
    <div className="live-card" onClick={onPlay}>
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
    </div>
  );
}

function PosterCard({ title, img, onClick }: { title: string; img?: string; onClick: () => void }) {
  return (
    <div className="poster-card" onClick={onClick}>
      <div className="poster">
        {img ? <img src={img} alt="" loading="lazy" /> : <div className="logo-fallback">{title?.[0]}</div>}
      </div>
      <div className="poster-title">{title}</div>
    </div>
  );
}

/* ------------------------- Series detail ------------------------- */

function SeriesDetail({
  provider,
  series,
  onBack,
  onPlay,
}: {
  provider: Provider;
  series: Series;
  onBack: () => void;
  onPlay: (url: string, title: string) => void;
}) {
  const [info, setInfo] = useState<any>(null);
  const [season, setSeason] = useState<string>("");

  useEffect(() => {
    xtream.seriesInfo(provider, series.series_id).then((d) => {
      setInfo(d);
      const seasons = Object.keys(d?.episodes ?? {});
      setSeason(seasons[0] ?? "");
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
            onClick={() => onPlay(seriesEpisodeUrl(provider, ep.id, ep.container_extension || "mp4"), `${series.name} — ${ep.title}`)}
          >
            <span className="ep-num">{ep.episode_num}</span>
            <span className="ep-title">{ep.title}</span>
            <span className="ep-play">▶</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* --------------------------- Player modal --------------------------- */

function PlayerModal({ target, provider, onClose }: { target: NonNullable<PlayTarget>; provider: Provider; onClose: () => void }) {
  const [epg, setEpg] = useState<EpgEntry[]>([]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (target.live && target.streamId) {
      xtream
        .shortEpg(provider, target.streamId)
        .then((d) => setEpg(d.epg_listings ?? []))
        .catch(() => setEpg([]));
    }
  }, [provider, target]);

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-inner" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          ✕
        </button>
        <Player src={target.url} live={target.live} poster={target.poster} title={target.title} />
        <div className="now-playing">
          <h3>{target.title}</h3>
          {target.live && epg.length > 0 && (
            <ul className="epg">
              {epg.slice(0, 5).map((e, i) => (
                <li key={i} className={i === 0 ? "live-now" : ""}>
                  <span className="epg-time">
                    {fmt(e.start)} – {fmt(e.end)}
                  </span>
                  <span className="epg-title">{decodeB64(e.title)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function fmt(s: string): string {
  // Xtream EPG times come as "YYYY-MM-DD HH:MM:SS".
  const t = s?.split(" ")[1]?.slice(0, 5);
  return t ?? "";
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
              <button key={p.id} onClick={() => { onSwitch(p); setOpen(false); }}>
                Trocar para {p.name}
              </button>
            ))}
          <button onClick={onLogout}>Adicionar / Sair</button>
        </div>
      )}
    </div>
  );
}
