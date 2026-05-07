import { useState, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Play, Star, ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface TitleRowProps {
  title: string;
  items: any[];
  loading: boolean;
}

export function TitleRow({ title, items, loading }: TitleRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const amount = direction === 'left' ? -scrollRef.current.clientWidth * 0.8 : scrollRef.current.clientWidth * 0.8;
      scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-4 mb-10 relative group/row">
      <div className="flex items-center justify-between px-6 lg:px-12">
        <h2 className="text-lg md:text-xl font-black tracking-tighter uppercase italic text-white flex items-center gap-2.5">
          <span className="w-1 h-5 bg-[#c8ff00] rounded-full" />
          {title}
        </h2>
        <Link to="/" className="text-[10px] font-black text-zinc-500 hover:text-primary transition uppercase tracking-[0.2em] border-b border-transparent hover:border-primary">
          Ver Tudo
        </Link>
      </div>

      <div className="relative">
        {showLeftArrow && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-0 bottom-0 z-40 bg-black/60 w-12 hidden md:flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity backdrop-blur-sm"
          >
            <ChevronLeft className="w-8 h-8 text-white" />
          </button>
        )}

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex overflow-x-auto gap-4 px-6 lg:px-12 no-scrollbar scroll-smooth"
        >
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="min-w-[130px] md:min-w-[170px] aspect-[2/3] rounded-xl bg-zinc-900 animate-pulse" />
            ))
          ) : items.length > 0 ? (
            items.map((item) => (
              <Link
                key={item.id}
                to="/watch/$slug"
                params={{ slug: item.slug }}
                className="min-w-[130px] md:min-w-[170px] group/card relative flex-shrink-0"
              >
                <motion.div
                  whileHover={{ scale: 1.05, zIndex: 10 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="relative aspect-[2/3] rounded-xl overflow-hidden shadow-2xl bg-zinc-900 border border-zinc-800/50"
                >
                  <img
                    src={item.poster || item.backdrop || 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=400'}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-110"
                    alt={item.title}
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />

                  {/* Quality badges */}
                  <div className="absolute top-2 right-2 flex flex-col gap-1 items-end opacity-0 group-hover/card:opacity-100 transition-opacity">
                    <Badge className="bg-primary text-black text-[8px] font-black border-none px-1 h-4">4K</Badge>
                    <Badge className="bg-zinc-950/90 text-white text-[8px] font-black border-none px-1 h-4">DUAL</Badge>
                  </div>

                  {/* IMDb */}
                  <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded flex items-center gap-1 border border-white/10">
                    <Star className="w-2.5 h-2.5 text-yellow-400 fill-current" />
                    <span className="text-[9px] font-black">{item.imdb_rating ? Number(item.imdb_rating).toFixed(1) : '?'}</span>
                  </div>

                  {/* Play overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/card:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-10 h-10 bg-[#c8ff00] rounded-full flex items-center justify-center text-black shadow-[0_0_15px_rgba(200,255,0,0.5)]">
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    </div>
                  </div>
                </motion.div>

                <div className="mt-2.5 px-1">
                  <h3 className="font-bold text-[11px] md:text-[13px] truncate group-hover:text-primary transition-colors uppercase tracking-tight">{item.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] text-zinc-500 font-black uppercase">{item.year || '—'}</span>
                    <span className="text-[9px] text-zinc-700">•</span>
                    <span className="text-[9px] text-zinc-500 font-black uppercase">
                      {item.type === 'movie' ? 'Filme' : item.type === 'anime' ? 'Anime' : 'Série'}
                    </span>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="flex items-center justify-center min-w-full h-40 border-2 border-dashed border-zinc-900 rounded-2xl">
              <p className="text-zinc-700 font-black uppercase text-xs tracking-widest">Em breve</p>
            </div>
          )}
        </div>

        {showRightArrow && !loading && items.length > 0 && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-0 bottom-0 z-40 bg-black/60 w-12 hidden md:flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity backdrop-blur-sm"
          >
            <ChevronRight className="w-8 h-8 text-white" />
          </button>
        )}
      </div>
    </div>
  );
}
