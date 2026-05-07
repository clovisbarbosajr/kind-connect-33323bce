import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Search, Star, Plus, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
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

export const Route = createFileRoute("/")({
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
  const [titles, setTitles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [heroIndex, setHeroIndex] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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

  return (
    <div className="min-h-screen bg-black text-white selection:bg-primary selection:text-black no-scrollbar overflow-x-hidden">
      {/* Navbar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 px-6 lg:px-12 py-4 flex items-center justify-between ${scrolled ? 'bg-black shadow-2xl' : 'bg-gradient-to-b from-black/80 to-transparent'}`}>
        <div className="flex items-center gap-10">
          <Link to="/"><InwiseLogo size="md" /></Link>
          <div className="hidden lg:flex items-center gap-6 text-xs font-black uppercase tracking-widest text-zinc-300">
            <Link to="/" className="text-white hover:text-primary transition-colors">INÍCIO</Link>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1 hover:text-white outline-none uppercase">
                Gêneros <ChevronDown className="w-3 h-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-zinc-950/95 border-zinc-800 grid grid-cols-2 w-64 p-2 backdrop-blur-xl">
                {GENRES.map(g => (
                  <DropdownMenuItem key={g} className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 hover:text-primary hover:bg-zinc-900 focus:bg-zinc-900 cursor-pointer">{g}</DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1 hover:text-white outline-none uppercase">
                Áudio <ChevronDown className="w-3 h-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-zinc-950/95 border-zinc-800 w-40 p-2 backdrop-blur-xl">
                {['Dublado', 'Legendado', 'Dual Áudio'].map(a => (
                  <DropdownMenuItem key={a} className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 hover:text-primary cursor-pointer">{a}</DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Link to="/" className="hover:text-white transition-colors">FILMES</Link>
            <Link to="/" className="hover:text-white transition-colors">SÉRIES</Link>
            <Link to="/" className="hover:text-white transition-colors">ANIMES</Link>
            <Link to="/" className="hover:text-white transition-colors">TOP IMDB</Link>
            <Link to="/" className="text-[#00d4ff] drop-shadow-[0_0_10px_rgba(0,212,255,0.3)]">LANÇAMENTOS 2026</Link>
          </div>
        </div>
        <div className="flex items-center gap-5">
          <div className="relative group hidden sm:block">
            <input type="text" placeholder="Buscar filmes, séries..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-zinc-900/60 border border-zinc-800/60 rounded-full pl-10 pr-4 py-2 text-[10px] font-bold uppercase tracking-widest w-48 focus:w-72 transition-all focus:border-primary/50 outline-none text-white placeholder:text-zinc-600" />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-primary transition-colors" />
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="relative h-[85vh] md:h-screen w-full overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div key={hero?.id || 'skeleton'} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.5 }} className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent z-10" />
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/50 to-transparent z-10" />
            {loading || !hero ? (
              <div className="w-full h-full bg-zinc-950">
                <div className="w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(0,212,255,0.05),transparent_50%)]" />
              </div>
            ) : (
              <img src={hero.backdrop || hero.poster} className="w-full h-full object-cover object-center" alt={hero.title} />
            )}
          </motion.div>
        </AnimatePresence>

        <div className="absolute bottom-[18%] left-6 lg:left-12 z-20 max-w-3xl">
          {loading || !hero ? (
            <div className="space-y-5">
              <Skeleton className="h-6 w-48 bg-zinc-800/50 rounded-full" />
              <Skeleton className="h-20 w-[80%] bg-zinc-800/50 rounded-2xl" />
              <Skeleton className="h-4 w-[55%] bg-zinc-800/50 rounded-full" />
              <div className="flex gap-4 pt-4">
                <Skeleton className="h-12 w-40 bg-zinc-800/50 rounded-full" />
                <Skeleton className="h-12 w-40 bg-zinc-800/50 rounded-full" />
              </div>
            </div>
          ) : (
            <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3, duration: 0.8 }}>
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <Badge className="bg-[#00d4ff] text-black font-black uppercase tracking-[0.2em] text-[10px] px-4 py-1.5">Destaque</Badge>
                {hero.imdb_rating && (
                  <div className="flex items-center gap-1.5 font-black text-lg text-yellow-400">
                    <Star className="w-4 h-4 fill-current" />{Number(hero.imdb_rating).toFixed(1)}
                  </div>
                )}
                <span className="text-zinc-400 font-black text-sm">{hero.year}</span>
                <Badge variant="outline" className="border-zinc-700 text-zinc-400 font-black text-[9px]">4K HDR</Badge>
                <Badge variant="outline" className="border-zinc-700 text-zinc-400 font-black text-[9px]">DUAL ÁUDIO</Badge>
              </div>
              <h1 className="text-3xl lg:text-5xl font-black mb-5 tracking-tighter uppercase text-white leading-tight drop-shadow-2xl">{hero.title}</h1>
              <p className="text-base text-zinc-400 mb-8 line-clamp-3 leading-relaxed max-w-lg">{hero.synopsis || "Assista agora em alta definição."}</p>
              <div className="flex flex-wrap gap-4">
                <Button asChild className="h-12 px-8 rounded-full bg-[#00d4ff] text-black font-black text-base hover:scale-105 hover:bg-white transition-all border-none">
                  <Link to="/watch/$slug" params={{ slug: hero.slug }}><Play className="w-4 h-4 mr-2 fill-current" /> Assistir Agora</Link>
                </Button>
                <Button className="h-12 px-8 rounded-full bg-zinc-900/60 backdrop-blur-xl border border-white/10 text-white font-black text-base hover:bg-zinc-800 italic">
                  <Plus className="w-4 h-4 mr-2" /> Minha Lista
                </Button>
              </div>
            </motion.div>
          )}
        </div>

        {!loading && displayTitles.length > 1 && (
          <div className="absolute bottom-10 right-10 z-20 flex gap-2.5">
            {displayTitles.slice(0, 6).map((_, i) => (
              <button key={i} onClick={() => setHeroIndex(i)}
                className={`h-1.5 transition-all duration-500 rounded-full ${heroIndex === i ? 'w-10 bg-primary' : 'w-2.5 bg-zinc-700 hover:bg-zinc-500'}`} />
            ))}
          </div>
        )}

        {/* Hero carousel arrows */}
        {!loading && displayTitles.length > 1 && (
          <>
            <button
              onClick={() => setHeroIndex(prev => (prev - 1 + Math.min(displayTitles.length, 6)) % Math.min(displayTitles.length, 6))}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white hover:bg-black/80 hover:border-primary/50 transition-all"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={() => setHeroIndex(prev => (prev + 1) % Math.min(displayTitles.length, 6))}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white hover:bg-black/80 hover:border-primary/50 transition-all"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}
      </header>

      {/* Content Rows */}
      <main className="relative z-20 -mt-28 pb-32">
        <TitleRow title="Lançamentos Recentes" items={displayTitles.slice(0, 20)} loading={loading} />
        <TitleRow title="Top IMDb" items={topRated.slice(0, 20)} loading={loading} />

{movies.length > 0 && <TitleRow title="Filmes em Destaque" items={movies.slice(0, 20)} loading={false} />}
        {series.length > 0 && <TitleRow title="Séries de Sucesso" items={series.slice(0, 20)} loading={false} />}
        {animes.length > 0  && <TitleRow title="Animes & Animações"  items={animes.slice(0, 20)}  loading={false} />}
        {movies.length === 0 && series.length === 0 && !loading && (
          <TitleRow title="Todo o Catálogo" items={displayTitles.slice(0, 20)} loading={false} />
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
              <li><Link to="/" className="hover:text-primary transition-colors">Filmes</Link></li>
              <li><Link to="/" className="hover:text-primary transition-colors">Séries</Link></li>
              <li><Link to="/" className="hover:text-primary transition-colors">Animes</Link></li>
              <li><Link to="/" className="hover:text-primary transition-colors">Lançamentos 2026</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-black uppercase tracking-[0.3em] text-[10px] mb-5 text-zinc-300">Suporte</h4>
            <ul className="space-y-3 text-[11px] font-black uppercase tracking-widest text-zinc-500">
              <li><Link to="/" className="hover:text-primary">Ajuda & FAQ</Link></li>
              <li><Link to="/" className="hover:text-primary">DMCA</Link></li>
              <li><Link to="/" className="hover:text-primary">Privacidade</Link></li>
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
