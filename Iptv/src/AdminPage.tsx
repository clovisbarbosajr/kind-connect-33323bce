import { useEffect, useMemo, useState, useCallback } from "react";
import {
  xtream,
  liveUrl,
  movieUrl,
  seriesEpisodeUrl,
  type Provider,
  type Category,
  type LiveStream,
  type VodStream,
  type Series,
} from "./lib/xtream";
import { store, uid } from "./lib/store";
import { Player } from "./components/Player";
import { getNowPlaying, setNowPlaying, adminKey, type NowPlaying } from "./lib/broadcast";

/* ============================ ADMIN ============================ */

export function AdminApp() {
  const [unlocked, setUnlocked] = useState(false);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    setUnlocked(!!adminKey.get());
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
  if (!unlocked) return <AdminGate onUnlock={() => setUnlocked(true)} />;
  if (!provider) return <Login providers={providers} onLogin={onLogin} onPickExisting={onLogin} />;
  return <AdminDashboard provider={provider} providers={providers} onLogout={onLogout} onSwitch={onLogin} />;
}

function AdminGate({ onUnlock }: { onUnlock: () => void }) {
  const [key, setKey] = useState("");
  return (
    <div className="login">
      <div className="login-card">
        <h1>
          <span className="logo-dot" /> Painel Admin
        </h1>
        <p className="muted">Acesso restrito. Digite a chave de administrador.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            adminKey.set(key.trim());
            onUnlock();
          }}
        >
          <input type="password" placeholder="Chave de admin" value={key} onChange={(e) => setKey(e.target.value)} autoFocus />
          <button className="primary">Entrar</button>
        </form>
        <p className="muted small">
          Definida na variável de ambiente <code>ADMIN_KEY</code> do deploy (em dev: "admin").
        </p>
      </div>
    </div>
  );
}

/* ----------------------------- Login (IPTV) ----------------------------- */

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
      name: name.trim() || safeHost(host),
      host: host.trim().replace(/\/+$/, ""),
      username: username.trim(),
      password: password.trim(),
    };
    try {
      const auth = await xtream.auth(p);
      if (!auth?.user_info || auth.user_info.auth === 0) throw new Error("Usuário ou senha inválidos.");
      onLogin(p);
    } catch (e: any) {
      setErr(
        e?.message === "UNAUTHORIZED"
          ? "Chave de admin rejeitada pelo servidor."
          : e?.message ?? "Falha ao conectar. Verifique a URL/credenciais.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <div className="login-card">
        <h1>
          <span className="logo-dot" /> Conectar provedor
        </h1>
        <p className="muted">Xtream Codes. O vídeo vai direto do provedor para o espectador — sem restream.</p>

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
          <input placeholder="URL do servidor — http://servidor.com:8080" value={host} onChange={(e) => setHost(e.target.value)} required />
          <input placeholder="Usuário" value={username} onChange={(e) => setUsername(e.target.value)} required />
          <input placeholder="Senha" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {err && <div className="err">{err}</div>}
          <button className="primary" disabled={busy}>
            {busy ? "Conectando…" : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}

function safeHost(h: string): string {
  try {
    return new URL(h).hostname;
  } catch {
    return "Provedor";
  }
}

/* --------------------------- Admin Dashboard --------------------------- */

type Tab = "live" | "movies" | "series" | "favorites";

function AdminDashboard({
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
  const [seriesView, setSeriesView] = useState<Series | null>(null);

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
    const ok = await setNowPlaying(np);
    if (ok) {
      setOnAir(np);
      setFlash(`No ar: ${np.title}`);
      setTimeout(() => setFlash(null), 2500);
    } else {
      setFlash("Falha ao transmitir (chave de admin?).");
      setTimeout(() => setFlash(null), 3000);
    }
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
                setSearch("");
              }}
            >
              {t === "live" ? "Ao Vivo" : t === "movies" ? "Filmes" : t === "series" ? "Séries" : "★ Favoritos"}
            </button>
          ))}
        </nav>
        <div className="topbar-right">
          <input className="search" placeholder="Buscar…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <ProfileMenu provider={provider} providers={providers} onSwitch={onSwitch} onLogout={onLogout} />
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
              <button key={c.category_id} className={activeCat === c.category_id ? "active" : ""} onClick={() => setActiveCat(c.category_id)}>
                {c.category_name}
              </button>
            ))}
          </aside>
        )}

        <main className="content">
          {loading && <div className="grid-msg">Carregando…</div>}
          {!loading && filtered.length === 0 && <div className="grid-msg">Nada encontrado.</div>}

          {!loading && (tab === "live" || tab === "favorites") && (
            <div className="grid live-grid">
              {filtered.map((s: LiveStream) => (
                <LiveCard
                  key={s.stream_id}
                  s={s}
                  fav={favorites.has(s.stream_id)}
                  onAir={onAir?.url === liveUrl(provider, s.stream_id)}
                  onBroadcast={() => airLive(s)}
                  onFav={() => toggleFav(s.stream_id)}
                />
              ))}
            </div>
          )}

          {!loading && tab === "movies" && (
            <div className="grid poster-grid">
              {filtered.map((s: VodStream) => (
                <PosterCard key={s.stream_id} title={s.name} img={s.stream_icon || s.cover} onClick={() => airMovie(s)} actionLabel="Transmitir" />
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
