import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Star, ChevronDown, ChevronLeft, ChevronRight, X } from "lucide-react";
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

const MOCK_TITLES: any[] = [
  { id: 'mock-1', title: 'Avatar: Fogo e Cinzas', slug: 'avatar-fogo-cinzas', backdrop: 'https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?q=80&w=1600', poster: 'https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?q=80&w=600', imdb_rating: 7.2, year: 2025, type: 'movie', synopsis: 'A devastadora guerra contra a RDA e a perda de seu filho mais velho, Jake Sully e Neytiri enfrentam uma nova ameaça em Pandora.' },
  { id: 'mock-2', title: 'Origem 4ª Temporada', slug: 'origem-4-temporada', backdrop: 'https://images.unsplash.com/photo-1506466010722-395aa2bef877?q=80&w=1600', poster: 'https://images.unsplash.com/photo-1506466010722-395aa2bef877?q=80&w=600', imdb_rating: 7.8, year: 2026, type: 'series', synopsis: 'A quarta temporada da série de sucesso.' },
  { id: 'mock-3', title: 'Socorro!', slug: 'socorro-2026', backdrop: 'https://images.unsplash.com/photo-1535016120720-40c646be5580?q=80&w=1600', poster: 'https://images.unsplash.com/photo-1535016120720-40c646be5580?q=80&w=600', imdb_rating: 6.8, year: 2026, type: 'movie', synopsis: 'Um thriller de ação que vai te prender do início ao fim.' },
  { id: 'mock-4', title: 'A Fortuna de Escobar', slug: 'fortuna-escobar', backdrop: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1600', poster: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=600', imdb_rating: 7.5, year: 2025, type: 'movie', synopsis: 'A busca pelo tesouro oculto do maior narcotraficante da história.' },
  { id: 'mock-5', title: 'Turbulência', slug: 'turbulencia', backdrop: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1600', poster: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=600', imdb_rating: 6.5, year: 2026, type: 'movie', synopsis: 'Uma viagem de avião que ninguém vai esquecer.' },
  { id: 'mock-6', title: 'Meu Querido Assassino', slug: 'meu-querido-assassino', backdrop: 'https://images.unsplash.com/photo-1599728611361-9f9392211463?q=80&w=1600', poster: 'https://images.unsplash.com/photo-1599728611361-9f9392211463?q=80&w=600', imdb_rating: 7.1, year: 2026, type: 'series', synopsis: 'Uma série de suspense sobre amor e perigo.' },
  { id: 'mock-7', title: 'Georgie e Mandy', slug: 'georgie-mandy-2', backdrop: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=1600', poster: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=600', imdb_rating: 7.0, year: 2025, type: 'series', synopsis: 'Continuação das aventuras de Georgie e Mandy.' },
];

const GENRES = ['Ação', 'Animação', 'Comédia', 'Documentário', 'Drama', 'Ficção Científica', 'Guerra', 'Musical', 'Mistério', 'Policial', 'Romance', 'Terror', 'Western', 'Biografia'];

function CatalogCard({ item }: { item: any }) {
  return (
    <div className="box-border w-[calc(100%/2)] sm:w-[calc(100%/3)] md:w-[calc(100%/5)] lg:w-[calc(100%/7)] mb-4 px-[5px]">
      <div className="relative overflow-hidden rounded-[15px] p-[3%] bg-[#0e1723]">
        <Link to="/watch/$slug" params={{ slug: item.slug }} title={cleanTitle(item.title)}>
          <div className="relative rounded-[8px] overflow-hidden" style={{ paddingTop: '150%' }}>
            <img
              src={item.poster || item.backdrop || 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=300'}
              alt={cleanTitle(item.title)}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 hover:scale-105"
            />
            {item.imdb_rating && (
              <div className="absolute top-[5px] right-[5px] z-10 text-white bg-black/50 rounded-[10px] px-[5px] py-[1px] font-bold text-[0.85em] leading-[1.7em]"
                style={{ fontFamily: 'Roobert,Arial,Helvetica,sans-serif', filter: 'drop-shadow(0px 0px 6px #0e1723f5)' }}>
                {Number(item.imdb_rating).toFixed(1)}
              </div>
            )}
          </div>
        </Link>
        <h3 className="mt-2">
          <Link to="/watch/$slug" params={{ slug: item.slug }}
            className="block text-[#efe9e9] text-[0.85em] leading-tight truncate hover:text-white transition-colors">
            {cleanTitle(item.title)}
          </Link>
        </h3>
        <div className="flex items-center gap-1 mt-1 flex-wrap">
          {item.year && (
            <span className="inline-block font-medium uppercase rounded px-[5px] leading-none py-[5px] text-[0.75em] text-white"
              style={{ backgroundImage: 'linear-gradient(to bottom, #00b4d8, #0077b6)' }}>
              {item.year}
            </span>
          )}
          <span className="inline-block text-white/65 border border-white/35 rounded px-[5px] leading-none py-[5px] text-[0.72em] uppercase">
            Dual Áudio
          </span>
        </div>
      </div>
    </div>
  );
}

function Index() {
  const { filter } = Route.useSearch();
  const [titles, setTitles] = useState<any[]>([]);
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

        // Genre filter: resolve title IDs via title_genres join
        if (filter.startsWith('genre_')) {
          const genreName = filter.replace('genre_', '');
          const { data: genreRows } = await supabase
            .from('genres')
            .select('id')
            .ilike('name', genreName)
            .limit(1);
          const genreId = genreRows?.[0]?.id;
          if (genreId) {
            const { data: tgRows } = await supabase
              .from('title_genres')
              .select('title_id')
              .eq('genre_id', genreId);
            titleIds = tgRows?.map((r: any) => r.title_id) || [];
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
        else if (filter === 'top') q = q.order('imdb_rating', { ascending: false });
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

  // Search: debounced Supabase ilike query
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

  const displayTitles = (titles.length > 0 || loading) ? titles : MOCK_TITLES;

  useEffect(() => {
    if (displayTitles.length > 0) {
      const timer = setInterval(() => {
        setHeroIndex(prev => (prev + 1) % Math.min(displayTitles.length, 8));
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [displayTitles.length]);

  const hero = displayTitles[heroIndex] || (loading ? null : MOCK_TITLES[0]);
  const heroCount = Math.min(displayTitles.length, 8);
  const isSearching = searchQuery.length >= 2;
  const catalogTitles = isSearching ? searchResults : displayTitles;

  const navBase = "text-[13px] font-semibold uppercase tracking-[0.05em] transition-colors duration-150 hover:text-white whitespace-nowrap";
  const navActive = `${navBase} text-[#00d4ff]`;
  const navInactive = `${navBase} text-white/70`;

  return (
    <div className="min-h-screen text-white overflow-x-hidden" style={{ backgroundColor: '#020916' }}>

      {/* ── HEADER ── */}
      <header className={`fixed top-0 left-0 right-0 z-[500000] transition-all duration-300 ${scrolled ? 'bg-[#020916]/95 backdrop-blur-sm shadow-lg' : 'bg-transparent'}`}>
        {/* Always-visible dark gradient at top so nav text readable over any hero image */}
        {!scrolled && (
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(to bottom, rgba(2,9,22,0.85) 0%, transparent 100%)' }} />
        )}
        <div className="relative px-4 lg:px-8">
          <nav className="flex items-center gap-0 h-[72px] w-full text-white">
            {/* Logo */}
            <div className="flex items-center mr-5 flex-shrink-0">
              <Link to="/" search={{ filter: '' }}>
                <InwiseLogo size="sm" />
              </Link>
            </div>

            {/* Nav links — visible from sm */}
            <ul className="hidden sm:flex items-center gap-4 lg:gap-5 list-none mx-4 flex-1 overflow-x-auto no-scrollbar">
              <li className="flex items-center gap-1 flex-shrink-0">
                <svg height="16px" viewBox="0 0 24 24" width="16px" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
                  <path d="M5 10v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V10" /><path d="M9 21a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1" /><path d="m3 12 2-2 7-7 7 7 2 2" />
                </svg>
                <Link to="/" search={{ filter: '' }} className={!filter && !isSearching ? navActive : navInactive}>Início</Link>
              </li>
              <li className="flex-shrink-0">
                <DropdownMenu>
                  <DropdownMenuTrigger className={`${navInactive} flex items-center gap-1 outline-none`}>
                    Gênero <ChevronDown className="w-3 h-3" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-[#0e1723] border-[#1e2a3a] grid grid-cols-2 w-64 p-2 z-[600000]">
                    {GENRES.map(g => (
                      <DropdownMenuItem key={g} asChild>
                        <Link to="/" search={{ filter: `genre_${g.toLowerCase()}` }}
                          className="text-[11px] font-semibold uppercase tracking-wider hover:bg-[#1a2535] focus:bg-[#1a2535] cursor-pointer text-zinc-400 hover:text-[#00d4ff] px-2 py-1.5 rounded">
                          {g}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
              <li className="flex-shrink-0">
                <Link to="/" search={{ filter: 'movie' }} className={filter === 'movie' ? navActive : navInactive}>Filmes</Link>
              </li>
              <li className="flex-shrink-0">
                <Link to="/" search={{ filter: 'series' }} className={filter === 'series' ? navActive : navInactive}>Séries</Link>
              </li>
              <li className="flex-shrink-0">
                <Link to="/" search={{ filter: 'top' }} className={filter === 'top' ? navActive : navInactive}>Top IMDb</Link>
              </li>
              <li className="flex-shrink-0">
                <Link to="/" search={{ filter: '2026' }}
                  className={filter === '2026' ? navActive : `${navInactive} text-[#00d4ff]/80`}>
                  Lançamentos 2026
                </Link>
              </li>
            </ul>

            {/* Search */}
            <div className="ml-auto flex-shrink-0 relative">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="bg-[#0e1723]/80 border border-[#1e2a3a] rounded-full pl-8 pr-8 py-1.5 text-[12px] w-36 sm:w-44 focus:w-56 transition-all outline-none text-white placeholder:text-[#565c67] focus:border-[#00d4ff]/40"
                />
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#565c67]" />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                    <X className="w-3.5 h-3.5 text-[#565c67] hover:text-white" />
                  </button>
                )}
              </div>
            </div>
          </nav>
        </div>
      </header>

      {/* ── HERO ── */}
      {!isSearching && (
        <div className="relative w-full overflow-hidden" style={{ height: '100vh', minHeight: '500px', maxHeight: '820px' }}>

          {/* Background — poster/backdrop fills full container */}
          {hero && (
            <img
              src={hero.backdrop || hero.poster || ''}
              alt=""
              className="absolute inset-0 w-full h-full object-cover object-top"
              style={{ filter: 'brightness(0.75)' }}
            />
          )}
          {loading && !hero && <div className="absolute inset-0 bg-[#010510]" />}

          {/* Overlay: dark left + dark bottom, lighter in center-right */}
          <div className="absolute inset-0 z-[1]" style={{
            background: 'linear-gradient(to right, rgba(2,9,22,0.92) 0%, rgba(2,9,22,0.55) 50%, rgba(2,9,22,0.3) 100%), linear-gradient(to top, #020916 0%, transparent 38%)',
          }} />

          {/* Prev/Next arrows */}
          {!loading && displayTitles.length > 1 && (
            <>
              <button onClick={() => setHeroIndex(prev => (prev - 1 + heroCount) % heroCount)}
                className="absolute left-3 top-[45%] -translate-y-1/2 z-[10] w-9 h-9 flex items-center justify-center text-white/50 hover:text-[#00d4ff] transition-all"
                aria-label="Anterior">
                <ChevronLeft className="w-full h-full" />
              </button>
              <button onClick={() => setHeroIndex(prev => (prev + 1) % heroCount)}
                className="absolute right-3 top-[45%] -translate-y-1/2 z-[10] w-9 h-9 flex items-center justify-center text-white/50 hover:text-[#00d4ff] transition-all"
                aria-label="Próximo">
                <ChevronRight className="w-full h-full" />
              </button>
            </>
          )}

          {/* Slide dots */}
          {!loading && displayTitles.length > 1 && (
            <div className="absolute bottom-[3em] left-1/2 -translate-x-1/2 flex gap-1.5 z-[10]">
              {displayTitles.slice(0, heroCount).map((_, i) => (
                <button key={i} onClick={() => setHeroIndex(i)}
                  className={`rounded-full transition-all duration-500 ${heroIndex === i ? 'w-5 h-1 bg-[#00d4ff]' : 'w-1 h-1 bg-white/30 hover:bg-white/60'}`} />
              ))}
            </div>
          )}

          {/* Text content — left */}
          <div className="absolute z-[5] px-4 lg:px-10" style={{ bottom: '40px', left: 0, maxWidth: '60%' }}>
            {loading || !hero ? (
              <div className="space-y-3 pt-20">
                <Skeleton className="h-10 w-72 bg-white/10 rounded" />
                <Skeleton className="h-3 w-40 bg-white/10 rounded" />
                <Skeleton className="h-14 w-[500px] bg-white/10 rounded" />
                <div className="flex gap-3"><Skeleton className="h-9 w-28 bg-white/10 rounded-full" /><Skeleton className="h-9 w-24 bg-white/10 rounded-full" /></div>
              </div>
            ) : (
              <div>
                {/* Badges */}
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  {hero.imdb_rating && (
                    <div className="flex items-center gap-1 font-bold text-yellow-400 text-sm">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      {Number(hero.imdb_rating).toFixed(1)}
                    </div>
                  )}
                  {hero.year && <span className="text-white/50 text-sm">· {hero.year}</span>}
                  {hero.type && <span className="text-white/50 text-sm capitalize">· {hero.type === 'movie' ? 'Filme' : hero.type === 'series' ? 'Série' : 'Anime'}</span>}
                  {['4K', '1080p', 'Dual Áudio'].map(b => (
                    <span key={b} className="text-white/55 border border-white/20 rounded px-2 py-0.5 text-[11px]">{b}</span>
                  ))}
                </div>

                {/* Title */}
                <h1 className="font-semibold text-white mb-3 leading-tight"
                  style={{ fontSize: '1.9em', textShadow: '0 2px 8px rgba(2,9,22,0.9)', maxWidth: '600px' }}>
                  {cleanTitle(hero.title)}
                </h1>

                {/* Synopsis */}
                {hero.synopsis && (
                  <p className="text-white/65 mb-5 leading-relaxed text-sm max-w-md"
                    style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {hero.synopsis}
                  </p>
                )}

                {/* Buttons */}
                <div className="flex gap-3 flex-wrap">
                  <Link to="/watch/$slug" params={{ slug: hero.slug }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm transition-all hover:scale-105"
                    style={{ background: 'linear-gradient(to bottom, #00c8ee, #0090b8)', color: '#fff', boxShadow: '0 0 12px rgba(0,180,216,0.35)' }}>
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    Assistir
                  </Link>
                  <Link to="/watch/$slug" params={{ slug: hero.slug }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm border text-white transition-all hover:bg-white/10"
                    style={{ border: '1px solid rgba(255,255,255,0.25)', backdropFilter: 'blur(4px)' }}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                    Download
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── SEO ── */}
      {!isSearching && (
        <div className="px-4 lg:px-8 py-3 text-center">
          <p className="text-[#9197a5] text-[0.78em] leading-relaxed max-w-4xl mx-auto">
            INWISE Movies — Filmes e séries em alta qualidade. 4K HDR, BluRay 1080p, 720p. O melhor catálogo com conteúdo constantemente atualizado.
          </p>
        </div>
      )}

      {/* ── CATALOG ── */}
      <main className="px-4 lg:px-8 pb-20" style={{ paddingTop: isSearching ? '88px' : '0' }}>
        {/* Heading + filter tabs */}
        <div className="mb-4" style={{ margin: '0.8em 0' }}>
          <h2 className="inline-block align-middle font-normal text-white/90 leading-none mr-3"
            style={{ fontSize: '1.5em', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
            {isSearching
              ? searchLoading ? 'Buscando...' : `Resultados: "${searchQuery}" (${searchResults.length})`
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
                  className={`inline-flex items-center justify-center rounded h-[2em] px-4 mx-[4px] text-[0.75em] font-medium transition-all duration-200 cursor-pointer ${filter === val ? 'text-white' : 'text-[#abb3ba] bg-[#212529] hover:text-white'}`}
                  style={filter === val ? { background: 'linear-gradient(to bottom, #00c8ee, #0090b8)' } : {}}>
                  {label}
                </Link>
              ))}
            </>
          )}
        </div>

        {/* Grid */}
        <div className="flex flex-wrap" style={{ margin: '0 -5px', marginTop: '1em' }}>
          {(loading && titles.length === 0) || (isSearching && searchLoading)
            ? Array.from({ length: 14 }).map((_, i) => (
                <div key={i} className="w-[calc(100%/2)] sm:w-[calc(100%/3)] md:w-[calc(100%/5)] lg:w-[calc(100%/7)] mb-4 px-[5px]">
                  <div className="rounded-[15px] overflow-hidden p-[3%] bg-[#0e1723]">
                    <div className="w-full bg-[#1a2535] rounded-[8px]" style={{ paddingTop: '150%' }} />
                    <div className="h-3 w-3/4 bg-[#1a2535] mt-2 rounded" />
                    <div className="h-2 w-1/2 bg-[#1a2535] mt-1 rounded" />
                  </div>
                </div>
              ))
            : catalogTitles.length > 0
            ? catalogTitles.map(item => <CatalogCard key={item.id} item={item} />)
            : (
              <div className="w-full py-20 text-center text-[#565c67] text-sm uppercase tracking-widest font-semibold">
                {isSearching ? 'Nenhum resultado encontrado' : 'Nenhum título encontrado'}
              </div>
            )
          }
        </div>

        {/* Load More */}
        {!loading && !isSearching && catalogTitles.length < totalCount && (
          <div className="flex justify-center mt-8">
            <button onClick={() => setPage(p => p + 1)}
              className="px-8 py-3 rounded-full text-sm font-semibold uppercase tracking-wider transition-all hover:scale-105"
              style={{ background: 'linear-gradient(to bottom, #00c8ee, #0090b8)', color: '#fff' }}>
              Carregar Mais ({totalCount - catalogTitles.length} restantes)
            </button>
          </div>
        )}

        {loading && titles.length > 0 && (
          <div className="flex justify-center mt-8">
            <div className="w-8 h-8 border-2 border-[#00d4ff] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </main>

      {/* ── FOOTER ── */}
      <footer className="border-t px-4 lg:px-8 py-10" style={{ borderColor: '#0e1723', backgroundColor: '#020916' }}>
        <div className="flex flex-col md:flex-row justify-between gap-8 mb-8">
          <div>
            <InwiseLogo size="md" className="mb-3" />
            <p className="text-[#565c67] text-sm leading-relaxed max-w-xs">O melhor catálogo com qualidade 4K, Dual Áudio e legendas PT-BR.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-8 text-sm">
            <div>
              <h4 className="font-semibold uppercase tracking-widest text-[10px] mb-4 text-[#9197a5]">Catálogo</h4>
              <ul className="space-y-2 text-[#565c67]">
                <li><Link to="/" search={{ filter: 'movie' }} className="hover:text-[#00d4ff] transition-colors">Filmes</Link></li>
                <li><Link to="/" search={{ filter: 'series' }} className="hover:text-[#00d4ff] transition-colors">Séries</Link></li>
                <li><Link to="/" search={{ filter: 'anime' }} className="hover:text-[#00d4ff] transition-colors">Animes</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold uppercase tracking-widest text-[10px] mb-4 text-[#9197a5]">Admin</h4>
              <ul className="space-y-2 text-[#565c67]">
                <li><Link to="/admin" className="text-[#00d4ff] hover:text-white transition-colors">Painel</Link></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="pt-5 border-t flex justify-between items-center" style={{ borderColor: '#0e1723' }}>
          <p className="text-[9px] font-semibold text-[#565c67] uppercase tracking-[0.3em]">© 2026 INWISE MOVIES</p>
        </div>
      </footer>
    </div>
  );
}
