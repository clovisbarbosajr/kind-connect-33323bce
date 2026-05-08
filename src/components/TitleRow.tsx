import { useRef } from "react";
import { Link } from "@tanstack/react-router";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface TitleRowProps {
  title: string;
  items: any[];
  loading: boolean;
}

function cleanTitle(t: string): string {
  if (!t) return t;
  return t
    .replace(/\s*(torrent|download|blu-?ray|4k|1080p|720p|legendado|dublado|dual[\s\-]?[áa]udio|hdrip|bdrip|webrip|web-dl|hdtv|remux|hdcam|\bts\b|\bcam\b|nacional)\s*/gi, ' ')
    .replace(/\s*\(\s*(?:19|20)\d{2}\s*\)\s*$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function TitleRow({ title, items, loading }: TitleRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -600 : 600, behavior: 'smooth' });
  };

  return (
    <div className="mb-6 relative group/row">
      <div className="flex items-center justify-between px-4 lg:px-10 mb-2.5">
        <h2 className="text-[12px] font-black uppercase tracking-widest text-white flex items-center gap-2">
          <span className="w-[3px] h-4 bg-[#00d4ff] rounded-full inline-block" />
          {title}
        </h2>
        <Link to="/" className="text-[9px] font-bold text-zinc-600 hover:text-[#00d4ff] transition uppercase tracking-widest">
          Ver Tudo →
        </Link>
      </div>

      <div className="relative">
        <button onClick={() => scroll('left')}
          className="absolute left-0 top-0 bottom-0 z-40 w-7 hidden md:flex items-center justify-center bg-gradient-to-r from-black to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity">
          <ChevronLeft className="w-4 h-4 text-white" />
        </button>

        <div ref={scrollRef} className="flex overflow-x-auto gap-[6px] px-4 lg:px-10 no-scrollbar pb-1">
          {loading
            ? Array.from({ length: 12 }).map((_, i) => (
                <Skeleton key={i} className="min-w-[110px] w-[110px] aspect-[2/3] rounded bg-zinc-900 flex-shrink-0" />
              ))
            : items.length > 0
            ? items.map((item) => (
                <Link key={item.id} to="/watch/$slug" params={{ slug: item.slug }}
                  title={cleanTitle(item.title)}
                  className="min-w-[110px] w-[110px] flex-shrink-0 group/card">
                  <div className="relative aspect-[2/3] rounded overflow-hidden bg-zinc-900">
                    <img
                      src={item.poster || item.backdrop || 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=300'}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover/card:scale-105"
                      alt={cleanTitle(item.title)}
                      loading="lazy"
                    />
                    {item.imdb_rating && (
                      <div className="absolute top-1 left-1 bg-yellow-400 text-black text-[8px] font-black px-1 py-0.5 rounded-sm flex items-center gap-0.5 leading-none">
                        <Star className="w-2 h-2 fill-current flex-shrink-0" />
                        {Number(item.imdb_rating).toFixed(1)}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover/card:bg-black/40 transition-all duration-200 flex items-center justify-center">
                      <div className="w-7 h-7 bg-[#00d4ff] rounded-full items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity hidden group-hover/card:flex">
                        <svg className="w-3 h-3 fill-black ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                      </div>
                    </div>
                  </div>
                  <p className="mt-1 text-[9px] text-zinc-500 truncate group-hover/card:text-white transition-colors px-0.5 leading-tight">
                    {cleanTitle(item.title)}
                  </p>
                </Link>
              ))
            : <div className="flex items-center justify-center w-full h-28 text-zinc-700 text-[10px] uppercase tracking-widest font-bold">Em breve</div>}
        </div>

        <button onClick={() => scroll('right')}
          className="absolute right-0 top-0 bottom-0 z-40 w-7 hidden md:flex items-center justify-center bg-gradient-to-l from-black to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity">
          <ChevronRight className="w-4 h-4 text-white" />
        </button>
      </div>
    </div>
  );
}
