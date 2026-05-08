import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Star, ChevronDown, ChevronLeft, ChevronRight, X, Play } from "lucide-react";
import { InwiseLogo } from "@/components/InwiseLogo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function cleanTitle(t: string): string {
  if (!t) return t;
  return t
    .replace(/\s*(torrent|download|blu-?ray|4k|1080p|720p|legendado|dublado|dual[\s\-]?[áa]udio|hdrip|bdrip|webrip|web-dl|hdtv|remux|hdcam|\bts\b|\bcam\b|nacional)\s*/gi, ' ')
    .replace(/\s*\(\s*(?:19|20)\d{2}\s*\)\s*$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export const Route = createFileRoute("/")({
  validateSearch: (s) => ({ filter: (s.filter as string) || '' }),
  component: Index,
});

const GENRES = ['Ação', 'Animação', 'Aventura', 'Biografia', 'Comédia', 'Crime', 'Documentário', 'Drama', 'Família', 'Fantasia', 'Ficção', 'Guerra', 'Mistério', 'Romance', 'Suspense', 'Terror'];

function CatalogCard({ item }: { item: any }) {
  return (
    <div className="box-border w-1/2 sm:w-1/3 md:w-1/4 lg:w-1/5 xl:w-[14.28%] mb-4 px-[5px]">
      <Link to="/watch/$slug" params={{ slug: item.slug }} className="block group">
        <div className="relative rounded-lg overflow-hidden bg-[#0e1723]" style={{ paddingTop: '150%' }}>
          <img
            src={item.poster || item.backdrop || ''}
            alt={cleanTitle(item.title)}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 w-10 h-10 rounded-full bg-[#00d4ff] flex items-center justify-center shadow-lg">
              <Play className="w-4 h-4 fill-black text-black ml-0.5" />
            </div>
          </div>
          {/* IMDb badge */}
          {item.imdb_rating && (
            <div className="absolute top-1.5 right-1.5 z-10 flex items-center gap-0.5 bg-black/60 rounded px-1.5 py-0.5 backdrop-blur-sm">
              <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
              <span className="text-white text-[10px] font-bold leading-none">{Number(item.imdb_rating).toFixed(1)}</span>
            </div>
          )}
          {/* Year badge */}
          {item.year && (
            <div className="absolute bottom-1.5 left-1.5 z-10">
              <span className="text-white text-[10px] font-bold px-1.5 py-0.5 rounded"
                style={{ background: 'linear-gradient(to bottom, #00b4d8, #0077b6)' }}>
                {item.year}
              </span>
            </div>
          )}
        </div>
        <p className="mt-1.5 text-[#ced4da] text-[11px] leading-tight truncate px-0.5 group-hover:text-white transition-colors">
          {cleanTitle(item.title)}
        </p>
      </Link>
    </div>
  );
}

function Index() {
  const { filter } = Route.useSearch();
  const [titles, setTitles] = useState<any[]>([]);
  const [heroTitles, setHeroTitles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [heroIndex, setHeroIndex] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const searchDebounce = useRef<ReturnType<typeof setTimeout>>();
  const PAGE_SIZE = 56;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch hero titles (landscape backdrops) once on mount
  useEffect(() => {
    async function fetchHero() {
      const { data } = await supabase
        .from('titles')
        .select('id,slug,title,backdrop,poster,year,type,imdb_rating,synopsis')
        .ilike('backdrop', '%slides%')
        .order('year', { ascending: false })
        .limit(9);
      if (data && data.length > 0) setHeroTitles(data);
    }
    fetchHero();
  }, []);

  // Reset titles + page when filter changes
  useEffect(() => {
    setTitles([]);
    setPage(0);
  }, [filter]);

  useEffect(() => {
    async function fetchTitles() {
      setLoading(true);
      try {
        let titleIds: string[] | null = null;

        if (filter.startsWith('genre_')) {
          const genreName = filter.replace('genre_', '');
          const { data: genreRows } = await supabase
            .from('genres')
            .select('id')
            .ilike('name', `${genreName}%`)
            .limit(5);
          const genreIds = genreRows?.map((r: any) => r.id) || [];
          if (genreIds.length > 0) {
            const { data: tgRows } = await supabase
              .from('title_genres')
              .select('title_id')
              .in('genre_id', genreIds);
            const ids = [...new Set(tgRows?.map((r: any) => r.title_id) || [])];
            titleIds = ids;
          } else {
            titleIds = [];
          }
        }

        let q = supabase.from('titles').select('*', { count: 'exact' });

        if (titleIds !== null) {
          if (titleIds.length === 0) { setTitles([]); setTotalCount(0); setLoading(false); return; }
          q = q.in('id', titleIds);
        } else if (filter === 'movie') q = q.eq('type', 'movie');
        else if (filter === 'series') q = q.eq('type', 'series');
        else if (filter === 'anime') q = q.eq('type', 'anime');
        else if (filter === 'top') q = q.not('imdb_rating', 'is', null).order('imdb_rating', { ascending: false });
        else if (filter === '2026') q = q.eq('year', 2026);

        if (filter !== 'top') {
          q = q.order('year', { ascending: false });
          q = q.order('created_at', { ascending: false });
        }
        q = q.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
        const { data, error, count } = await q;
        if (error) throw error;
        if (page === 0) setTitles(data || []);
        else setTitles(prev => [...prev, ...(data || [])]);
        setTotalCount(count || 0);
      } catch (e) {
        console.error("[Home] Fetch Error:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchTitles();
  }, [filter, page]);

  // Search
  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    searchDebounce.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const { data } = await supabase
          .from('titles')
          .select('*')
          .ilike('title', `%${searchQuery}%`)
          .limit(80);
        setSearchResults(data || []);
      } catch (e) {
        console.error('[Search] error:', e);
      } finally {
        setSearchLoading(false);
      }
    }, 350);
    return () => clearTimeout(searchDebounce.current);
  }, [searchQuery]);

  // Hero auto-advance
  const heroCount = heroTitles.length;
  useEffect(() => {
    if (heroCount < 2) return;
    const t = setInterval(() => setHeroIndex(p => (p + 1) % heroCount), 5000);
    return () => clearInterval(t);
  }, [heroCount]);

  const hero = heroTitles[heroIndex] || null;
  const isSearching = searchQuery.length >= 2;
  const catalogTitles = isSearching ? searchResults : titles;

  const navBase = "text-[12px] font-semibold uppercase tracking-[0.06em] transition-colors duration-150 hover:text-white whitespace-nowrap";
  const navActive = `${navBase} text-[#00d4ff]`;
  const navInactive = `${navBase} text-white/60`;

  return (
    <div className="min-h-screen text-white overflow-x-hidden" style={{ backgroundColor: '#0c0c0c' }}>

      {/* ── HEADER ── */}
      <header className={`fixed top-0 left-0 right-0 z-[500000] transition-all duration-300 ${scrolled ? 'bg-[#0c0c0c]/98 shadow-lg' : 'bg-transparent'}`}>
        {!scrolled && (
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.75) 0%, transparent 100%)' }} />
        )}
        <div className="relative px-4 lg:px-8">
          <nav className="flex items-center gap-0 h-[130px] w-full text-white">
            <div className="flex items-center mr-6 flex-shrink-0">
              <Link to="/" search={{ filter: '' }}>
                <InwiseLogo size="sm" />
              </Link>
            </div>

            <ul className="hidden sm:flex items-center gap-5 lg:gap-6 list-none flex-1 overflow-x-auto no-scrollbar">
              <li className="flex-shrink-0">
                <Link to="/" search={{ filter: '' }} className={!filter && !isSearching ? navActive : navInactive}>Início</Link>
              </li>
              <li className="flex-shrink-0">
                <Link to="/" search={{ filter: 'movie' }} className={filter === 'movie' ? navActive : navInactive}>Filmes</Link>
              </li>
              <li className="flex-shrink-0">
                <Link to="/" search={{ filter: 'series' }} className={filter === 'series' ? navActive : navInactive}>Séries</Link>
              </li>
              <li className="flex-shrink-0">
                <Link to="/" search={{ filter: 'anime' }} className={filter === 'anime' ? navActive : navInactive}>Animes</Link>
              </li>
              <li className="flex-shrink-0">
                <DropdownMenu>
                  <DropdownMenuTrigger className={`${navInactive} flex items-center gap-1 outline-none`}>
                    Gênero <ChevronDown className="w-3 h-3" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-[#1a1a1a] border-[#2a2a2a] grid grid-cols-2 w-64 p-2 z-[600000]">
                    {GENRES.map(g => (
                      <DropdownMenuItem key={g} asChild>
                        <Link to="/" search={{ filter: `genre_${g.toLowerCase()}` }}
                          className="text-[11px] font-semibold uppercase tracking-wider hover:bg-[#2a2a2a] focus:bg-[#2a2a2a] cursor-pointer text-zinc-400 hover:text-[#00d4ff] px-2 py-1.5 rounded">
                          {g}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
              <li className="flex-shrink-0">
                <Link to="/" search={{ filter: 'top' }} className={filter === 'top' ? navActive : navInactive}>Top IMDb</Link>
              </li>
              <li className="flex-shrink-0">
                <Link to="/" search={{ filter: '2026' }}
                  className={filter === '2026' ? navActive : `${navInactive} text-[#00d4ff]/70`}>
                  Lançamentos 2026
                </Link>
              </li>
            </ul>

            <div className="ml-auto flex-shrink-0 relative">
              <input
                type="text"
                placeholder="Buscar título..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-white/10 border border-white/15 rounded-full pl-8 pr-8 py-1.5 text-[12px] w-36 sm:w-44 focus:w-56 transition-all outline-none text-white placeholder:text-white/35 focus:border-[#00d4ff]/50 focus:bg-black/40"
              />
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/35" />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                  <X className="w-3.5 h-3.5 text-white/40 hover:text-white" />
                </button>
              )}
            </div>
          </nav>
        </div>
      </header>

      {/* ── HERO ── */}
      {!isSearching && (
        <div className="relative w-full overflow-hidden" style={{ height: '100vh', minHeight: '520px', maxHeight: '860px' }}>

          {/* Background — widescreen landscape image fills full container */}
          {hero ? (
            <img
              key={hero.id}
              src={hero.backdrop}
              alt=""
              className="absolute inset-0 w-full h-full object-cover object-center"
              style={{ filter: 'brightness(0.82)' }}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[#0c0c0c] to-[#1a1a2e]" />
          )}

          {/* Multi-layer gradient overlay */}
          <div className="absolute inset-0 z-[1]" style={{
            background: [
              'linear-gradient(to right, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.5) 45%, rgba(0,0,0,0.1) 70%, transparent 100%)',
              'linear-gradient(to top, rgba(12,12,12,1) 0%, rgba(12,12,12,0.6) 20%, transparent 55%)',
              'linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, transparent 15%)',
            ].join(', '),
          }} />

          {/* Prev/Next arrows */}
          {heroCount > 1 && (
            <>
              <button onClick={() => setHeroIndex(p => (p - 1 + heroCount) % heroCount)}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-[10] w-10 h-10 flex items-center justify-center text-white/40 hover:text-white transition-colors">
                <ChevronLeft className="w-8 h-8" />
              </button>
              <button onClick={() => setHeroIndex(p => (p + 1) % heroCount)}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-[10] w-10 h-10 flex items-center justify-center text-white/40 hover:text-white transition-colors">
                <ChevronRight className="w-8 h-8" />
              </button>
            </>
          )}

          {/* Slide dots */}
          {heroCount > 1 && (
            <div className="absolute bottom-[3.5em] left-1/2 -translate-x-1/2 flex gap-1.5 z-[10]">
              {heroTitles.map((_, i) => (
                <button key={i} onClick={() => setHeroIndex(i)}
                  className={`rounded-full transition-all duration-500 ${i === heroIndex ? 'w-5 h-1.5 bg-[#00d4ff]' : 'w-1.5 h-1.5 bg-white/25 hover:bg-white/50'}`} />
              ))}
            </div>
          )}

          {/* Text content */}
          <div className="absolute z-[5] px-6 lg:px-14" style={{ bottom: '72px', left: 0, maxWidth: '55%' }}>
            {!hero ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-72 bg-white/10 rounded" />
                <Skeleton className="h-4 w-52 bg-white/10 rounded" />
                <Skeleton className="h-16 w-[480px] bg-white/10 rounded" />
                <div className="flex gap-3"><Skeleton className="h-10 w-32 bg-white/10 rounded-full" /><Skeleton className="h-10 w-28 bg-white/10 rounded-full" /></div>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2.5 mb-3 flex-wrap">
                  {hero.imdb_rating && (
                    <div className="flex items-center gap-1 font-bold text-yellow-400 text-sm">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      {Number(hero.imdb_rating).toFixed(1)}
                    </div>
                  )}
                  {hero.year && <span className="text-white/45 text-sm">· {hero.year}</span>}
                  {hero.type && <span className="text-white/45 text-sm capitalize">· {hero.type === 'movie' ? 'Filme' : hero.type === 'series' ? 'Série' : 'Anime'}</span>}
                  {['4K', '1080p', 'Dual Áudio'].map(b => (
                    <span key={b} className="text-white/50 border border-white/15 rounded px-2 py-0.5 text-[11px]">{b}</span>
                  ))}
                </div>

                <h1 className="font-bold text-white mb-4 leading-tight drop-shadow-lg"
                  style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.8rem)', textShadow: '0 2px 12px rgba(0,0,0,0.8)', maxWidth: '560px' }}>
                  {cleanTitle(hero.title)}
                </h1>

                {hero.synopsis && (
                  <p className="text-white/60 mb-6 leading-relaxed text-[13px] max-w-md"
                    style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {hero.synopsis}
                  </p>
                )}

                <div className="flex gap-3 flex-wrap">
                  <Link to="/watch/$slug" params={{ slug: hero.slug }}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold text-[13px] transition-all hover:scale-105 active:scale-95"
                    style={{ background: 'linear-gradient(135deg, #00c8ee, #0080b0)', color: '#fff', boxShadow: '0 0 20px rgba(0,180,216,0.4)' }}>
                    <Play className="w-4 h-4 fill-current" />
                    Assistir
                  </Link>
                  <Link to="/watch/$slug" params={{ slug: hero.slug }}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold text-[13px] border text-white transition-all hover:bg-white/10 active:scale-95"
                    style={{ borderColor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)' }}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Download
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CATALOG ── */}
      <main className="px-4 lg:px-8 pb-20" style={{ paddingTop: isSearching ? '88px' : '0' }}>
        <div className="flex items-center gap-1 flex-wrap" style={{ margin: '1.2em 0 1em' }}>
          <h2 className="font-semibold text-white/80 mr-3" style={{ fontSize: '1.1em' }}>
            {isSearching
              ? searchLoading ? 'Buscando...' : `Resultados: "${searchQuery}" (${searchResults.length})`
              : filter.startsWith('genre_')
              ? `Gênero: ${filter.replace('genre_', '')}`
              : filter === 'movie' ? 'Filmes'
              : filter === 'series' ? 'Séries'
              : filter === 'anime' ? 'Animes'
              : filter === 'top' ? 'Top IMDb'
              : filter === '2026' ? 'Lançamentos 2026'
              : 'Catálogo'}
          </h2>
          {!isSearching && (
            <>
              {[
                { label: 'Todos', val: '' },
                { label: 'Filmes', val: 'movie' },
                { label: 'Séries', val: 'series' },
                { label: 'Animes', val: 'anime' },
              ].map(({ label, val }) => (
                <Link key={val} to="/" search={{ filter: val }}
                  className="inline-flex items-center justify-center rounded-md h-7 px-3 text-[11px] font-semibold uppercase tracking-wide transition-all duration-200 cursor-pointer"
                  style={filter === val
                    ? { background: 'linear-gradient(135deg, #00c8ee, #0080b0)', color: '#fff' }
                    : { background: '#1e1e1e', color: '#aaa' }}>
                  {label}
                </Link>
              ))}
            </>
          )}
          {!isSearching && (
            <span className="ml-auto text-white/30 text-[11px]">
              {totalCount > 0 && `${totalCount.toLocaleString()} títulos`}
            </span>
          )}
        </div>

        {/* Grid */}
        <div className="flex flex-wrap" style={{ margin: '0 -5px' }}>
          {(loading && titles.length === 0) || (isSearching && searchLoading)
            ? Array.from({ length: 14 }).map((_, i) => (
                <div key={i} className="w-1/2 sm:w-1/3 md:w-1/4 lg:w-1/5 xl:w-[14.28%] mb-4 px-[5px]">
                  <div className="rounded-lg overflow-hidden bg-[#161616]" style={{ paddingTop: '150%' }} />
                  <div className="h-2.5 w-3/4 bg-[#1e1e1e] mt-1.5 rounded" />
                </div>
              ))
            : catalogTitles.length > 0
            ? catalogTitles.map(item => <CatalogCard key={item.id} item={item} />)
            : (
              <div className="w-full py-24 text-center text-white/25 text-sm uppercase tracking-widest font-semibold">
                {isSearching ? 'Nenhum resultado encontrado' : 'Nenhum título encontrado'}
              </div>
            )
          }
        </div>

        {/* Load More */}
        {!loading && !isSearching && catalogTitles.length > 0 && catalogTitles.length < totalCount && (
          <div className="flex justify-center mt-10">
            <button onClick={() => setPage(p => p + 1)}
              className="px-8 py-3 rounded-full text-[12px] font-bold uppercase tracking-wider transition-all hover:scale-105 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #00c8ee, #0080b0)', color: '#fff', boxShadow: '0 0 16px rgba(0,180,216,0.3)' }}>
              Carregar Mais ({(totalCount - catalogTitles.length).toLocaleString()} restantes)
            </button>
          </div>
        )}

        {loading && titles.length > 0 && (
          <div className="flex justify-center mt-8">
            <div className="w-7 h-7 border-2 border-[#00d4ff] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </main>

      {/* ── FOOTER ── */}
      <footer className="border-t px-4 lg:px-8 py-10" style={{ borderColor: '#1e1e1e', backgroundColor: '#0c0c0c' }}>
        <div className="flex flex-col md:flex-row justify-between gap-8 mb-8">
          <div>
            <InwiseLogo size="md" className="mb-3" />
            <p className="text-white/30 text-[12px] leading-relaxed max-w-xs">O melhor catálogo com qualidade 4K, Dual Áudio e legendas PT-BR.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-8 text-[12px]">
            <div>
              <h4 className="font-bold uppercase tracking-widest text-[10px] mb-4 text-white/25">Catálogo</h4>
              <ul className="space-y-2 text-white/40">
                <li><Link to="/" search={{ filter: 'movie' }} className="hover:text-[#00d4ff] transition-colors">Filmes</Link></li>
                <li><Link to="/" search={{ filter: 'series' }} className="hover:text-[#00d4ff] transition-colors">Séries</Link></li>
                <li><Link to="/" search={{ filter: 'top' }} className="hover:text-[#00d4ff] transition-colors">Top IMDb</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold uppercase tracking-widest text-[10px] mb-4 text-white/25">Admin</h4>
              <ul className="space-y-2 text-white/40">
                <li><Link to="/admin" className="hover:text-[#00d4ff] transition-colors">Painel</Link></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="pt-5 border-t flex justify-between items-center" style={{ borderColor: '#1e1e1e' }}>
          <p className="text-[9px] font-bold text-white/20 uppercase tracking-[0.3em]">© 2026 INWISE MOVIES</p>
        </div>
      </footer>
    </div>
  );
}
