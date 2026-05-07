import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Star, Calendar, ChevronLeft, Download, Info,
  Tv, X, ChevronDown, Magnet, MonitorPlay
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { InwiseLogo } from "@/components/InwiseLogo";
import TorrentPlayer from "@/components/TorrentPlayer";

export const Route = createFileRoute("/watch/$slug")({
  component: Watch,
});

interface TorrentChoice {
  magnet: string;
  label: string;
  quality: string;
  audio: string;
}

function Watch() {
  const { slug } = Route.useParams();
  const [title, setTitle]       = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<any>(null);
  const [selectedTorrent, setSelectedTorrent]     = useState<string | null>(null);
  const [selectedTorrentLabel, setSelectedTorrentLabel] = useState("");
  const [openSeasons, setOpenSeasons] = useState<Set<number>>(new Set([1]));
  const [choiceModal, setChoiceModal] = useState<TorrentChoice | null>(null);

  useEffect(() => {
    async function load() {
      try {
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
      } catch (e) {
        console.error("Erro ao carregar:", e);
        setError(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  const toggleSeason = (num: number) => {
    setOpenSeasons(prev => {
      const next = new Set(prev);
      if (next.has(num)) next.delete(num);
      else next.add(num);
      return next;
    });
  };

  // Show choice dialog before playing
  const handleTorrentClick = (magnet: string, label: string, quality = "", audio = "") => {
    setChoiceModal({ magnet, label, quality, audio });
  };

  const openPlayer = (magnet: string, label: string) => {
    setChoiceModal(null);
    setSelectedTorrent(magnet);
    setSelectedTorrentLabel(label);
  };

  const downloadTorrent = (magnet: string) => {
    setChoiceModal(null);
    window.location.href = magnet;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <Skeleton className="w-full h-[55vh] rounded-2xl bg-zinc-900 mb-8" />
        <div className="max-w-4xl space-y-4">
          <Skeleton className="h-12 w-96 bg-zinc-800" />
          <Skeleton className="h-4 w-full bg-zinc-800" />
          <Skeleton className="h-4 w-2/3 bg-zinc-800" />
        </div>
      </div>
    );
  }

  if (error || !title) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-8 text-center">
        <h2 className="text-4xl font-black text-primary mb-4 uppercase">Conteúdo Indisponível</h2>
        <p className="text-zinc-500 mb-8 max-w-md">Este título não foi encontrado ou ainda não foi importado pelo crawler.</p>
        <Button asChild className="bg-primary text-black font-black uppercase tracking-widest px-8 rounded-full">
          <Link to="/">Voltar para Home</Link>
        </Button>
      </div>
    );
  }

  const sortedSeasons = (title.seasons || []).sort((a: any, b: any) => a.season_number - b.season_number);
  const isSeries = title.type === 'series' || title.type === 'anime';

  return (
    <div className="min-h-screen bg-black text-white selection:bg-primary selection:text-black">

      {/* ── Choice Modal (Assistir / Baixar) ── */}
      <AnimatePresence>
        {choiceModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4"
            onClick={() => setChoiceModal(null)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              onClick={e => e.stopPropagation()}
              className="bg-zinc-950 border border-zinc-800 rounded-3xl p-8 max-w-sm w-full shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="font-black text-lg uppercase tracking-tight text-white italic">{title.title}</h3>
                  <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mt-1">{choiceModal.label}</p>
                </div>
                <button onClick={() => setChoiceModal(null)} className="text-zinc-600 hover:text-white transition-colors ml-4 mt-0.5">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Quality badge */}
              <div className="flex gap-2 mb-6">
                {choiceModal.quality && (
                  <Badge className="bg-[#c8ff00] text-black font-black text-[10px] uppercase">
                    {choiceModal.quality}
                  </Badge>
                )}
                {choiceModal.audio && (
                  <Badge className="bg-zinc-800 text-zinc-300 font-black text-[10px] uppercase border-none">
                    {choiceModal.audio}
                  </Badge>
                )}
              </div>

              {/* Buttons */}
              <div className="flex flex-col gap-3">
                <Button
                  onClick={() => openPlayer(choiceModal.magnet, choiceModal.label)}
                  className="w-full h-14 bg-[#c8ff00] hover:bg-white text-black font-black uppercase tracking-widest text-sm rounded-2xl border-none gap-3 transition-all hover:scale-[1.02]"
                >
                  <MonitorPlay className="w-5 h-5" />
                  Assistir Online
                </Button>
                <Button
                  onClick={() => downloadTorrent(choiceModal.magnet)}
                  variant="outline"
                  className="w-full h-14 bg-transparent border border-zinc-700 hover:border-zinc-500 text-white font-black uppercase tracking-widest text-sm rounded-2xl gap-3 transition-all hover:bg-zinc-900"
                >
                  <Download className="w-5 h-5" />
                  Baixar Torrent
                </Button>
              </div>

              <p className="text-zinc-700 text-[9px] font-black uppercase tracking-widest text-center mt-4">
                "Assistir" usa WebTorrent no navegador • "Baixar" abre no cliente torrent
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Player Modal ── */}
      <AnimatePresence>
        {selectedTorrent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/98 backdrop-blur-xl flex flex-col p-4 md:p-6"
          >
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-lg font-black uppercase tracking-wide italic text-[#c8ff00]">{title.title}</h2>
                {selectedTorrentLabel && (
                  <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">{selectedTorrentLabel}</p>
                )}
              </div>
              <Button onClick={() => setSelectedTorrent(null)} variant="ghost" className="h-11 w-11 rounded-full bg-zinc-900 border border-zinc-800 text-white hover:bg-zinc-800">
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="flex-1 w-full max-w-5xl mx-auto rounded-2xl overflow-hidden border border-white/5 shadow-2xl">
              <TorrentPlayer magnet={selectedTorrent} title={title.title} poster={title.backdrop || title.poster} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backdrop Hero */}
      <div className="relative h-[60vh] w-full overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/10 z-10" />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/20 to-transparent z-10" />
        <motion.img
          initial={{ scale: 1.08, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.2 }}
          src={title.backdrop || title.poster}
          className="w-full h-full object-cover"
          alt={title.title}
        />

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 z-20 px-6 lg:px-10 py-5 flex items-center justify-between">
          <Button asChild variant="ghost" className="text-white hover:text-primary gap-2 font-bold uppercase tracking-widest text-xs px-0 hover:bg-transparent">
            <Link to="/"><ChevronLeft className="w-4 h-4" /> Voltar</Link>
          </Button>
          <Link to="/"><InwiseLogo size="sm" /></Link>
        </div>

        {/* Title info */}
        <div className="absolute bottom-8 left-6 lg:left-10 z-20 max-w-2xl">
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <Badge className="bg-[#c8ff00] text-black font-black uppercase text-[9px] px-3 py-1 tracking-widest">
              {title.type === 'movie' ? 'Filme' : title.type === 'anime' ? 'Anime' : 'Série'}
            </Badge>
            {title.imdb_rating && (
              <div className="flex items-center gap-1.5 font-black text-base text-yellow-400">
                <Star className="w-4 h-4 fill-current" />
                {Number(title.imdb_rating).toFixed(1)}
              </div>
            )}
            {title.year && (
              <span className="text-zinc-400 font-black text-sm flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> {title.year}
              </span>
            )}
            <Badge variant="outline" className="border-zinc-600 text-zinc-300 text-[9px] font-black">4K ULTRA HD</Badge>
          </div>

          <h1 className="text-4xl lg:text-6xl font-black mb-3 tracking-tighter uppercase italic text-[#c8ff00] leading-none drop-shadow-2xl">
            {title.title}
          </h1>
          {title.synopsis && (
            <p className="text-sm text-zinc-300 line-clamp-2 max-w-lg leading-relaxed">
              {title.synopsis}
            </p>
          )}
        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-6xl mx-auto px-6 lg:px-10 py-10">
        {isSeries && sortedSeasons.length > 0 ? (
          /* ── SERIES LAYOUT ── */
          <div className="space-y-4">
            <h2 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2 mb-6">
              <Tv className="w-5 h-5 text-primary" /> Temporadas &amp; Episódios
            </h2>

            {sortedSeasons.map((season: any) => {
              const episodes = (season.episodes || []).sort((a: any, b: any) => a.episode_number - b.episode_number);
              const isOpen = openSeasons.has(season.season_number);

              return (
                <div key={season.id} className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl overflow-hidden">
                  {/* Season header */}
                  <button
                    onClick={() => toggleSeason(season.season_number)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-zinc-800/40 transition group"
                  >
                    <div className="flex items-center gap-4">
                      <span className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black text-sm">
                        {season.season_number}
                      </span>
                      <span className="font-black text-base uppercase tracking-wide">
                        Temporada {season.season_number}
                      </span>
                      <Badge className="bg-zinc-800 text-zinc-400 border-none font-black text-[9px]">
                        {episodes.length} ep.
                      </Badge>
                    </div>
                    <ChevronDown className={`w-5 h-5 text-zinc-500 group-hover:text-primary transition-all ${isOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Episodes list */}
                  {isOpen && (
                    <div className="border-t border-zinc-800/50 divide-y divide-zinc-800/30">
                      {episodes.map((ep: any) => {
                        const opts = ep.torrent_options || [];
                        return (
                          <div key={ep.id} className="px-6 py-4 hover:bg-zinc-800/20 transition group">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex items-start gap-4">
                                <span className="min-w-[2.5rem] text-center font-black text-xs text-primary bg-primary/10 rounded-lg px-2 py-1.5">
                                  EP{String(ep.episode_number).padStart(2, '0')}
                                </span>
                                <div>
                                  <h4 className="font-bold text-sm text-white group-hover:text-primary transition leading-tight">
                                    {ep.title || `Episódio ${ep.episode_number}`}
                                  </h4>
                                  {ep.quality && (
                                    <span className="text-[10px] text-zinc-600 font-black uppercase">{ep.quality}</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2 sm:flex-shrink-0">
                                {opts.length > 0 ? opts.map((opt: any) => (
                                  <Button
                                    key={opt.id}
                                    size="sm"
                                    onClick={() => handleTorrentClick(
                                      opt.magnet,
                                      `T${season.season_number}E${String(ep.episode_number).padStart(2,'0')} • ${opt.quality || ''} ${opt.audio_type || ''}`.trim(),
                                      opt.quality,
                                      opt.audio_type
                                    )}
                                    className="h-8 px-4 bg-zinc-800 hover:bg-primary hover:text-black text-white border-none font-black text-[10px] uppercase transition-all rounded-lg gap-1.5"
                                  >
                                    <Play className="w-3 h-3 fill-current" />
                                    {opt.quality || '1080p'}
                                    {opt.audio_type && ` • ${opt.audio_type}`}
                                  </Button>
                                )) : (
                                  <span className="text-[10px] text-zinc-700 font-black uppercase italic">Em breve</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* ── MOVIE LAYOUT ── */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-6">
              <h2 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
                <Download className="w-5 h-5 text-primary" /> Opções de Torrent
              </h2>

              {title.torrent_options?.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {title.torrent_options.map((opt: any) => (
                    <div
                      key={opt.id}
                      onClick={() => handleTorrentClick(opt.magnet, `${opt.quality || ''} ${opt.audio_type || ''}`.trim(), opt.quality, opt.audio_type)}
                      className="bg-zinc-900/60 border border-zinc-800/50 p-5 rounded-2xl flex flex-col gap-3 hover:border-primary/50 transition cursor-pointer group"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <Badge className="bg-primary text-black font-black px-2 mb-1.5 uppercase text-[10px]">
                            {opt.quality || '1080p'}
                          </Badge>
                          <h4 className="font-black text-lg italic">{opt.audio_type || 'Dual Áudio'}</h4>
                          {opt.language && (
                            <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">{opt.language}</p>
                          )}
                        </div>
                        <div className="w-11 h-11 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:bg-primary group-hover:text-black transition-all">
                          <Play className="w-5 h-5 fill-current" />
                        </div>
                      </div>
                      <div className="flex gap-2 w-full">
                        <Button className="flex-1 bg-[#c8ff00] group-hover:bg-white text-black font-black uppercase tracking-widest py-6 rounded-xl transition-all border-none text-xs gap-2">
                          <MonitorPlay className="w-4 h-4" /> Assistir
                        </Button>
                        <Button
                          onClick={e => { e.stopPropagation(); downloadTorrent(opt.magnet); }}
                          variant="outline"
                          className="h-full px-4 bg-transparent border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-white rounded-xl"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-16 border-2 border-dashed border-zinc-900 rounded-2xl text-center">
                  <p className="text-zinc-700 font-black uppercase tracking-[0.3em] text-xs">
                    Nenhum torrent disponível. Execute o crawler para importar.
                  </p>
                </div>
              )}
            </div>

            {/* Movie info sidebar */}
            <div className="space-y-6">
              <h2 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
                <Info className="w-5 h-5 text-primary" /> Informações
              </h2>
              <div className="bg-zinc-900/50 border border-zinc-800/50 p-6 rounded-2xl space-y-4">
                {[
                  ['Título', title.title],
                  ['Ano', title.year],
                  ['IMDb', title.imdb_rating ? `★ ${Number(title.imdb_rating).toFixed(1)}` : null],
                  ['Tipo', title.type === 'movie' ? 'Filme' : title.type === 'anime' ? 'Anime' : 'Série'],
                  ['Qualidade', '4K / 1080p'],
                ].filter(([, v]) => v).map(([label, value]) => (
                  <div key={String(label)} className="flex justify-between border-b border-zinc-800/40 pb-3 last:border-0 last:pb-0">
                    <span className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">{label}</span>
                    <span className={`font-black text-sm ${label === 'IMDb' ? 'text-yellow-400' : ''}`}>{String(value)}</span>
                  </div>
                ))}
              </div>

              {title.synopsis && (
                <div className="bg-zinc-900/30 border border-zinc-800/30 p-6 rounded-2xl">
                  <h3 className="font-black uppercase text-[10px] tracking-[0.3em] text-zinc-500 mb-3">Sinopse</h3>
                  <p className="text-sm text-zinc-300 leading-relaxed">{title.synopsis}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <footer className="border-t border-zinc-900 py-12 px-6 text-center">
        <Link to="/"><InwiseLogo size="md" className="justify-center mb-3" /></Link>
        <p className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-700">
          © 2026 INWISE MOVIES • STREAMING DE ALTA FIDELIDADE
        </p>
      </footer>
    </div>
  );
}