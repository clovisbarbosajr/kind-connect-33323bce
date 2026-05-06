import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, Play, Star, Clock, Flame, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { seedCatalog } from "@/lib/seed";

export const Route = createFileRoute("/")({
  component: Index,
});

interface ContentItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  poster: string;
  backdrop: string;
  year: number;
  rating: number;
  category: 'movie' | 'series';
  genres: string[];
  audio_type: string;
  resolution: string;
}

function Index() {
  const [catalog, setCatalog] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase.from('catalog').select('*');
      if (error) console.error(error);
      
      if (!data || data.length === 0) {
        await seedCatalog();
        const { data: newData } = await supabase.from('catalog').select('*');
        setCatalog(newData || []);
      } else {
        setCatalog(data as ContentItem[]);
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  const filteredCatalog = catalog.filter(item => 
    item.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const heroItem = catalog[0];

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Header / Navbar */}
      <header className="fixed top-0 w-full z-50 px-6 py-4 flex items-center justify-between bg-gradient-to-b from-background to-transparent backdrop-blur-sm">
        <div className="flex items-center gap-8">
          <h1 className="text-2xl font-black italic tracking-tighter text-neon-green">INWISE FILMES</h1>
          <nav className="hidden md:flex items-center gap-6 font-medium text-sm">
            <Link to="/" className="text-neon-green">Home</Link>
            <Link to="/" className="hover:text-neon-green transition-colors">Filmes</Link>
            <Link to="/" className="hover:text-neon-green transition-colors">Séries</Link>
            <Link to="/" className="hover:text-neon-green transition-colors">Favoritos</Link>
          </nav>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-neon-green transition-colors" />
            <input 
              type="text" 
              placeholder="Buscar filmes, séries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-secondary/50 border-none rounded-full pl-10 pr-4 py-2 text-sm w-48 md:w-64 focus:ring-1 focus:ring-neon-green transition-all outline-none"
            />
          </div>
          <div className="w-10 h-10 rounded-full bg-neon-green/20 border border-neon-green flex items-center justify-center overflow-hidden">
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      {heroItem && !searchTerm && (
        <section className="relative h-[85vh] w-full">
          <div className="absolute inset-0">
            <img 
              src={heroItem.backdrop} 
              alt={heroItem.title} 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          </div>

          <div className="relative h-full container mx-auto px-6 flex flex-col justify-center max-w-2xl gap-4">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-neon-green text-xs font-bold uppercase tracking-widest"
            >
              <Flame className="w-4 h-4 fill-neon-green" /> Em destaque hoje
            </motion.div>
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl md:text-7xl font-black"
            >
              {heroItem.title}
            </motion.h2>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-4 text-sm text-muted-foreground"
            >
              <span className="flex items-center gap-1 text-neon-green"><Star className="w-4 h-4 fill-neon-green" /> {heroItem.rating}</span>
              <span>{heroItem.year}</span>
              <span className="bg-secondary px-2 py-0.5 rounded text-xs border border-border">{heroItem.resolution}</span>
            </motion.div>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-muted-foreground line-clamp-3 md:text-lg"
            >
              {heroItem.description}
            </motion.p>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex items-center gap-4 mt-4"
            >
              <button className="neon-button flex items-center gap-2">
                <Play className="w-5 h-5 fill-current" /> Assistir Agora
              </button>
              <button className="bg-secondary/80 backdrop-blur-md border border-white/10 hover:bg-secondary px-6 py-2 rounded-full font-bold transition-all">
                Mais Detalhes
              </button>
            </motion.div>
          </div>
        </section>
      )}

      {/* Main Content Sections */}
      <main className="container mx-auto px-6 -mt-20 relative z-10 space-y-12 pb-20">
        <Section title="Recém Adicionados" items={filteredCatalog} />
        <Section title="Séries Imperdíveis" items={filteredCatalog.filter(i => i.category === 'series')} />
        <Section title="Filmes de Sucesso" items={filteredCatalog.filter(i => i.category === 'movie')} />
      </main>
    </div>
  );
}

function Section({ title, items }: { title: string, items: ContentItem[] }) {
  if (items.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <span className="w-1 h-6 bg-neon-green rounded-full" />
          {title}
        </h3>
        <button className="text-sm text-muted-foreground hover:text-neon-green flex items-center gap-1 transition-colors">
          Ver tudo <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {items.map((item) => (
            <motion.div 
              key={item.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              whileHover={{ y: -5 }}
              className="glass-card rounded-xl overflow-hidden cursor-pointer group flex flex-col h-full"
            >
              <div className="relative aspect-video overflow-hidden">
                <img 
                  src={item.backdrop} 
                  alt={item.title} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-neon-green flex items-center justify-center text-primary-foreground shadow-[0_0_15px_rgba(200,255,0,0.5)]">
                    <Play className="w-6 h-6 fill-current" />
                  </div>
                </div>
                <div className="absolute top-3 right-3 flex flex-col gap-2">
                  <span className="bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-bold border border-white/10 uppercase">{item.resolution}</span>
                </div>
              </div>
              
              <div className="p-4 flex-1 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold truncate text-lg group-hover:text-neon-green transition-colors">{item.title}</h4>
                  <span className="text-neon-green text-sm flex items-center gap-1 font-bold">
                    <Star className="w-3 h-3 fill-neon-green" /> {item.rating}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{item.year}</span>
                  <span>•</span>
                  <span>{item.genres.join(", ")}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}
