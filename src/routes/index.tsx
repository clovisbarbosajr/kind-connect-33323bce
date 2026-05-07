import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Info, Search, Menu, User, Star, LayoutGrid } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/")({
  component: Index,
});

const MOCK_TITLES = [
  { id: '1', slug: 'breaking-bad', title: 'Breaking Bad', year: 2008, imdb_rating: 9.5, type: 'series', backdrop: 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?q=80&w=1000', poster: 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?q=80&w=400' },
  { id: '2', slug: 'the-witcher', title: 'The Witcher', year: 2019, imdb_rating: 8.1, type: 'series', backdrop: 'https://images.unsplash.com/photo-1616466753066-512c14041d8e?q=80&w=1000', poster: 'https://images.unsplash.com/photo-1616466753066-512c14041d8e?q=80&w=400' },
  { id: '3', slug: 'inception', title: 'Inception', year: 2010, imdb_rating: 8.8, type: 'movie', backdrop: 'https://images.unsplash.com/photo-1604975712543-41a3199859cd?q=80&w=1000', poster: 'https://images.unsplash.com/photo-1604975712543-41a3199859cd?q=80&w=400' },
  { id: '4', slug: 'interstellar', title: 'Interstellar', year: 2014, imdb_rating: 8.7, type: 'movie', backdrop: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=1000', poster: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=400' },
  { id: '5', slug: 'stranger-things', title: 'Stranger Things', year: 2016, imdb_rating: 8.7, type: 'series', backdrop: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=1000', poster: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=400' },
  { id: '6', slug: 'the-last-of-us', title: 'The Last of Us', year: 2023, imdb_rating: 8.8, type: 'series', backdrop: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=1000', poster: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=400' },
];

function Index() {
  const [titles, setTitles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTitles() {
      try {
        const { data, error } = await supabase
          .from('titles')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(24);
        
        if (error) throw error;
        setTitles(data || []);
      } catch (e) {
        console.error("[Home] Supabase Query Error:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchTitles();
  }, []);

  const displayTitles = titles.length > 0 ? titles : MOCK_TITLES;
  const hero = displayTitles[0];

  return (
    <div className="min-h-screen bg-black text-white selection:bg-primary selection:text-black">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-gradient-to-b from-black/80 to-transparent backdrop-blur-sm">
        <div className="flex items-center gap-10">
          <Link to="/" className="text-2xl font-black text-primary tracking-tighter">STARCK</Link>
          <div className="hidden lg:flex items-center gap-6 text-sm font-medium text-gray-300">
            <Link to="/" className="hover:text-white transition">Início</Link>
            <div className="group relative cursor-pointer hover:text-white transition">
              Gêneros
              <div className="absolute top-full left-0 hidden group-hover:grid grid-cols-2 w-48 bg-zinc-900/95 border border-zinc-800 p-2 rounded shadow-xl mt-2">
                {['Ação', 'Comédia', 'Terror', 'Ficção', 'Anime', 'Drama'].map(g => (
                  <div key={g} className="p-2 hover:bg-zinc-800 rounded text-xs transition">{g}</div>
                ))}
              </div>
            </div>
            <Link to="/" className="hover:text-white transition">Filmes</Link>
            <Link to="/" className="hover:text-white transition">Séries</Link>
            <Link to="/" className="hover:text-white transition">Animes</Link>
            <Link to="/" className="hover:text-white transition">Top IMDb</Link>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <Search className="w-5 h-5 cursor-pointer text-gray-300 hover:text-white transition" />
          <User className="w-5 h-5 cursor-pointer text-gray-300 hover:text-white transition" />
          <Menu className="lg:hidden w-6 h-6 cursor-pointer" />
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative h-[85vh] w-full overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-transparent z-10" />
        
        {loading ? (
          <Skeleton className="w-full h-full bg-zinc-900" />
        ) : (
          <motion.img 
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1 }}
            src={hero.backdrop} 
            className="w-full h-full object-cover" 
            alt={hero.title} 
          />
        )}

        <div className="absolute bottom-32 left-6 lg:left-12 z-20 max-w-2xl">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-64 bg-zinc-800" />
              <Skeleton className="h-4 w-96 bg-zinc-800" />
              <Skeleton className="h-10 w-32 bg-zinc-800" />
            </div>
          ) : (
            <>
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <Badge variant="secondary" className="bg-primary text-black font-bold">RECOMENDADO</Badge>
                  <div className="flex items-center text-yellow-500 gap-1 font-bold">
                    <Star className="w-4 h-4 fill-current" /> {hero.imdb_rating}
                  </div>
                </div>
                <h1 className="text-5xl lg:text-7xl font-black mb-6 tracking-tight uppercase">{hero.title}</h1>
                <p className="text-lg text-gray-300 mb-8 line-clamp-3 leading-relaxed">
                  {hero.synopsis || "Assista ao melhor do entretenimento com qualidade 4K e áudio premium. Disponível para streaming agora."}
                </p>
                <div className="flex flex-wrap gap-4">
                  <Link 
                    to="/watch/$slug" 
                    params={{ slug: hero.slug }}
                    className="flex items-center gap-2 bg-primary text-black px-8 py-3 rounded-full font-bold hover:scale-105 transition-all shadow-lg shadow-primary/20"
                  >
                    <Play className="w-5 h-5 fill-current" /> Assistir Agora
                  </Link>
                  <button className="flex items-center gap-2 bg-zinc-800/80 backdrop-blur px-8 py-3 rounded-full font-bold hover:bg-zinc-700 transition">
                    <Info className="w-5 h-5" /> Detalhes
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </div>
      </header>

      {/* Grid Section */}
      <main className="px-6 lg:px-12 py-20 relative z-20 -mt-20">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-8 bg-primary rounded-full" />
            <h2 className="text-2xl font-black tracking-tight uppercase">Últimos Lançamentos</h2>
          </div>
          <Link to="/" className="text-xs font-bold text-gray-400 hover:text-primary transition uppercase tracking-widest">Ver Tudo</Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {loading ? (
            Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-[2/3] rounded-xl bg-zinc-900 shadow-2xl" />
                <Skeleton className="h-4 w-3/4 bg-zinc-900" />
              </div>
            ))
          ) : (
            displayTitles.map((title) => (
              <Link 
                key={title.id} 
                to="/watch/$slug" 
                params={{ slug: title.slug }}
                className="group relative"
              >
                <motion.div 
                  whileHover={{ y: -10 }}
                  className="relative aspect-[2/3] rounded-xl overflow-hidden shadow-2xl transition-all"
                >
                  <img 
                    src={title.poster || title.backdrop} 
                    className="w-full h-full object-cover transition duration-500 group-hover:scale-110" 
                    alt={title.title} 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
                  
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-black scale-0 group-hover:scale-100 transition-transform">
                      <Play className="w-6 h-6 fill-current ml-1" />
                    </div>
                  </div>

                  {/* Quality/Rating Badges */}
                  <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                    <Badge className="bg-zinc-900/90 text-primary text-[10px] font-black border-none">4K</Badge>
                    <div className="bg-zinc-900/90 px-1.5 py-0.5 rounded text-[10px] flex items-center gap-0.5">
                      <Star className="w-2.5 h-2.5 text-yellow-500 fill-current" /> {title.imdb_rating || 'N/A'}
                    </div>
                  </div>
                </motion.div>
                <div className="mt-4">
                  <h3 className="font-bold text-sm truncate group-hover:text-primary transition">{title.title}</h3>
                  <p className="text-[10px] text-gray-500 font-medium uppercase tracking-tighter mt-1">
                    {title.year} • {title.type === 'movie' ? 'Filme' : 'Série'}
                  </p>
                </div>
              </Link>
            ))
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950 px-6 lg:px-12 py-10 mt-20">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-xl font-black text-primary">STARCK FILMES</div>
          <div className="flex gap-8 text-xs font-bold text-gray-500">
            <Link to="/" className="hover:text-white transition">CONTATO</Link>
            <Link to="/" className="hover:text-white transition">DMCA</Link>
            <Link to="/" className="hover:text-white transition">PRIVACIDADE</Link>
          </div>
          <div className="text-[10px] text-gray-600">© 2026 Starck Filmes. Todos os direitos reservados.</div>
        </div>
      </footer>
    </div>
  );
}
