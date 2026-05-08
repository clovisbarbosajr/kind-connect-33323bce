import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Search, Star, ChevronDown, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TitleRow } from "@/components/TitleRow";
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
  {
    id: 'mock-1',
    title: 'Deadpool & Wolverine',
    slug: 'deadpool-wolverine',
    backdrop: 'https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?q=80&w=1600',
    poster: 'https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?q=80&w=600',
    imdb_rating: 8.2, year: 2024, type: 'movie',
    synopsis: 'Um herói irresponsável e um mutante rabugento unem forças para salvar o multiverso.'
  },
  {
    id: 'mock-2',
    title: 'Duna: Parte Dois',
    slug: 'duna-parte-2',
    backdrop: 'https://images.unsplash.com/photo-1506466010722-395aa2bef877?q=80&w=1600',
    poster: 'https://images.unsplash.com/photo-1506466010722-395aa2bef877?q=80&w=600',
    imdb_rating: 8.8, year: 2024, type: 'movie',
    synopsis: 'Paul Atreides se une a Chani e aos Fremen em uma guerra de vingança.'
  },
  {
    id: 'mock-3',
    title: 'House of the Dragon',
    slug: 'house-of-the-dragon',
    backdrop: 'https://images.unsplash.com/photo-1599728611361-9f9392211463?q=80&w=1600',
    poster: 'https://images.unsplash.com/photo-1599728611361-9f9392211463?q=80&w=600',
    imdb_rating: 8.5, year: 2024, type: 'series',
    synopsis: 'A história da família Targaryen duzentos anos antes dos eventos de Game of Thrones.'
  },
  {
    id: 'mock-4',
    title: 'Furiosa: Uma Saga Mad Max',
    slug: 'furiosa',
    backdrop: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1600',
    poster: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=600',
    imdb_rating: 7.9, year: 2024, type: 'movie',
    synopsis: 'A jovem Furiosa é sequestrada de seu lar e deve sobreviver a grandes provações.'
  },
  {
    id: 'mock-5',
    title: 'Solo Leveling',
    slug: 'solo-leveling',
    backdrop: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1600',
    poster: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=600',
    imdb_rating: 8.4, year: 2024, type: 'series',
    synopsis: 'O caçador mais fraco recebe uma chance única de subir de nível sem limites.'
  }
];

const GENRES = ['Ação', 'Animação', 'Comédia', 'Documentário', 'Drama', 'Ficção Científica', 'Guerra', 'Musical', 'Mistério', 'Policial', 'Romance', 'Terror', 'Western', 'Biografia'];

function Index() {
  const { filter } = Route.useSearch();
  const [titles, setTitles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [heroIndex, setHeroIndex] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterGenre, setFilterGenre] = useState<string | null>(null);
  const [filteredByGenre, setFilteredByGenre] = useState<any[]>([]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    async function fetchTitles() {
      try {
        const { data, error } = await supabase
          .from('titles')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(80);
        if (error) throw error;
        setTitles(data || []);
      } catch (e) {
        console.error("[Home] Fetch Error:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchTitles();
  }, []);

  useEffect(() => {
    if (!filterGenre) {
      setFilteredByGenre([]);
      return;
    }
    async function fetchByGenre() {
      try {
        const { data, error } = await supabase
          .from('titles')
          .select('*, title_genres!inner(genre_id, genres!inner(name))')
          .eq('title_genres.genres.name', filterGenre);
        if (error) throw error;
        setFilteredByGenre(data || []);
      } catch (e) {
        console.error("[Home] Genre Fetch Error:", e);
        setFilteredByGenre([]);
      }
    }
    fetchByGenre();
  }, [filterGenre]);

  const displayTitles = (titles.length > 0 || loading) ? titles : MOCK_TITLES;

  useEffect(() => {
    if (displayTitles.length > 0) {
      const timer = setInterval(() => {
        setHeroIndex(prev => (prev + 1) % Math.min(displayTitles.length, 6));
      }, 8000);
      return () => clearInterval(timer);
    }
  }, [displayTitles]);

  const hero = displayTitles[heroIndex] || (loading ? null : MOCK_TITLES[0]);
  const movies   = displayTitles.filter(t => t.type === 'movie');
  const series   = displayTitles.filter(t => t.type === 'series');
  const animes   = displayTitles.filter(t => t.type === 'anime');
  const topRated = [...displayTitles].sort((a, b) => (Number(b.imdb_rating) || 0) - (Number(a.imdb_rating) || 0));

  const searchResults = searchQuery.length > 1
    ? displayTitles.filter(t => cleanTitle(t.title || '')?.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  const getFilteredTitles = () => {
    if (filter === 'movie') return displayTitles.filter(t => t.type === 'movie');
    if (filter === 'series') return displayTitles.filter(t => t.type === 'series');
    if (filter === 'anime') return displayTitles.filter(t => t.type === 'anime');
    if (filter === 'top') return topRated;
    if (filter === '2026') return displayTitles.filter(t => t.year === 2026 || t.year === '2026');
    return displayTitles;
  };

  const filteredTitles = getFilteredTitles();

  const navLinkBase = "transition-colors text-[11px] font-black uppercase tracking-widest";
  const navActive = `${navLinkBase} text-[#00d4ff] border-b border-[#00d4ff]`;
  const navInactive = `${navLinkBase} text-zinc-300 hover:text-white`;

  return (
    <div className="min-h-screen bg-black text-white selection:bg-primary selection:text-black no-scrollbar overflow-x-hidden">
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 px-6 lg:px-12 py-3 flex items-center justify-between ${scrolled ? 'bg-zinc-950/95 shadow-2xl' : 'bg-gradient-to-b from-black/80 to-transparent'}`}>
        <div className="flex items-center gap-8">
          <Link to="/" search={{ filter: '' }}>
            <InwiseLogo size="md" />
          </Link>
          <div className="hidden lg:flex items-center gap-5 text-zinc-300">
            <Link
              to="/"
              search={{ filter: '' }}
              className={!filter && !searchQuery ? navActive : navInactive}
            >
              INÍCIO
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger className={`${navInactive} flex items-center gap-1 outline-none`}>
                GÊNEROS <ChevronDown className="w-3 h-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-zinc-950/95 border-zinc-800 grid grid-cols-2 w-64 p-2 backdrop-blur-xl">
                {GENRES.map(g => (
                  <DropdownMenuItem
                    key={g}
                    onClick={() => { setFilterGenre(g); setSearchQuery(""); }}
                    className={`text-[10px] font-bold uppercase tracking-wider hover:bg-zinc-900 focus:bg-zinc-900 cursor-pointer ${filterGenre === g ? 'text-[#00d4ff]' : 'text-zinc-400 hover:text-primary'}`}
                  >
                    {g}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Link
              to="/"
              search={{ filter: 'movie' }}
              className={filter === 'movie' ? navActive : navInactive}
            >
              FILMES
            </Link>
            <Link
              to="/"
              search={{ filter: 'series' }}
              className={filter === 'series' ? navActive : navInactive}
            >
              SÉRIES
            </Link>
            <Link
              to="/"
              search={{ filter: 'anime' }}
              className={filter === 'anime' ? navActive : navInactive}
            >
              ANIMES
            </Link>
            <Link
              to="/"
              search={{ filter: 'top' }}
              className={filter === 'top' ? navActive : navInactive}
            >
              TOP IMDB
            </Link>
            <Link
              to="/"
              search={{ filter: '2026' }}
              className={filter === '2026' ? navActive : `${navInactive} text-[#00d4ff] drop-shadow-[0_0_10px_rgba(0,212,255,0.3)]`}
            >
              LANÇAMENTOS 2026
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-5">
          <div className="relative group hidden sm:block">
            <input
              type="text"
              placeholder="Buscar filmes, séries..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); }}
              className="bg-zinc-900/60 border border-zinc-800/60 rounded-full pl-10 pr-4 py-2 text-[10px] font-bold uppercase tracking-widest w-48 focus:w-72 transition-all focus:border-primary/50 outline-none text-white placeholder:text-zinc-600"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-primary transition-colors" />
          </div>
        </div>
      </nav>

      <header className="group relative h-[70vh] md:h-[80vh] w-full overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div key={hero?.id || 'skeleton'} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.5 }} className="absolute inset-0">
            {loading || !hero ? (
              <div className="w-full h-full bg-zinc-950">
                <div className="w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(0,212,255,0.05),transparent_50%)]" />
              </div>
            ) : (
              <>
                <img src={hero.poster || hero.backdrop} className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl opacity-30" alt="" aria-hidden />
                <img src={hero.poster || hero.backdrop} className="absolute right-0 top-0 h-full w-auto object-contain z-0 opacity-80" style={{ maskImage: 'linear-gradient(to left, black 60%, transparent 100%)' }} alt={cleanTitle(hero.title)} />
              </>
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent z-10" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/20 z-10" />
          </motion.div>
        </AnimatePresence>

        <div className="absolute bottom-[15%] left-6 lg:left-12 z-20 max-w-2xl">
          {loading || !hero ? (
            <div className="space-y-4">
              <Skeleton className="h-5 w-40 bg-zinc-800/50 rounded-full" />
              <Skeleton className="h-14 w-[75%] bg-zinc-800/50 rounded-xl" />
              <Skeleton className="h-4 w-[50%] bg-zinc-800/50 rounded-full" />
              <div className="flex gap-3 pt-3">
                <Skeleton className="h-10 w-36 bg-zinc-800/50 rounded-full" />
                <Skeleton className="h-10 w-32 bg-zinc-800/50 rounded-full" />
              </div>
            </div>
          ) : (
            <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3, duration: 0.8 }}>
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <Badge className="bg-[#00d4ff] text-black font-black uppercase tracking-[0.2em] text-[10px] px-3 py-1">Destaque</Badge>
                {hero.imdb_rating && (
                  <div className="flex items-center gap-1.5 font-black text-base text-yellow-400">
                    <Star className="w-3.5 h-3.5 fill-current" />{Number(hero.imdb_rating).toFixed(1)}
                  </div>
                )}
                <span className="text-zinc-400 font-black text-sm">{hero.year}</span>
                <Badge variant="outline" className="border-zinc-700 text-zinc-400 font-black text-[9px]">4K HDR</Badge>
                <Badge variant="outline" className="border-zinc-700 text-zinc-400 font-black text-[9px]">DUAL ÁUDIO</Badge>
              </div>
              <h1 className="text-2xl lg:text-4xl font-black mb-3 tracking-tighter uppercase text-white leading-tight drop-shadow-2xl">{cleanTitle(hero.title)}</h1>
              {hero.genres && Array.isArray(hero.genres) && hero.genres.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {hero.genres.slice(0, 4).map((g: string) => (
                    <span key={g} className="text-[9px] font-black uppercase tracking-wider bg-white/10 border border-white/10 rounded px-2 py-0.5 text-zinc-300">{g}</span>
                  ))}
                </div>
              )}
              <p className="text-sm text-zinc-400 mb-6 line-clamp-2 leading-relaxed max-w-lg">{hero.synopsis || "Assista agora em alta definição."}</p>
              <div className="flex flex-wrap gap-3">
                <Button asChild className="h-10 px-6 rounded-full bg-[#00d4ff] text-black font-black text-sm hover:scale-105 hover:bg-white transition-all border-none">
                  <Link to="/watch/$slug" params={{ slug: hero.slug }}><Play className="w-4 h-4 mr-2 fill-current" /> Assistir Agora</Link>
                </Button>
                <Button asChild className="h-10 px-6 rounded-full bg-zinc-900/60 backdrop-blur-xl border border-white/10 text-white font-black text-sm hover:bg-zinc-800 transition-all">
                  <Link to="/watch/$slug" params={{ slug: hero.slug }}><Download className="w-4 h-4 mr-2" /> Baixar</Link>
                </Button>
              </div>
            </motion.div>
          )}
        </div>

        {!loading && displayTitles.length > 1 && (
          <div className="absolute bottom-6 right-8 z-20 flex gap-2">
            {displayTitles.slice(0, 6).map((_, i) => (
              <button key={i} onClick={() => setHeroIndex(i)}
                className={`h-1.5 transition-all duration-500 rounded-full ${heroIndex === i ? 'w-8 bg-[#00d4ff]' : 'w-2 bg-zinc-700 hover:bg-zinc-500'}`} />
            ))}
          </div>
        )}

        {!loading && displayTitles.length > 1 && (
          <>
            <button
              onClick={() => setHeroIndex(prev => (prev - 1 + Math.min(displayTitles.length, 6)) % Math.min(displayTitles.length, 6))}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/30 border border-white/10 flex items-center justify-center text-white hover:bg-black/60 transition-all opacity-0 group-hover:opacity-100"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setHeroIndex(prev => (prev + 1) % Math.min(displayTitles.length, 6))}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/30 border border-white/10 flex items-center justify-center text-white hover:bg-black/60 transition-all opacity-0 group-hover:opacity-100"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}
      </header>

      <main className="relative z-20 -mt-20 pb-32">
        {searchQuery.length > 1 ? (
          <TitleRow title={`Resultados para "${searchQuery}"`} items={searchResults} loading={false} />
        ) : filterGenre ? (
          <TitleRow title={`Gênero: ${filterGenre}`} items={filteredByGenre.length > 0 ? filteredByGenre : displayTitles} loading={filteredByGenre.length === 0 && loading} />
        ) : filter ? (
          <>
            <div className="px-6 lg:px-12 pt-6 pb-2 flex items-center gap-4">
              <h2 className="text-sm font-black uppercase tracking-widest text-white">Catálogo</h2>
              <div className="flex gap-2">
                {(['Todos', 'Filmes', 'Séries'] as const).map(tab => (
                  <Link key={tab} to="/" search={{ filter: tab === 'Todos' ? '' : tab === 'Filmes' ? 'movie' : 'series' }}
                    className={`px-3 py-1 rounded text-[10px] font-black uppercase tracking-wider transition-all ${
                      (filter === '' && tab === 'Todos') || (filter === 'movie' && tab === 'Filmes') || (filter === 'series' && tab === 'Séries')
                        ? 'bg-[#00d4ff] text-black' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                    }`}>{tab}</Link>
                ))}
              </div>
            </div>
            <TitleRow title="Resultados" items={filteredTitles} loading={loading} />
          </>
        ) : (
          <>
            <div className="px-6 lg:px-12 pt-6 pb-2 flex items-center gap-4">
              <h2 className="text-sm font-black uppercase tracking-widest text-white">Catálogo</h2>
              <div className="flex gap-2">
                {(['Todos', 'Filmes', 'Séries'] as const).map(tab => (
                  <Link key={tab} to="/" search={{ filter: tab === 'Todos' ? '' : tab === 'Filmes' ? 'movie' : 'series' }}
                    className={`px-3 py-1 rounded text-[10px] font-black uppercase tracking-wider transition-all ${
                      (filter === '' && tab === 'Todos') || (filter === 'movie' && tab === 'Filmes') || (filter === 'series' && tab === 'Séries')
                        ? 'bg-[#00d4ff] text-black' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                    }`}>{tab}</Link>
                ))}
              </div>
            </div>
            <TitleRow title="Lançamentos Recentes" items={displayTitles.slice(0, 20)} loading={loading} />
            <TitleRow title="Top IMDb" items={topRated.slice(0, 20)} loading={loading} />
            {movies.length > 0 && <TitleRow title="Filmes em Destaque" items={movies.slice(0, 20)} loading={false} />}
            {series.length > 0 && <TitleRow title="Séries de Sucesso" items={series.slice(0, 20)} loading={false} />}
            {animes.length > 0 && <TitleRow title="Animes & Animações" items={animes.slice(0, 20)} loading={false} />}
            {movies.length === 0 && series.length === 0 && !loading && (
              <TitleRow title="Todo o Catálogo" items={displayTitles.slice(0, 20)} loading={false} />
            )}
          </>
        )}
      </main>

      <footer className="bg-zinc-950 border-t border-zinc-900 px-6 lg:px-12 py-20">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div>
            <InwiseLogo size="lg" className="mb-5" />
            <p className="text-zinc-500 text-sm leading-relaxed">O melhor catálogo com qualidade 4K, Dual Áudio e legendas PT-BR.</p>
          </div>
          <div>
            <h4 className="font-black uppercase tracking-[0.3em] text-[10px] mb-5 text-zinc-300">Catálogo</h4>
            <ul className="space-y-3 text-[11px] font-black uppercase tracking-widest text-zinc-500">
              <li><Link to="/" search={{ filter: 'movie' }} className="hover:text-primary transition-colors">Filmes</Link></li>
              <li><Link to="/" search={{ filter: 'series' }} className="hover:text-primary transition-colors">Séries</Link></li>
              <li><Link to="/" search={{ filter: 'anime' }} className="hover:text-primary transition-colors">Animes</Link></li>
              <li><Link to="/" search={{ filter: '2026' }} className="hover:text-primary transition-colors">Lançamentos 2026</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-black uppercase tracking-[0.3em] text-[10px] mb-5 text-zinc-300">Suporte</h4>
            <ul className="space-y-3 text-[11px] font-black uppercase tracking-widest text-zinc-500">
              <li><Link to="/" search={{ filter: '' }} className="hover:text-primary">Ajuda & FAQ</Link></li>
              <li><Link to="/" search={{ filter: '' }} className="hover:text-primary">DMCA</Link></li>
              <li><Link to="/" search={{ filter: '' }} className="hover:text-primary">Privacidade</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-black uppercase tracking-[0.3em] text-[10px] mb-5 text-zinc-300">Admin</h4>
            <ul className="space-y-3 text-[11px] font-black uppercase tracking-widest text-zinc-500">
              <li><Link to="/admin" className="text-primary hover:text-white">Painel Admin</Link></li>
              <li><Link to="/debug" className="hover:text-primary">Debug</Link></li>
            </ul>
          </div>
        </div>
        <div className="pt-10 border-t border-zinc-900 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-[9px] font-black text-zinc-700 uppercase tracking-[0.4em]">© 2026 INWISE MOVIES. POWERED BY WEBTORRENT.</p>
          <div className="flex gap-8 text-[9px] font-black text-zinc-700 uppercase tracking-[0.2em]">
            <span>Privacidade</span><span>Termos</span><span>Cookies</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
