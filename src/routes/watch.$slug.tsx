import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Star, ChevronLeft, Download, Info,
  Tv, X, ChevronDown, Youtube
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { InwiseLogo } from "@/components/InwiseLogo";

export const Route = createFileRoute("/watch/$slug")({
  component: Watch,
});

function cleanTitle(t: string): string {
  if (!t) return t;
  return t
    .replace(/\s*(torrent|download|blu-?ray|4k|1080p|720p|legendado|dublado|dual[\s\-]?[áa]udio|hdrip|bdrip|webrip|web-dl|hdtv|remux|hdcam|\bts\b|\bcam\b|nacional)\s*/gi, ' ')
    .replace(/\s*\(\s*(?:19|20)\d{2}\s*\)\s*$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

interface TorrentChoice {
  magnet: string;
  label: string;
  quality: string;
  audio: string;
}

function Watch() {
  const { slug } = Route.useParams();
  const [title, setTitle]           = useState<any>(null);
  const [related, setRelated]       = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<any>(null);
  const [openSeasons, setOpenSeasons] = useState<Set<number>>(new Set([1]));
  const [choiceModal, setChoiceModal] = useState<TorrentChoice | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const { data, error: fetchError } = await supabase
          .from('titles')
          .select(`*, torrent_options(*), seasons(*, episodes(*, torrent_options(*)))`)
          .eq('slug', slug)
          .single();
        if (fetchError) throw fetchError;
        setTitle(data);

        // load related titles
        const { data: rel } = await supabase
          .from('titles')
          .select('id, title, poster, imdb_rating, year, slug, type')
          .eq('type', data.type)
          .neq('slug', slug)
          .limit(8);
        setRelated(rel || []);
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
      if (next.has(num)) next.delete(num); else next.add(num);
      return next;
    });
  };

  const handleTorrentClick = (magnet: string, label: string, quality = "", audio = "") => {
    setChoiceModal({ magnet, label, quality, audio });
  };

  const openPlayer = (magnet: string) => {
    setChoiceModal(null);
    window.location.href = magnet;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] text-white p-8">
        <Skeleton className="w-full h-[42vh] rounded-none bg-zinc-900 mb-8" />
        <div className="max-w-5xl mx-auto space-y-4">
          <Skeleton className="h-8 w-80 bg-zinc-800" />
          <Skeleton className="h-4 w-full bg-zinc-800" />
          <Skeleton className="h-4 w-2/3 bg-zinc-800" />
        </div>
      </div>
    );
  }

  if (error || !title) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] text-white flex flex-col items-center justify-center p-8 text-center">
        <h2 className="text-2xl font-bold text-primary mb-4">Conteúdo Indisponível</h2>
        <p className="text-zinc-500 mb-8 max-w-md">Este título não foi encontrado.</p>
        <Button asChild className="bg-primary text-black font-bold px-8 rounded-full">
          <Link to="/">Voltar para Home</Link>
        </Button>
      </div>
    );
  }

  const sortedSeasons = (title.seasons || []).sort((a: any, b: any) => a.season_number - b.season_number);
  const isSeries = title.type === 'series' || title.type === 'anime';
  const displayTitle = cleanTitle(title.title);
  const firstOpt = title.torrent_options?.[0];
  const mainLanguage = firstOpt?.language || firstOpt?.audio_type || '';
  const mainSize = firstOpt?.size || '';
  const mainQuality = firstOpt?.quality || '1080p';
  const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(displayTitle + ' trailer')}`;
  const typeLabel = title.type === 'movie' ? 'Filme' : title.type === 'anime' ? 'Anime' : 'Série';

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white">

      {/* ── Choice Modal ── */}
      <AnimatePresence>
        {choiceModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4"
            onClick={() => setChoiceModal(null)}
          >
            <motion.div
              initial={{ scale: 0.93, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.93, opacity: 0, y: 16 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              onClick={e => e.stopPropagation()}
              className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-bold text-base text-white">{displayTitle}</h3>
                  <p className="text-zinc-500 text-xs mt-0.5">{choiceModal.label}</p>
                </div>
                <button onClick={() => setChoiceModal(null)} className="text-zinc-600 hover:text-white ml-3">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex gap-2 mb-5">
                {choiceModal.quality && (
                  <Badge className="bg-[#00d4ff] text-black font-bold text-[10px] uppercase">{choiceModal.quality}</Badge>
                )}
                {choiceModal.audio && (
                  <Badge className="bg-zinc-800 text-zinc-300 font-bold text-[10px] uppercase border-none">{choiceModal.audio}</Badge>
                )}
              </div>
              <div className="flex flex-col gap-3">
                <Button
                  onClick={() => openPlayer(choiceModal.magnet)}
                  className="w-full h-12 bg-[#00d4ff] hover:bg-cyan-300 text-black font-bold rounded-xl gap-2"
                >
                  <Play className="w-4 h-4 fill-current" /> Abrir no Player Local
                </Button>
                <Button
                  onClick={() => openPlayer(choiceModal.magnet)}
                  variant="outline"
                  className="w-full h-12 bg-transparent border border-zinc-700 hover:border-zinc-500 text-white font-bold rounded-xl gap-2"
                >
                  <Download className="w-4 h-4" /> Baixar Torrent
                </Button>
              </div>
              <p className="text-zinc-700 text-[9px] text-center mt-3 uppercase tracking-widest">
                Abre o magnet no seu player (VLC, qBittorrent etc.)
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Header ── */}
      <div className="sticky top-0 z-30 bg-[#0d0d0d]/90 backdrop-blur-md border-b border-zinc-800/40 px-4 lg:px-8 py-3 flex items-center justify-between">
        <Button asChild variant="ghost" className="text-zinc-400 hover:text-white gap-1.5 font-medium text-sm px-0 hover:bg-transparent">
          <Link to="/"><ChevronLeft className="w-4 h-4" /> Voltar</Link>
        </Button>
        <Link to="/"><InwiseLogo size="sm" /></Link>
        <div className="w-20" />
      </div>

      {/* ── Backdrop ── */}
      <div className="relative w-full overflow-hidden" style={{ height: '42vh', minHeight: '220px', maxHeight: '420px' }}>
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d0d] via-[#0d0d0d]/40 to-transparent z-10" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0d0d0d]/60 to-transparent z-10" />
        <img
          src={title.backdrop || title.poster}
          className="w-full h-full object-cover object-center"
          alt={displayTitle}
          style={{ filter: 'brightness(0.85)' }}
        />
      </div>

      {/* ── Main content ── */}
      <div className="max-w-6xl mx-auto px-4 lg:px-8 pb-16">

        {/* ── Title card (poster + title + badges) ── */}
        <div className="flex gap-5 -mt-16 relative z-20 mb-8">
          {/* Poster */}
          <div className="flex-shrink-0 w-28 sm:w-36">
            <img
              src={title.poster}
              alt={displayTitle}
              className="w-full rounded-lg shadow-2xl border border-zinc-800/50"
              style={{ aspectRatio: '2/3', objectFit: 'cover' }}
            />
          </div>
          {/* Title + meta */}
          <div className="flex flex-col justify-end pb-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge className="bg-[#00d4ff] text-black font-bold text-[10px] uppercase px-2">{typeLabel}</Badge>
              {mainQuality && (
                <Badge className="bg-zinc-800 text-zinc-300 font-bold text-[10px] uppercase border-none">{mainQuality}</Badge>
              )}
              {title.imdb_rating && (
                <span className="flex items-center gap-1 text-yellow-400 font-bold text-sm">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  {Number(title.imdb_rating).toFixed(1)}
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white leading-tight mb-1">
              {displayTitle}
            </h1>
            {title.year && (
              <p className="text-zinc-500 text-sm">{title.year}</p>
            )}
          </div>
        </div>

        {/* ── Two-column layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── LEFT: main info ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Info table */}
            <div className="bg-zinc-900/40 border border-zinc-800/40 rounded-xl overflow-hidden">
              {[
                ['Lançamento',          title.year],
                ['IMDB',               title.imdb_rating ? `★ ${Number(title.imdb_rating).toFixed(1)}` : null],
                ['Tipo',               typeLabel],
                ['Qualidade',          mainQuality || '1080p'],
                ['Idioma',             mainLanguage || 'Português | Inglês'],
                ['Legenda',            'PT-BR'],
                ...(mainSize ? [['Tamanho', mainSize]] : []),
              ].filter(([, v]) => v).map(([label, value], i, arr) => (
                <div
                  key={String(label)}
                  className={`flex items-center justify-between px-5 py-3 ${i < arr.length - 1 ? 'border-b border-zinc-800/40' : ''}`}
                >
                  <span className="text-zinc-500 text-sm font-medium">{label}</span>
                  <span className={`text-sm font-semibold ${label === 'IMDB' ? 'text-yellow-400' : 'text-white'}`}>{String(value)}</span>
                </div>
              ))}
            </div>

            {/* Synopsis */}
            {title.synopsis && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">Sinopse</h3>
                <p className="text-sm text-zinc-300 leading-relaxed">
                  {title.synopsis.replace(/^sinopse:\s*/i, '')}
                </p>
              </div>
            )}

            {/* YouTube trailer button */}
            <a
              href={youtubeSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 w-full bg-zinc-900/60 hover:bg-zinc-800/60 border border-zinc-800/50 hover:border-zinc-700 rounded-xl px-5 py-4 transition group"
            >
              <div className="w-10 h-10 rounded-xl bg-red-600/10 flex items-center justify-center flex-shrink-0 group-hover:bg-red-600/20 transition">
                <Youtube className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Ver Trailer no YouTube</p>
                <p className="text-xs text-zinc-500">{displayTitle} · trailer legendado</p>
              </div>
            </a>

            {/* Torrent section */}
            {isSeries ? (
              <div className="space-y-3">
                <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                  <Tv className="w-4 h-4 text-primary" /> Temporadas &amp; Episódios
                </h2>
                {sortedSeasons.map((season: any) => {
                  const episodes = (season.episodes || []).sort((a: any, b: any) => a.episode_number - b.episode_number);
                  const isOpen = openSeasons.has(season.season_number);
                  return (
                    <div key={season.id} className="bg-zinc-900/40 border border-zinc-800/40 rounded-xl overflow-hidden">
                      <button
                        onClick={() => toggleSeason(season.season_number)}
                        className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-zinc-800/40 transition"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                            {season.season_number}
                          </span>
                          <span className="font-semibold text-sm">Temporada {season.season_number}</span>
                          <Badge className="bg-zinc-800 text-zinc-400 border-none font-bold text-[9px]">
                            {episodes.length} ep.
                          </Badge>
                        </div>
                        <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {isOpen && (
                        <div className="border-t border-zinc-800/40 divide-y divide-zinc-800/30">
                          {episodes.map((ep: any) => {
                            const opts = ep.torrent_options || [];
                            return (
                              <div key={ep.id} className="px-5 py-3.5 hover:bg-zinc-800/20 transition">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                  <div className="flex items-center gap-3">
                                    <span className="min-w-[2.5rem] text-center font-bold text-xs text-primary bg-primary/10 rounded-md px-2 py-1">
                                      EP{String(ep.episode_number).padStart(2, '0')}
                                    </span>
                                    <span className="text-sm font-medium text-zinc-200">
                                      {ep.title || `Episódio ${ep.episode_number}`}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {opts.length > 0 ? opts.map((opt: any) => (
                                      <Button
                                        key={opt.id}
                                        size="sm"
                                        onClick={() => handleTorrentClick(
                                          opt.magnet,
                                          `T${season.season_number}E${String(ep.episode_number).padStart(2,'0')} · ${opt.quality || ''} ${opt.audio_type || ''}`.trim(),
                                          opt.quality,
                                          opt.audio_type
                                        )}
                                        className="h-7 px-3 bg-zinc-800 hover:bg-primary hover:text-black text-white border-none font-bold text-[10px] uppercase rounded-md gap-1"
                                      >
                                        <Play className="w-2.5 h-2.5 fill-current" />
                                        {opt.quality || '1080p'}
                                      </Button>
                                    )) : (
                                      <span className="text-[10px] text-zinc-700 font-bold uppercase italic">Em breve</span>
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
              <div className="space-y-3">
                <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                  <Download className="w-4 h-4 text-primary" /> Opções de Download
                </h2>
                {title.torrent_options?.length > 0 ? (
                  <div className="space-y-3">
                    {title.torrent_options.map((opt: any) => (
                      <div
                        key={opt.id}
                        onClick={() => handleTorrentClick(opt.magnet, `${opt.quality || ''} ${opt.audio_type || ''}`.trim(), opt.quality, opt.audio_type)}
                        className="flex items-center justify-between bg-zinc-900/50 border border-zinc-800/50 hover:border-primary/40 rounded-xl px-5 py-4 cursor-pointer transition group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/10 transition">
                            <Download className="w-4 h-4 text-zinc-400 group-hover:text-primary transition" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-0.5">
                              <Badge className="bg-[#00d4ff]/10 text-[#00d4ff] border border-[#00d4ff]/20 font-bold text-[10px] uppercase">
                                {opt.quality || '1080p'}
                              </Badge>
                              {opt.audio_type && (
                                <span className="text-xs text-zinc-400 font-medium">{opt.audio_type}</span>
                              )}
                            </div>
                            {opt.size && (
                              <p className="text-xs text-zinc-600">{opt.size}</p>
                            )}
                          </div>
                        </div>
                        <Button
                          className="h-9 px-5 bg-[#4ade80] hover:bg-[#22c55e] text-black font-bold text-sm rounded-lg border-none gap-2 flex-shrink-0"
                          onClick={e => { e.stopPropagation(); handleTorrentClick(opt.magnet, `${opt.quality || ''} ${opt.audio_type || ''}`.trim(), opt.quality, opt.audio_type); }}
                        >
                          <Download className="w-4 h-4" />
                          DOWNLOAD
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-10 border border-dashed border-zinc-800 rounded-xl text-center">
                    <p className="text-zinc-700 text-xs uppercase tracking-widest font-bold">
                      Nenhum torrent disponível
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── RIGHT: você pode gostar ── */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" /> Você pode gostar
            </h2>
            {related.length > 0 ? (
              <div className="space-y-3">
                {related.slice(0, 8).map((rel: any) => (
                  <Link
                    key={rel.id}
                    to="/watch/$slug"
                    params={{ slug: rel.slug }}
                    className="flex gap-3 group hover:bg-zinc-800/40 rounded-xl p-2 transition"
                  >
                    <img
                      src={rel.poster}
                      alt={cleanTitle(rel.title)}
                      className="w-14 rounded-lg flex-shrink-0 object-cover border border-zinc-800/50 group-hover:border-primary/30 transition"
                      style={{ aspectRatio: '2/3' }}
                    />
                    <div className="flex flex-col justify-center min-w-0">
                      <p className="text-sm font-medium text-zinc-200 group-hover:text-white transition line-clamp-2 leading-tight">
                        {cleanTitle(rel.title)}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {rel.imdb_rating && (
                          <span className="flex items-center gap-1 text-yellow-400 text-xs font-bold">
                            <Star className="w-2.5 h-2.5 fill-current" />
                            {Number(rel.imdb_rating).toFixed(1)}
                          </span>
                        )}
                        {rel.year && (
                          <span className="text-zinc-600 text-xs">{rel.year}</span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-zinc-700 text-xs">Nenhum título relacionado.</p>
            )}
          </div>
        </div>
      </div>

      <footer className="border-t border-zinc-800/40 py-8 px-6 text-center">
        <Link to="/"><InwiseLogo size="md" className="justify-center mb-2" /></Link>
        <p className="text-[9px] font-bold uppercase tracking-[0.4em] text-zinc-700">
          © 2026 INWISE MOVIES
        </p>
      </footer>
    </div>
  );
}
