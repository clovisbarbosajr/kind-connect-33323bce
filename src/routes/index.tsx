import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, Play, Star, Flame, ChevronRight, Filter, Film, Tv, PlayCircle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/")({
  component: Index,
});

type Movie = Tables<"movies">;

function Index() {
  const [catalog, setCatalog] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<'all' | 'movie' | 'series' | 'anime'>('all');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const observer = useRef<IntersectionObserver | null>(null);

  const fetchData = useCallback(async (isInitial = false) => {
    const currentPage = isInitial ? 0 : page;
    const from = currentPage * 20;
    const to = from + 19;

    let query = supabase
      .from('movies')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, to);
    
    if (activeFilter !== 'all') {
      query = query.eq('type', activeFilter);
    }

    if (searchTerm) {
      query = query.ilike('title', `%${searchTerm}%`);
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching catalog:', error);
    } else {
      if (isInitial) {
        setCatalog(data || []);
      } else {
        setCatalog(prev => [...prev, ...(data || [])]);
      }
      setHasMore(data?.length === 20);
    }
    setLoading(false);
  }, [activeFilter, searchTerm, page]);

  useEffect(() => {
    setLoading(true);
    fetchData(true);
  }, [activeFilter, searchTerm]);

  useEffect(() => {
    if (page > 0) fetchData();
  }, [page]);

  const lastElementRef = useCallback((node: HTMLDivElement) => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prev => prev + 1);
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, hasMore]);

  const heroItem = catalog.find(i => i.is_hero) || catalog[0];

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Header / Navbar */}
      <header className="fixed top-0 w-full z-50 px-6 py-4 flex items-center justify-between bg-gradient-to-b from-background to-transparent backdrop-blur-md">
        <div className="flex items-center gap-8">
          <Link to="/" className="text-2xl font-black italic tracking-tighter text-neon-green">INWISE FILMES</Link>
          <nav className="hidden md:flex items-center gap-6 font-bold text-xs uppercase tracking-widest text-muted-foreground">
            <button 
              onClick={() => setActiveFilter('all')}
              className={`hover:text-neon-green transition-colors ${activeFilter === 'all' ? 'text-neon-green' : ''}`}
            >
              Início
            </button>
            <button 
              onClick={() => setActiveFilter('movie')}
              className={`hover:text-neon-green transition-colors ${activeFilter === 'movie' ? 'text-neon-green' : ''}`}
            >
              Filmes
            </button>
            <button 
              onClick={() => setActiveFilter('series')}
              className={`hover:text-neon-green transition-colors ${activeFilter === 'series' ? 'text-neon-green' : ''}`}
            >
              Séries
            </button>
            <button 
              onClick={() => setActiveFilter('anime')}
              className={`hover:text-neon-green transition-colors ${activeFilter === 'anime' ? 'text-neon-green' : ''}`}
            >
              Animes
            </button>
          </nav>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-neon-green transition-colors" />
            <input 
              type="text" 
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-secondary/30 border border-white/5 rounded-full pl-10 pr-4 py-2 text-sm w-40 md:w-64 focus:ring-1 focus:ring-neon-green transition-all outline-none backdrop-blur-md"
            />
          </div>
          <div className="w-9 h-9 rounded-full bg-neon-green/20 border border-neon-green/30 flex items-center justify-center overflow-hidden cursor-pointer hover:scale-105 transition-transform">
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Inwise" alt="User" />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      {heroItem && !searchTerm && activeFilter === 'all' && (
        <section className="relative h-[90vh] w-full">
          <div className="absolute inset-0">
            <img 
              src={heroItem.backdrop || heroItem.poster || ""} 
              alt={heroItem.title} 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/20 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          </div>

          <div className="relative h-full container mx-auto px-6 flex flex-col justify-center max-w-3xl gap-4 pt-20">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-neon-green text-xs font-black uppercase tracking-[0.2em]"
            >
              <Flame className="w-4 h-4 fill-neon-green" /> Em destaque agora
            </motion.div>
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-6xl md:text-8xl font-black tracking-tighter"
            >
              {heroItem.title}
            </motion.h2>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-6 text-sm font-bold"
            >
              <span className="flex items-center gap-1.5 text-neon-green"><Star className="w-4 h-4 fill-neon-green" /> {heroItem.rating}</span>
              <span className="text-white/60">{heroItem.year}</span>
              <span className="bg-white/10 px-3 py-1 rounded text-[10px] border border-white/10 uppercase tracking-widest">{heroItem.resolution}</span>
              <span className="bg-neon-green/10 text-neon-green px-3 py-1 rounded text-[10px] border border-neon-green/20 uppercase tracking-widest">{heroItem.audio_type}</span>
            </motion.div>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-muted-foreground line-clamp-3 text-lg md:text-xl max-w-2xl leading-relaxed"
            >
              {heroItem.description || "Assista a este incrível título agora mesmo em alta definição e com som surround."}
            </motion.p>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex items-center gap-4 mt-8"
            >
              <Link to="/watch/$slug" params={{ slug: heroItem.slug }} className="neon-button flex items-center gap-3 px-10 py-4 text-lg">
                <PlayCircle className="w-7 h-7 fill-current" /> Assistir Agora
              </Link>
            </motion.div>
          </div>
        </section>
      )}

      {/* Main Content */}
      <main className={`container mx-auto px-6 relative z-10 space-y-16 pb-32 ${heroItem && !searchTerm && activeFilter === 'all' ? '-mt-24' : 'pt-32'}`}>
        
        {/* Filters Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-2xl font-black italic flex items-center gap-3 uppercase tracking-tighter">
            <span className="w-1.5 h-8 bg-neon-green rounded-full shadow-[0_0_10px_rgba(200,255,0,0.5)]" />
            {searchTerm ? `Resultados para: ${searchTerm}` : activeFilter === 'all' ? 'Lançamentos Recentes' : activeFilter === 'movie' ? 'Filmes' : activeFilter === 'series' ? 'Séries' : 'Animes'}
          </h3>
          
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
             <FilterBtn active={activeFilter === 'all'} onClick={() => setActiveFilter('all')} icon={<Film size={14} />}>Tudo</FilterBtn>
             <FilterBtn active={activeFilter === 'movie'} onClick={() => setActiveFilter('movie')} icon={<Film size={14} />}>Filmes</FilterBtn>
             <FilterBtn active={activeFilter === 'series'} onClick={() => setActiveFilter('series')} icon={<Tv size={14} />}>Séries</FilterBtn>
             <FilterBtn active={activeFilter === 'anime'} onClick={() => setActiveFilter('anime')} icon={<Play size={14} />}>Animes</FilterBtn>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-6 gap-y-10">
          <AnimatePresence>
            {catalog.map((item, index) => (
              <MovieCard 
                key={item.id} 
                item={item} 
                ref={index === catalog.length - 1 ? lastElementRef : null} 
              />
            ))}
          </AnimatePresence>
        </div>

        {loading && (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 text-neon-green animate-spin opacity-50" />
          </div>
        )}

        {!loading && catalog.length === 0 && (
          <div className="text-center py-40 space-y-4">
             <div className="text-6xl opacity-20">🎬</div>
             <p className="text-muted-foreground text-xl">Nenhum título encontrado.</p>
             <button onClick={() => {setSearchTerm(""); setActiveFilter("all");}} className="text-neon-green font-bold underline">Limpar filtros</button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 bg-black/50 backdrop-blur-xl">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <h2 className="text-2xl font-black italic text-neon-green">INWISE FILMES</h2>
          <div className="flex gap-8 text-sm text-muted-foreground font-bold uppercase tracking-widest">
            <Link to="/" className="hover:text-white transition-colors">Home</Link>
            <Link to="/" className="hover:text-white transition-colors">DMCA</Link>
            <Link to="/" className="hover:text-white transition-colors">Privacidade</Link>
          </div>
          <p className="text-xs text-muted-foreground">© 2026 INWISE FILMES. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}

function FilterBtn({ children, active, onClick, icon }: { children: React.ReactNode, active: boolean, onClick: () => void, icon?: React.ReactNode }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest transition-all border ${active ? 'bg-neon-green text-black border-neon-green shadow-[0_0_15px_rgba(200,255,0,0.3)]' : 'bg-white/5 text-muted-foreground border-white/5 hover:bg-white/10 hover:border-white/10'}`}
    >
      {icon}
      {children}
    </button>
  );
}

const MovieCard = ({ item, ref }: { item: Movie, ref: any }) => {
  return (
    <Link 
      to="/watch/$slug"
      params={{ slug: item.slug }}
      className="group relative flex flex-col h-full"
      ref={ref}
    >
      <motion.div 
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        whileHover={{ y: -8 }}
        className="relative aspect-[2/3] rounded-xl overflow-hidden bg-white/5 border border-white/5 transition-all duration-300 group-hover:border-neon-green/50 group-hover:shadow-[0_0_30px_rgba(200,255,0,0.15)]"
      >
        <img 
          src={item.poster || ""} 
          alt={item.title} 
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
        />
        
        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-4">
           <div className="flex items-center gap-2 mb-2">
              <span className="bg-neon-green text-black px-1.5 py-0.5 rounded text-[9px] font-black uppercase">{item.type}</span>
              <span className="bg-white/20 backdrop-blur-md text-white px-1.5 py-0.5 rounded text-[9px] font-black uppercase">{item.year}</span>
           </div>
           <div className="flex items-center justify-center w-full aspect-square absolute top-0 left-0">
              <div className="w-12 h-12 rounded-full bg-neon-green flex items-center justify-center text-black scale-0 group-hover:scale-100 transition-transform duration-500 shadow-[0_0_20px_rgba(200,255,0,0.5)]">
                 <Play size={24} fill="currentColor" />
              </div>
           </div>
        </div>

        {/* Rating Badge */}
        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10 flex items-center gap-1 text-[10px] font-bold text-neon-green group-hover:bg-neon-green group-hover:text-black transition-colors">
          <Star size={10} fill="currentColor" /> {item.rating}
        </div>
      </motion.div>
      
      <div className="mt-4 space-y-1">
        <h4 className="font-bold text-sm truncate group-hover:text-neon-green transition-colors leading-tight uppercase tracking-tight">{item.title}</h4>
        <div className="flex items-center justify-between text-[10px] text-muted-foreground font-black uppercase tracking-widest">
          <span>{item.audio_type}</span>
          <span className="text-white/40">{item.resolution}</span>
        </div>
      </div>
    </Link>
  );
};