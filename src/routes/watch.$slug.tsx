import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { Play, Star, ChevronLeft, Download, Film, Tv, Languages, Info, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import TorrentPlayer from "@/components/TorrentPlayer";

export const Route = createFileRoute("/watch/$slug")({
  component: Watch,
});

function Watch() {
  const { slug } = Route.useParams();
  const [title, setTitle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [activeEpisode, setActiveEpisode] = useState<any>(null);

  useEffect(() => {
    async function load() {
      try {
        console.log(`[Watch] Loading slug: ${slug}`);
        const { data, error: fetchError } = await supabase
          .from('titles')
          .select(`
            *,
            torrent_options(*),
            seasons(
              *,
              episodes(
                *,
                torrent_options(*)
              )
            )
          `)
          .eq('slug', slug)
          .single();

        if (fetchError) throw fetchError;
        setTitle(data);
        
        // Auto-select first episode if series
        if (data.type === 'series' && data.seasons?.[0]?.episodes?.[0]) {
          setActiveEpisode(data.seasons[0].episodes[0]);
        }
      } catch (e) {
        console.error("Erro ao carregar detalhes:", e);
        setError(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  if (loading) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
      <Skeleton className="w-16 h-16 rounded-full bg-primary/20 animate-pulse" />
      <p className="text-primary font-black animate-pulse uppercase tracking-widest text-xs">Carregando Streaming...</p>
    </div>
  );

  if (error || !title) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
      <h2 className="text-2xl font-black text-red-500 mb-4 uppercase">Conteúdo Indisponível</h2>
      <p className="text-gray-400 mb-8 max-w-md">Não conseguimos encontrar este título no catálogo no momento. Tente novamente mais tarde.</p>
      <Link to="/" className="bg-primary text-black px-8 py-3 rounded-full font-bold">Voltar para Home</Link>
    </div>
  );

  const torrents = title.type === 'movie' 
    ? title.torrent_options 
    : activeEpisode?.torrent_options;

  return (
    <div className="min-h-screen bg-black text-white selection:bg-primary selection:text-black">
      {/* Background/Backdrop */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent z-10" />
        <img src={title.backdrop} className="w-full h-full object-cover opacity-30 grayscale-[50%]" alt="" />
      </div>

      <div className="relative z-10 p-6 lg:p-12">
        {/* Header */}
        <header className="flex items-center gap-4 mb-12">
          <Link to="/" className="w-10 h-10 bg-zinc-900 rounded-full flex items-center justify-center hover:bg-primary hover:text-black transition">
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-3xl lg:text-5xl font-black tracking-tighter uppercase">{title.title}</h1>
            <div className="flex items-center gap-3 mt-2 text-xs font-bold text-gray-400">
              <span className="flex items-center gap-1 text-yellow-500">
                <Star className="w-3 h-3 fill-current" /> {title.imdb_rating}
              </span>
              <span>•</span>
              <span>{title.year}</span>
              <span>•</span>
              <Badge className="bg-zinc-800 text-gray-300 text-[10px] uppercase">{title.type === 'movie' ? 'Filme' : 'Série'}</Badge>
            </div>
          </div>
        </header>

        <main className="grid lg:grid-cols-3 gap-12">
          {/* Content Info */}
          <div className="lg:col-span-2 space-y-8">
            {/* Player Placeholder / Video Info */}
            <div className="rounded-2xl border border-zinc-800 overflow-hidden shadow-2xl relative">
              {activeEpisode ? (
                <TorrentPlayer 
                  magnet={activeEpisode.torrent_options?.[0]?.magnet} 
                  title={`${title.title} - S${activeEpisode.season_number}E${activeEpisode.episode_number}`}
                  poster={title.backdrop}
                />
              ) : title.type === 'movie' && title.torrent_options?.[0] ? (
                <TorrentPlayer 
                  magnet={title.torrent_options[0].magnet} 
                  title={title.title}
                  poster={title.backdrop}
                />
              ) : (
                <div className="aspect-video bg-zinc-900 flex flex-col items-center justify-center p-6 text-center">
                  <Play className="w-20 h-20 text-zinc-800 mb-4" />
                  <p className="text-gray-500 font-bold uppercase tracking-tighter">Selecione uma opção de torrent para começar</p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-1 h-6 bg-primary" />
                <h2 className="text-xl font-black uppercase tracking-tight">Sinopse</h2>
              </div>
              <p className="text-gray-400 leading-relaxed text-lg">{title.synopsis || "Nenhuma descrição disponível para este título."}</p>
            </div>

            {/* Episode List if Series */}
            {title.type === 'series' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-6 bg-primary" />
                    <h2 className="text-xl font-black uppercase tracking-tight">Temporadas</h2>
                  </div>
                  <div className="flex gap-2">
                    {title.seasons?.sort((a: any, b: any) => a.season_number - b.season_number).map((s: any) => (
                      <button 
                        key={s.id}
                        onClick={() => setSelectedSeason(s.season_number)}
                        className={`px-4 py-1 rounded text-xs font-bold transition ${selectedSeason === s.season_number ? 'bg-primary text-black' : 'bg-zinc-900 text-gray-500'}`}
                      >
                        T{s.season_number}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  {title.seasons?.find((s: any) => s.season_number === selectedSeason)?.episodes?.sort((a: any, b: any) => a.episode_number - b.episode_number).map((ep: any) => (
                    <button 
                      key={ep.id}
                      onClick={() => setActiveEpisode(ep)}
                      className={`flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${activeEpisode?.id === ep.id ? 'bg-primary/10 border-primary shadow-lg shadow-primary/5' : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'}`}
                    >
                      <div className="w-10 h-10 rounded bg-zinc-800 flex items-center justify-center font-black text-sm text-primary">
                        {ep.episode_number}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm truncate">{ep.title}</h4>
                        <span className="text-[10px] text-gray-500 font-bold uppercase">{ep.torrent_options?.length || 0} OPÇÕES</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Torrents List */}
          <aside className="space-y-6">
            <div className="flex items-center gap-2">
              <div className="w-1 h-6 bg-primary" />
              <h2 className="text-xl font-black uppercase tracking-tight">Opções de Download / Stream</h2>
            </div>
            
            <div className="space-y-3">
              {torrents && torrents.length > 0 ? torrents.map((opt: any) => (
                <div key={opt.id} className="bg-zinc-900/80 backdrop-blur border border-zinc-800 p-5 rounded-2xl space-y-4 hover:border-primary/50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className="bg-primary text-black font-black text-[10px]">{opt.quality}</Badge>
                        <span className="text-xs font-bold text-gray-400 flex items-center gap-1">
                          <Languages className="w-3 h-3" /> {opt.audio_type}
                        </span>
                      </div>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{opt.language || 'PORTUGUÊS'}</p>
                    </div>
                    <div className="text-right text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded">
                      {opt.size || 'N/A'}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <Button className="w-full bg-primary text-black font-black hover:scale-105 transition">
                      ASSISTIR
                    </Button>
                    <Button variant="outline" className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800" asChild>
                      <a href={opt.magnet}>MAGNET</a>
                    </Button>
                  </div>
                </div>
              )) : (
                <div className="p-8 text-center bg-zinc-900/50 rounded-2xl border border-zinc-800">
                  <Info className="w-10 h-10 text-zinc-700 mx-auto mb-4" />
                  <p className="text-sm text-gray-500 font-bold uppercase tracking-tighter">Nenhuma opção disponível para este episódio ainda.</p>
                </div>
              )}
            </div>

            {/* Help/Ad Section */}
            <div className="p-6 bg-zinc-900/30 rounded-2xl border border-dashed border-zinc-800 text-center">
              <MessageSquare className="w-6 h-6 text-primary mx-auto mb-3" />
              <h4 className="text-xs font-black uppercase tracking-widest mb-2">Precisa de Ajuda?</h4>
              <p className="text-[10px] text-gray-500 mb-4">Se o torrent não carregar, tente outra opção ou use o Magnet Link direto.</p>
              <Button size="sm" variant="link" className="text-primary text-[10px] font-black uppercase">Reportar Erro</Button>
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}
