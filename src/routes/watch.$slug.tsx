import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Play, Star, Calendar, Info, Download, ArrowLeft, Loader2, X, Share2, Plus, Clock, Database, Film, Tv } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import TorrentPlayer from "@/components/TorrentPlayer";
import { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/watch/$slug")({
  component: ContentPlayer,
});

type Movie = Tables<"movies">;

function ContentPlayer() {
  const { slug } = Route.useParams();
  const [item, setItem] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPlayer, setShowPlayer] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fetchItem = async () => {
      const { data, error } = await supabase
        .from('movies')
        .select('*')
        .eq('slug', slug)
        .single();
      
      if (!error && data) {
        setItem(data as Movie);
      }
      setLoading(false);
    };

    fetchItem();

    const handleScroll = () => setScrolled(window.scrollY > 100);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="relative">
           <Loader2 className="w-16 h-16 text-neon-green animate-spin opacity-20" />
           <div className="absolute inset-0 flex items-center justify-center font-black italic text-neon-green text-xs">INWISE</div>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 gap-6">
        <div className="text-8xl opacity-10 grayscale">🎬</div>
        <h1 className="text-3xl font-black italic uppercase tracking-tighter">Conteúdo não encontrado</h1>
        <a href="/" className="neon-button px-10">Voltar para Home</a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-32">
      {/* Dynamic Header */}
      <header className={`fixed top-0 w-full z-[80] px-6 py-4 flex items-center justify-between transition-all duration-500 ${scrolled ? 'bg-background/80 backdrop-blur-xl border-b border-white/5' : 'bg-transparent'}`}>
         <button 
          onClick={() => window.history.back()}
          className="flex items-center gap-2 text-xs font-black uppercase tracking-widest hover:text-neon-green transition-colors"
        >
          <ArrowLeft className="w-5 h-5" /> Voltar
        </button>
        <div className={`transition-all duration-500 ${scrolled ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
           <h2 className="font-black italic text-neon-green">{item.title}</h2>
        </div>
        <div className="flex items-center gap-4">
           <button className="p-2 rounded-full hover:bg-white/10 transition-colors"><Share2 size={20} /></button>
           <button className="p-2 rounded-full hover:bg-white/10 transition-colors"><Plus size={20} /></button>
        </div>
      </header>

      {/* Backdrop Hero */}
      <div className="relative h-[75vh] w-full">
        <div className="absolute inset-0">
          {item.backdrop || item.poster ? (
            <img 
              src={item.backdrop || item.poster || ""} 
              alt={item.title} 
              className="w-full h-full object-cover opacity-60"
            />
          ) : (
            <div className="w-full h-full bg-zinc-950 flex items-center justify-center">
               <Film className="w-20 h-20 text-white/5" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          <div className="absolute inset-0 bg-black/20" />
        </div>
      </div>

      {/* Content Info Container */}
      <div className="container mx-auto px-6 -mt-64 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        {/* Left Column: Poster */}
        <div className="hidden lg:block lg:col-span-3">
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.8)] border border-white/10 aspect-[2/3]"
          >
            {item.poster ? (
              <img src={item.poster} alt={item.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-zinc-900 flex flex-col items-center justify-center gap-2">
                <Film className="w-12 h-12 text-white/20" />
                <span className="text-[10px] text-white/40 uppercase font-black">Sem Poster</span>
              </div>
            )}
          </motion.div>
        </div>

        {/* Right Column: Info & Actions */}
        <div className="lg:col-span-9 space-y-8 pt-20">
          <div className="space-y-4">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3"
            >
              <span className="flex items-center gap-1 text-neon-green font-black italic bg-neon-green/10 px-3 py-1 rounded-full border border-neon-green/20 text-xs uppercase tracking-widest">
                <Star className="w-4 h-4 fill-neon-green" /> {item.rating} IMDB
              </span>
              <span className="text-white/40 text-xs font-black uppercase tracking-widest flex items-center gap-2">
                 <Clock size={14} /> 2h 15min
              </span>
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl md:text-7xl font-black tracking-tighter uppercase italic leading-[0.9]"
            >
              {item.title}
            </motion.h1>

            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex flex-wrap items-center gap-4 text-[10px] font-black uppercase tracking-[0.2em] pt-2"
            >
              <span className="flex items-center gap-2 text-muted-foreground"><Film size={14} /> {item.type === 'movie' ? 'Filme' : 'Série'}</span>
              <span className="text-muted-foreground">•</span>
              <span className="flex items-center gap-2 text-muted-foreground"><Calendar size={14} /> {item.year}</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-neon-green border border-neon-green/30 px-2 py-0.5 rounded">{item.resolution}</span>
              <span className="bg-white/10 px-2 py-0.5 rounded text-white/60">{item.audio_type}</span>
            </motion.div>
          </div>

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-muted-foreground text-lg md:text-xl leading-relaxed max-w-4xl"
          >
            {item.description || "Sinopse não disponível para este título. Mas garantimos uma experiência incrível de entretenimento em alta definição."}
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-wrap gap-6 pt-6"
          >
            <button 
              onClick={() => setShowPlayer(true)}
              className="neon-button flex items-center gap-3 px-12 py-5 text-xl group shadow-[0_0_30px_rgba(200,255,0,0.3)]"
            >
              <div className="bg-black text-neon-green p-1 rounded-full group-hover:bg-neon-green group-hover:text-black transition-colors">
                 <Play className="w-5 h-5 fill-current ml-0.5" />
              </div>
              ASSISTIR AGORA
            </button>
            <a 
              href={item.magnet || ""} 
              className="bg-white/5 hover:bg-white/10 backdrop-blur-xl border border-white/10 px-10 py-5 rounded-full font-black uppercase tracking-widest flex items-center gap-3 transition-all text-sm"
            >
              <Download className="w-5 h-5" /> BAIXAR TORRENT
            </a>
          </motion.div>

          <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ delay: 0.5 }}
             className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-8 border-t border-white/5"
          >
             <InfoItem label="Qualidade" value={item.resolution || "Full HD"} />
             <InfoItem label="Áudio" value={item.audio_type || "Dual Áudio"} />
             <InfoItem label="Tamanho" value={item.size || "1.8 GB"} />
             <InfoItem label="Status" value="Disponível" color="text-neon-green" />
          </motion.div>
        </div>
      </div>

      {/* Recommended Section (Placeholder logic) */}
      <section className="container mx-auto px-6 mt-32 space-y-8">
         <h3 className="text-2xl font-black italic uppercase tracking-tighter flex items-center gap-3">
            <span className="w-1 h-6 bg-neon-green rounded-full" />
            Você também pode gostar
         </h3>
         <div className="grid grid-cols-2 md:grid-cols-5 gap-6 opacity-40 grayscale">
            {[1,2,3,4,5].map(i => (
               <div key={i} className="aspect-[2/3] bg-white/5 rounded-xl border border-white/5"></div>
            ))}
         </div>
      </section>

      {/* Torrent Player Modal */}
      <AnimatePresence>
        {showPlayer && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-0 md:p-8"
          >
            <div className="relative w-full h-full md:h-auto md:max-w-6xl aspect-video bg-black shadow-[0_0_100px_rgba(0,0,0,1)] rounded-none md:rounded-2xl overflow-hidden border-none md:border md:border-white/10">
              <button 
                onClick={() => setShowPlayer(false)}
                className="absolute top-6 right-6 z-[110] bg-black/50 hover:bg-red-500 text-white p-2 rounded-full transition-all group"
              >
                <X className="w-6 h-6 group-hover:rotate-90 transition-transform" />
              </button>
              
              <TorrentPlayer 
                magnet={item.magnet || ""} 
                title={item.title} 
                poster={item.backdrop || item.poster || ""} 
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InfoItem({ label, value, color = "text-white" }: { label: string, value: string, color?: string }) {
  return (
    <div className="space-y-1">
       <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
       <div className={`font-bold text-sm ${color}`}>{value}</div>
    </div>
  );
}