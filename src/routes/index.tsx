import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Info, Search, Menu, User, Star, ChevronRight, ChevronLeft, Volume2, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: Index,
});

const MOCK_TITLES = [
  { id: '1', slug: 'breaking-bad', title: 'Breaking Bad', year: 2008, imdb_rating: 9.5, type: 'series', backdrop: 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?q=80&w=1000', poster: 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?q=80&w=400', synopsis: "Um professor de química com câncer terminal decide produzir metanfetamina para garantir o futuro de sua família." },
  { id: '2', slug: 'the-witcher', title: 'The Witcher', year: 2019, imdb_rating: 8.1, type: 'series', backdrop: 'https://images.unsplash.com/photo-1616466753066-512c14041d8e?q=80&w=1000', poster: 'https://images.unsplash.com/photo-1616466753066-512c14041d8e?q=80&w=400', synopsis: "O mutante Geralt de Rívia é um caçador de monstros que luta para encontrar seu lugar em um mundo onde as pessoas costumam ser mais perversas do que as feras." },
  { id: '3', slug: 'inception', title: 'Inception', year: 2010, imdb_rating: 8.8, type: 'movie', backdrop: 'https://images.unsplash.com/photo-1604975712543-41a3199859cd?q=80&w=1000', poster: 'https://images.unsplash.com/photo-1604975712543-41a3199859cd?q=80&w=400', synopsis: "Dom Cobb é um ladrão habilidoso que rouba segredos valiosos das profundezas do subconsciente durante o estado de sono." },
  { id: '4', slug: 'interstellar', title: 'Interstellar', year: 2014, imdb_rating: 8.7, type: 'movie', backdrop: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=1000', poster: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=400' },
  { id: '5', slug: 'stranger-things', title: 'Stranger Things', year: 2016, imdb_rating: 8.7, type: 'series', backdrop: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=1000', poster: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=400' },
  { id: '6', slug: 'the-last-of-us', title: 'The Last of Us', year: 2023, imdb_rating: 8.8, type: 'series', backdrop: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=1000', poster: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=400' },
];

function MovieRow({ title, items, loading }: { title: string, items: any[], loading: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollTo = direction === 'left' ? scrollLeft - clientWidth : scrollLeft + clientWidth;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-4 mb-10 relative group">
      <div className="flex items-center justify-between px-6 lg:px-12">
        <h2 className="text-xl font-bold tracking-tight">{title}</h2>
        <Link to="/" className="text-xs font-bold text-gray-500 hover:text-primary transition uppercase tracking-widest">Ver Tudo</Link>
      </div>

      <div className="relative group">
        <button 
          onClick={() => scroll('left')}
          className="absolute left-0 top-0 bottom-0 z-40 bg-black/50 w-12 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>
        
        <div 
          ref={scrollRef}
          className="flex overflow-x-auto gap-4 px-6 lg:px-12 no-scrollbar scroll-smooth"
        >
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="min-w-[180px] sm:min-w-[220px] aspect-[2/3] rounded-xl bg-zinc-900" />
            ))
          ) : (
            items.map((item) => (
              <Link 
                key={item.id} 
                to="/watch/$slug" 
                params={{ slug: item.slug }}
                className="min-w-[180px] sm:min-w-[220px] group/card relative"
              >
                <motion.div 
                  whileHover={{ scale: 1.05, y: -5 }}
                  className="relative aspect-[2/3] rounded-xl overflow-hidden shadow-2xl transition-all"
                >
                  <img src={item.poster || item.backdrop} className="w-full h-full object-cover" alt={item.title} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
                  
                  {/* Badge Row */}
                  <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                    <Badge className="bg-primary/90 text-black text-[9px] font-black border-none px-1.5 py-0 h-4">4K</Badge>
                    <Badge className="bg-zinc-900/90 text-white text-[9px] font-black border-none px-1.5 py-0 h-4 uppercase">DUAL</Badge>
                  </div>

                  {/* Rating Badge */}
                  <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded flex items-center gap-1">
                    <Star className="w-2.5 h-2.5 text-yellow-500 fill-current" />
                    <span className="text-[10px] font-bold">{item.imdb_rating || 'N/A'}</span>
                  </div>

                  {/* Overlay Info */}
                  <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover/card:opacity-100 transition-opacity flex flex-col justify-center items-center">
                    <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-black">
                      <Play className="w-6 h-6 fill-current ml-1" />
                    </div>
                  </div>
                </motion.div>
                <div className="mt-3">
                  <h3 className="font-bold text-sm truncate group-hover/card:text-primary transition">{item.title}</h3>
                  <p className="text-[10px] text-gray-500 font-bold uppercase mt-0.5">{item.year} • {item.type === 'movie' ? 'Filme' : 'Série'}</p>
                </div>
              </Link>
            ))
          )}
        </div>

        <button 
          onClick={() => scroll('right')}
          className="absolute right-0 top-0 bottom-0 z-40 bg-black/50 w-12 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <ChevronRight className="w-8 h-8" />
        </button>
      </div>
    </div>
  );
}

function Index() {
  const [titles, setTitles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [heroIndex, setHeroIndex] = useState(0);

  useEffect(() => {
    async function fetchTitles() {
      try {
        const { data, error } = await supabase
          .from('titles')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(40);
        
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

  const displayTitles = titles.length > 0 ? titles : MOCK_TITLES;
  
  useEffect(() => {
    const timer = setInterval(() => {
      setHeroIndex(prev => (prev + 1) % Math.min(displayTitles.length, 5));
    }, 8000);
    return () => clearInterval(timer);
  }, [displayTitles]);

  const hero = displayTitles[heroIndex];

  return (
    <div className="min-h-screen bg-black text-white selection:bg-primary selection:text-black no-scrollbar overflow-x-hidden">
      {/* Navbar - Starck Filmes Style */}
      <nav className="fixed top-0 left-0 right-0 z-50 transition-colors duration-500 bg-gradient-to-b from-black/95 via-black/50 to-transparent">
        <div className="flex items-center justify-between px-6 lg:px-12 py-4">
          <div className="flex items-center gap-12">
            <Link to="/" className="text-3xl font-black text-primary tracking-tighter drop-shadow-[0_0_15px_rgba(200,255,0,0.4)]">STARCK</Link>
            
            <div className="hidden xl:flex items-center gap-8 text-[13px] font-bold uppercase tracking-wider text-gray-300">
              <Link to="/" className="hover:text-primary transition-colors">Início</Link>
              
              <div className="group relative cursor-pointer hover:text-primary transition-colors py-2">
                Gênero
                <div className="absolute top-full -left-4 hidden group-hover:grid grid-cols-2 w-64 bg-zinc-950/98 border border-zinc-800/50 p-4 rounded-xl shadow-2xl mt-0 backdrop-blur-xl">
                  {['Ação', 'Animação', 'Comédia', 'Documentário', 'Drama', 'Ficção Científica', 'Guerra', 'Musical', 'Mistério', 'Policial', 'Romance', 'Terror'].map(g => (
                    <div key={g} className="p-2 hover:bg-zinc-800 rounded-lg text-[11px] transition-all hover:translate-x-1">{g}</div>
                  ))}
                </div>
              </div>

              <div className="group relative cursor-pointer hover:text-primary transition-colors py-2">
                Áudio
                <div className="absolute top-full -left-4 hidden group-hover:flex flex-col w-48 bg-zinc-950/98 border border-zinc-800/50 p-4 rounded-xl shadow-2xl mt-0 backdrop-blur-xl">
                  {['Dublado', 'Legendado', 'Dual Áudio'].map(a => (
                    <div key={a} className="p-2 hover:bg-zinc-800 rounded-lg text-[11px] transition-all hover:translate-x-1">{a}</div>
                  ))}
                </div>
              </div>

              <Link to="/" className="hover:text-primary transition-colors">Filmes</Link>
              <Link to="/" className="hover:text-primary transition-colors">Séries</Link>
              <Link to="/" className="hover:text-primary transition-colors">Animes</Link>
              <Link to="/" className="hover:text-primary transition-colors">Top IMDb</Link>
              <Link to="/" className="hover:text-primary transition-colors text-primary/80">Lançamentos 2026</Link>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative hidden md:block group">
              <input 
                type="text" 
                placeholder="Pesquisar títulos..." 
                className="bg-zinc-900/50 border border-zinc-800/50 rounded-full pl-10 pr-4 py-1.5 text-xs w-48 focus:w-64 transition-all focus:border-primary/50 outline-none"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-primary transition-colors" />
            </div>
            <User className="w-5 h-5 cursor-pointer text-gray-300 hover:text-white" />
            <Menu className="xl:hidden w-6 h-6 cursor-pointer" />
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative h-screen w-full overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={hero?.id || 'skeleton'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="absolute inset-0"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent z-10" />
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent z-10" />
            
            {loading ? (
              <Skeleton className="w-full h-full bg-zinc-900" />
            ) : (
              <img 
                src={hero.backdrop} 
                className="w-full h-full object-cover" 
                alt={hero.title} 
              />
            )}
          </motion.div>
        </AnimatePresence>

        <div className="absolute bottom-[15%] left-6 lg:left-12 z-20 max-w-3xl">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-14 w-80 bg-zinc-800" />
              <Skeleton className="h-4 w-[500px] bg-zinc-800" />
              <div className="flex gap-4">
                <Skeleton className="h-12 w-40 bg-zinc-800" />
                <Skeleton className="h-12 w-40 bg-zinc-800" />
              </div>
            </div>
          ) : (
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <Badge className="bg-primary text-black font-black uppercase tracking-widest px-3 py-1">Em Destaque</Badge>
                <div className="flex items-center gap-1.5 font-black text-lg">
                  <Star className="w-5 h-5 text-yellow-500 fill-current" />
                  {hero.imdb_rating || '8.5'}
                </div>
                <span className="text-gray-400 font-bold uppercase tracking-widest text-sm">{hero.year}</span>
                <Badge variant="outline" className="border-zinc-500 text-zinc-300">4K DUAL ÁUDIO</Badge>
              </div>

              <h1 className="text-6xl lg:text-8xl font-black mb-6 tracking-tighter uppercase drop-shadow-2xl">{hero.title}</h1>
              
              <p className="text-lg lg:text-xl text-gray-200 mb-10 line-clamp-3 leading-relaxed max-w-2xl font-medium drop-shadow-md">
                {hero.synopsis || "Explora o melhor do streaming com qualidade máxima. Disponível para streaming imediato em alta definição com dual áudio e legendas premium."}
              </p>

              <div className="flex flex-wrap gap-4">
                <Button asChild className="h-14 px-10 rounded-full bg-primary text-black font-black text-lg hover:scale-105 transition-all shadow-2xl shadow-primary/20 group">
                  <Link to="/watch/$slug" params={{ slug: hero.slug }}>
                    <Play className="w-6 h-6 mr-2 fill-current" /> Assistir Agora
                  </Link>
                </Button>
                <Button className="h-14 px-10 rounded-full bg-zinc-800/60 backdrop-blur-md text-white font-black text-lg hover:bg-zinc-700 transition group">
                  <Plus className="w-6 h-6 mr-2" /> Minha Lista
                </Button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Hero Nav/Dots */}
        <div className="absolute bottom-10 right-12 z-20 flex gap-2">
          {displayTitles.slice(0, 5).map((_, i) => (
            <button 
              key={i}
              onClick={() => setHeroIndex(i)}
              className={`h-1.5 transition-all rounded-full ${heroIndex === i ? 'w-10 bg-primary' : 'w-2 bg-zinc-600'}`}
            />
          ))}
        </div>
      </header>

      {/* Main Content Rows */}
      <main className="relative z-20 -mt-24 pb-20">
        <MovieRow 
          title="Lançamentos Recentes" 
          items={displayTitles.slice(0, 10)} 
          loading={loading} 
        />
        
        <MovieRow 
          title="Top IMDb" 
          items={[...displayTitles].sort((a,b) => (b.imdb_rating || 0) - (a.imdb_rating || 0))} 
          loading={loading} 
        />

        <MovieRow 
          title="Filmes de Ação" 
          items={displayTitles.filter(t => t.type === 'movie')} 
          loading={loading} 
        />

        <MovieRow 
          title="Séries Populares" 
          items={displayTitles.filter(t => t.type === 'series')} 
          loading={loading} 
        />

        <MovieRow 
          title="Animes e Animações" 
          items={displayTitles} 
          loading={loading} 
        />
      </main>

      {/* Footer */}
      <footer className="bg-zinc-950 border-t border-zinc-900 px-6 lg:px-12 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
          <div className="col-span-2">
            <h3 className="text-2xl font-black text-primary mb-6 tracking-tighter">STARCK FILMES</h3>
            <p className="text-sm text-gray-500 max-w-sm leading-relaxed">O melhor agregador de conteúdo streaming com tecnologia P2P. Assista seus filmes e séries favoritos direto no navegador sem complicação.</p>
          </div>
          <div>
            <h4 className="font-black uppercase tracking-widest text-xs mb-6 text-gray-300">Navegação</h4>
            <ul className="space-y-4 text-xs font-bold text-gray-500">
              <li><Link to="/" className="hover:text-primary transition">Filmes</Link></li>
              <li><Link to="/" className="hover:text-primary transition">Séries</Link></li>
              <li><Link to="/" className="hover:text-primary transition">Animes</Link></li>
              <li><Link to="/debug" className="hover:text-primary transition">Status do Sistema</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-black uppercase tracking-widest text-xs mb-6 text-gray-300">Suporte</h4>
            <ul className="space-y-4 text-xs font-bold text-gray-500">
              <li><Link to="/" className="hover:text-primary transition">DMCA</Link></li>
              <li><Link to="/" className="hover:text-primary transition">Contato</Link></li>
              <li><Link to="/" className="hover:text-primary transition">Privacidade</Link></li>
              <li><Link to="/" className="hover:text-primary transition">Telegram</Link></li>
            </ul>
          </div>
        </div>
        <div className="pt-10 border-t border-zinc-900 flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] font-bold text-gray-600 uppercase tracking-widest">
          <p>© 2026 Starck Filmes. Todos os direitos reservados.</p>
          <p>Powered by WebTorrent & Lovable Cloud</p>
        </div>
      </footer>
    </div>
  );
}
