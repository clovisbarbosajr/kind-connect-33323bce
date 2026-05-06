import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Play, Star, Calendar, Info, Download, ArrowLeft, Loader2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import TorrentPlayer from "@/components/TorrentPlayer";

export const Route = createFileRoute("/watch/$slug")({
  component: ContentPlayer,
});

interface ContentItem {
  id: string;
  title: string;
  description: string | null;
  poster: string | null;
  backdrop: string | null;
  year: number | null;
  rating: number | null;
  category: 'movie' | 'series';
  genres: string[] | null;
  audio_type: string | null;
  resolution: string | null;
  magnet: string | null;
  size: string | null;
  seasons: any[] | null;
}

function ContentPlayer() {
  const { slug } = Route.useParams();
  const [item, setItem] = useState<ContentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPlayer, setShowPlayer] = useState(false);

  useEffect(() => {
    const fetchItem = async () => {
      const { data, error } = await supabase
        .from('catalog')
        .select('*')
        .eq('slug', slug)
        .single();
      
      if (!error && data) {
        setItem(data as ContentItem);
      }
      setLoading(false);
    };

    fetchItem();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-neon-green animate-spin" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold mb-4">Conteúdo não encontrado</h1>
        <a href="/" className="neon-button">Voltar para Home</a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* Backdrop Hero */}
      <div className="relative h-[60vh] w-full">
        <div className="absolute inset-0">
          <img 
            src={item.backdrop || ""} 
            alt={item.title} 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        </div>
        
        <button 
          onClick={() => window.history.back()}
          className="absolute top-6 left-6 z-10 p-2 rounded-full bg-black/50 backdrop-blur-md border border-white/10 hover:bg-neon-green hover:text-black transition-all"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
      </div>

      {/* Content Info */}
      <div className="container mx-auto px-6 -mt-32 relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-1">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl overflow-hidden shadow-2xl border border-white/10"
          >
            <img src={item.poster || ""} alt={item.title} className="w-full h-auto" />
          </motion.div>
        </div>

        <div className="lg:col-span-2 space-y-6 pt-12 lg:pt-32">
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-4xl md:text-6xl font-black"
          >
            {item.title}
          </motion.h1>

          <div className="flex flex-wrap items-center gap-4 text-sm font-bold">
            <span className="flex items-center gap-1 text-neon-green">
              <Star className="w-4 h-4 fill-neon-green" /> {item.rating}
            </span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <Calendar className="w-4 h-4" /> {item.year}
            </span>
            <span className="bg-neon-green/10 text-neon-green px-2 py-0.5 rounded border border-neon-green/30 uppercase text-[10px]">
              {item.resolution}
            </span>
            <span className="bg-white/5 px-2 py-0.5 rounded border border-white/10 uppercase text-[10px]">
              {item.audio_type}
            </span>
          </div>

          <p className="text-muted-foreground text-lg leading-relaxed max-w-3xl">
            {item.description}
          </p>

          <div className="flex flex-wrap gap-4 pt-4">
            <button 
              onClick={() => setShowPlayer(true)}
              className="neon-button flex items-center gap-2 px-8 py-3"
            >
              <Play className="w-6 h-6 fill-current" /> Assistir Online
            </button>
            <a 
              href={item.magnet || ""} 
              className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 px-8 py-3 rounded-full font-bold flex items-center gap-2 transition-all"
            >
              <Download className="w-6 h-6" /> Baixar Torrent
            </a>
          </div>

          {item.size && (
            <div className="text-sm text-muted-foreground font-medium">
              Tamanho: <span className="text-foreground">{item.size}</span>
            </div>
          )}
        </div>
      </div>

      {/* Torrent Player Modal */}
      <AnimatePresence>
        {showPlayer && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-12"
          >
            <div className="relative w-full max-w-6xl">
              <button 
                onClick={() => setShowPlayer(false)}
                className="absolute -top-12 right-0 text-white/50 hover:text-white flex items-center gap-2 transition-colors uppercase text-xs font-bold tracking-widest"
              >
                Fechar Player <X className="w-5 h-5" />
              </button>
              
              <TorrentPlayer 
                magnet={item.magnet || ""} 
                title={item.title} 
                poster={item.backdrop || ""} 
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
