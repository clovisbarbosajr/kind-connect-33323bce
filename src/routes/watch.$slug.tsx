import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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

function Watch() {
  const { slug } = Route.useParams();
  const [title, setTitle]             = useState<any>(null);
  const [related, setRelated]         = useState<any[]>([]);
  const [genres, setGenres]           = useState<string[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<any>(null);
  const [openSeasons, setOpenSeasons] = useState<Set<number>>(new Set([1]));
  const [playerMagnet, setPlayerMagnet] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const { data, error: e } = await supabase
          .from('titles')
          .select(`*, torrent_options(*), seasons(*, episodes(*, torrent_options(*)))`)
          .eq('slug', slug)
          .single();
        if (e) throw e;
        setTitle(data);

        const [relRes, genreRes] = await Promise.all([
          supabase.from('titles').select('id,title,poster,imdb_rating,year,slug,type')
            .eq('type', data.type).neq('slug', slug).limit(9),
          supabase.from('title_genres').select('genres(name)').eq('title_id', data.id),
        ]);
        setRelated(relRes.data || []);
        const gNames = (genreRes.data || []).map((r: any) => r.genres?.name).filter((n: any) => n && n.trim());
        setGenres(gNames);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  const toggleSeason = (n: number) =>
    setOpenSeasons(prev => { const s = new Set(prev); s.has(n) ? s.delete(n) : s.add(n); return s; });

  const openOnline = (magnet: string) => setPlayerMagnet(magnet);

  const downloadTorrent = (magnet: string) => {
    // Google Drive / external links → open in new tab; magnets → direct
    if (magnet.startsWith('https://')) window.open(magnet, '_blank');
    else window.location.href = magnet;
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0d0d0d] text-white">
      <div className="sticky top-0 z-30 h-[52px] bg-[#0d0d0d] border-b border-zinc-800/40 flex items-center px-6">
        <Skeleton className="h-4 w-16 bg-zinc-800" />
      </div>
      <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex gap-5">
            <Skeleton className="w-44 rounded-lg bg-zinc-900" style={{ aspectRatio: '2/3' }} />
            <div className="flex-1 space-y-3 pt-2">
              {[80, 60, 100, 70, 90].map(w => <Skeleton key={w} className={`h-4 w-${w === 100 ? 'full' : `${w}%`} bg-zinc-800 rounded`} />)}
            </div>
          </div>
        </div>
        <div><Skeleton className="h-64 bg-zinc-900 rounded-xl" /></div>
      </div>
    </div>
  );

  if (error || !title) return (
    <div className="min-h-screen bg-[#0d0d0d] text-white flex flex-col items-center justify-center p-8 text-center">
      <h2 className="text-xl font-bold text-primary mb-4">Conteúdo Indisponível</h2>
      <Button asChild className="bg-primary text-black font-bold px-8 rounded-full">
        <Link to="/">Voltar para Home</Link>
      </Button>
    </div>
  );

  const sortedSeasons = (title.seasons || []).sort((a: any, b: any) => a.season_number - b.season_number);
  const isSeries = title.type === 'series' || title.type === 'anime';
  const displayTitle = cleanTitle(title.title);
  const firstOpt = title.torrent_options?.[0];
  const mainQuality = firstOpt?.quality || '1080p';
  const mainSize    = firstOpt?.size || '';
  const mainLang    = firstOpt?.language || firstOpt?.audio_type || 'Português | Inglês';
  const typeLabel   = title.type === 'movie' ? 'Filme' : title.type === 'anime' ? 'Anime' : 'Série';
  const ytSearch    = `https://www.youtube.com/results?search_query=${encodeURIComponent(displayTitle + ' trailer legendado')}`;
  const shareUrl    = typeof window !== 'undefined' ? window.location.href : '';
  const shareText   = `Assista ${displayTitle} no Inwise Movies`;

  const infoRows = [
    ['Lançamento',  title.year],
    ['IMDB',        title.imdb_rating ? `★ ${Number(title.imdb_rating).toFixed(1)}` : null],
    ['Tipo',        typeLabel],
    ['Gênero',      genres.length ? genres.join(', ') : null],
    ['Qualidade',   mainQuality],
    ['Formato',     'MKV'],
    ['Tamanho',     mainSize || null],
    ['Idioma',      mainLang],
    ['Legenda',     'PT-BR'],
  ].filter(([, v]) => v) as [string, string][];

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white">

      {/* ── Webtor.io Player Overlay ── */}
      {playerMagnet && (
        <div className="fixed inset-0 z-[300] bg-black flex flex-col">
          <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-950 border-b border-zinc-800 flex-shrink-0">
            <div>
              <p className="text-sm font-bold text-white">{displayTitle}</p>
              <p className="text-[10px] text-zinc-500">Streaming via Webtor.io · aguarde carregar</p>
            </div>
            <button
              onClick={() => setPlayerMagnet(null)}
              className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition text-xs font-bold uppercase tracking-widest"
            >
              <X className="w-4 h-4" /> Fechar
            </button>
          </div>
          <iframe
            src={`https://webtor.io/embed-player?magnet=${encodeURIComponent(playerMagnet)}&lang=pt`}
            className="flex-1 w-full border-0"
            allowFullScreen
            allow="autoplay; fullscreen"
          />
        </div>
      )}

      {/* ── Header ── */}
      <div className="sticky top-0 z-30 bg-[#0d0d0d]/95 backdrop-blur-md border-b border-zinc-800/40 px-4 lg:px-8 h-[52px] flex items-center justify-between">
        <Button asChild variant="ghost" className="text-zinc-400 hover:text-white gap-1.5 font-medium text-sm px-0 hover:bg-transparent h-auto">
          <Link to="/"><ChevronLeft className="w-4 h-4" /> Voltar</Link>
        </Button>
        <Link to="/"><InwiseLogo size="sm" /></Link>
        <div className="w-16" />
      </div>

      {/* ── Page content ── */}
      <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6">

        {/* SEO breadcrumb */}
        <p className="text-[11px] text-zinc-600 mb-1 truncate">
          {title.title} · {title.year} · {mainQuality} · {typeLabel}
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8 items-start">

          {/* ── LEFT: main content ── */}
          <div>

            {/* Poster + Info block */}
            <div className="flex gap-5 mb-6">
              {/* Poster */}
              <div className="flex-shrink-0 w-36 sm:w-44">
                <img
                  src={title.poster}
                  alt={displayTitle}
                  className="w-full rounded-lg shadow-2xl border border-zinc-800/40"
                  style={{ aspectRatio: '2/3', objectFit: 'cover' }}
                />
              </div>

              {/* Title + badges + info table */}
              <div className="flex-1 min-w-0">
                {/* Badges */}
                <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                  <span className="border border-zinc-600 text-zinc-300 text-[10px] font-bold px-1.5 py-0.5 rounded">FHD</span>
                  {title.imdb_rating && (
                    <span className="flex items-center gap-1 text-yellow-400 text-xs font-bold">
                      <Star className="w-3 h-3 fill-current" />
                      {Number(title.imdb_rating).toFixed(1)}
                    </span>
                  )}
                  {mainQuality && (
                    <span className="text-zinc-400 text-[11px]">{mainQuality}</span>
                  )}
                </div>

                {/* Title */}
                <h1 className="text-lg sm:text-2xl font-bold text-white leading-tight mb-3">
                  {displayTitle}
                </h1>

                {/* Info table */}
                <table className="w-full text-sm border-collapse">
                  <tbody>
                    {infoRows.map(([label, value]) => (
                      <tr key={label} className="border-b border-zinc-800/50 last:border-0">
                        <td className="py-1.5 pr-4 text-zinc-500 font-medium whitespace-nowrap w-28">{label}:</td>
                        <td className={`py-1.5 font-semibold ${label === 'IMDB' ? 'text-yellow-400' : 'text-zinc-200'}`}>{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Share icons */}
                <div className="flex gap-3 mt-3">
                  {[
                    { icon: 'fb', href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, label: 'F' },
                    { icon: 'wa', href: `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`, label: 'W' },
                    { icon: 'tw', href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, label: 'X' },
                  ].map(s => (
                    <a key={s.icon} href={s.href} target="_blank" rel="noopener noreferrer"
                      className="w-7 h-7 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition text-xs font-bold">
                      {s.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* Synopsis */}
            {title.synopsis && (
              <div className="mb-6">
                <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">Sinopse</h3>
                <p className="text-sm text-zinc-300 leading-relaxed">
                  {title.synopsis.replace(/^sinopse:\s*/i, '')}
                </p>
              </div>
            )}

            {/* YouTube trailer block */}
            <a href={ytSearch} target="_blank" rel="noopener noreferrer" className="block mb-6 group">
              <div className="relative w-full rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800/50 hover:border-zinc-600 transition"
                style={{ aspectRatio: '16/6' }}>
                <img
                  src={title.backdrop || title.poster}
                  alt=""
                  className="w-full h-full object-cover opacity-40 group-hover:opacity-50 transition"
                  style={{ filter: 'blur(2px)' }}
                />
                <div className="absolute inset-0 flex items-center justify-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-red-600/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Youtube className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Ver Trailer no YouTube</p>
                    <p className="text-xs text-zinc-400">{displayTitle} · trailer legendado</p>
                  </div>
                </div>
              </div>
            </a>

            {/* Torrent / Episodes section */}
            {isSeries ? (
              <div className="space-y-3">
                <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2 mb-3">
                  <Tv className="w-3.5 h-3.5 text-primary" /> Temporadas &amp; Episódios
                </h2>
                {sortedSeasons.map((season: any) => {
                  const episodes = (season.episodes || []).sort((a: any, b: any) => a.episode_number - b.episode_number);
                  const isOpen = openSeasons.has(season.season_number);
                  return (
                    <div key={season.id} className="bg-zinc-900/40 border border-zinc-800/40 rounded-xl overflow-hidden">
                      <button
                        onClick={() => toggleSeason(season.season_number)}
                        className="w-full px-5 py-3 flex items-center justify-between hover:bg-zinc-800/30 transition"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                            {season.season_number}
                          </span>
                          <span className="font-semibold text-sm">Temporada {season.season_number}</span>
                          <span className="text-zinc-600 text-xs">({episodes.length} ep.)</span>
                        </div>
                        <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {isOpen && (
                        <div className="border-t border-zinc-800/40 divide-y divide-zinc-800/30">
                          {episodes.map((ep: any) => {
                            const opts = ep.torrent_options || [];
                            return (
                              <div key={ep.id} className="px-5 py-3 hover:bg-zinc-800/20 transition">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                  <div className="flex items-center gap-2.5">
                                    <span className="min-w-[2.2rem] text-center font-bold text-xs text-primary bg-primary/10 rounded px-1.5 py-0.5">
                                      {String(ep.episode_number).padStart(2,'0')}
                                    </span>
                                    <span className="text-sm text-zinc-200">{ep.title || `Episódio ${ep.episode_number}`}</span>
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {opts.length > 0 ? opts.map((opt: any) => (
                                      <button key={opt.id}
                                        onClick={() => openOnline(opt.magnet)}
                                        className="h-7 px-3 bg-zinc-800 hover:bg-primary hover:text-black text-white font-bold text-[10px] uppercase rounded-md transition gap-1 flex items-center"
                                      >
                                        <Play className="w-2.5 h-2.5 fill-current" />
                                        {opt.quality || '1080p'}
                                      </button>
                                    )) : (
                                      <span className="text-[10px] text-zinc-700 italic">Em breve</span>
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
              <div className="space-y-2">
                <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2 mb-3">
                  <Download className="w-3.5 h-3.5 text-primary" /> Download
                </h2>
                {title.torrent_options?.length > 0 ? (
                  title.torrent_options.map((opt: any) => {
                    const isDirect = opt.magnet?.startsWith('https://');
                    return (
                      <div key={opt.id}
                        className="flex items-center justify-between bg-zinc-900/50 border border-zinc-800/40 rounded-xl px-4 py-3 hover:border-zinc-700 transition">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0">
                            <Download className="w-4 h-4 text-zinc-400" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                              <span className="text-[10px] font-bold border border-[#00d4ff]/40 text-[#00d4ff] rounded px-1.5 py-0.5 uppercase">
                                {opt.quality || '1080p'}
                              </span>
                              {opt.audio_type && <span className="text-xs text-zinc-400">{opt.audio_type}</span>}
                              {opt.language && opt.language !== opt.audio_type && (
                                <span className="text-xs text-zinc-500">{opt.language}</span>
                              )}
                            </div>
                            {opt.size && <p className="text-[11px] text-zinc-600">{opt.size}</p>}
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          {!isDirect && (
                            <Button
                              className="h-9 px-4 bg-[#4ade80] hover:bg-[#22c55e] text-black font-bold text-xs rounded-lg border-none gap-1.5"
                              onClick={() => openOnline(opt.magnet)}
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                              ASSISTIR
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            className="h-9 px-4 bg-transparent border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white font-bold text-xs rounded-lg gap-1.5"
                            onClick={() => downloadTorrent(opt.magnet)}
                          >
                            <Download className="w-3.5 h-3.5" />
                            {isDirect ? 'ACESSAR' : 'BAIXAR'}
                          </Button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-10 border border-dashed border-zinc-800 rounded-xl text-center">
                    <p className="text-zinc-700 text-xs uppercase tracking-widest font-bold">Nenhum torrent disponível</p>
                  </div>
                )}
              </div>
            )}

            {/* Sobre */}
            <div className="mt-8 border border-zinc-800/40 rounded-xl p-4">
              <h3 className="text-sm font-bold text-white mb-1.5">Sobre</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                <strong className="text-zinc-400">{displayTitle}</strong> faz parte do nosso catálogo.
                Aqui você encontra filmes, séries e muito mais para baixar gratuitamente via torrent.
                Para baixar <em>{displayTitle.toLowerCase()}</em>, use um dos links acima.
              </p>
            </div>
          </div>

          {/* ── RIGHT: Você pode gostar ── */}
          <div className="lg:sticky lg:top-[60px]">
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5 mb-3">
              <Info className="w-3.5 h-3.5 text-primary" /> Você pode gostar
            </h2>
            {related.length > 0 ? (
              <div className="grid grid-cols-3 gap-1.5">
                {related.slice(0, 9).map((rel: any) => (
                  <Link key={rel.id} to="/watch/$slug" params={{ slug: rel.slug }} className="block group">
                    <div className="relative rounded-md overflow-hidden" style={{ paddingTop: '150%' }}>
                      <img
                        src={rel.poster}
                        alt={cleanTitle(rel.title)}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition" />
                      {rel.imdb_rating && (
                        <div className="absolute top-1 right-1 flex items-center gap-0.5 bg-black/60 rounded px-1 py-0.5">
                          <Star className="w-2 h-2 fill-yellow-400 text-yellow-400" />
                          <span className="text-white text-[9px] font-bold">{Number(rel.imdb_rating).toFixed(1)}</span>
                        </div>
                      )}
                      {rel.year && (
                        <div className="absolute bottom-1 left-1">
                          <span className="text-white text-[9px] font-bold px-1 py-0.5 rounded"
                            style={{ background: 'linear-gradient(to bottom, #00b4d8, #0077b6)' }}>
                            {rel.year}
                          </span>
                        </div>
                      )}
                    </div>
                    <p className="mt-1 text-[10px] text-zinc-400 group-hover:text-white transition line-clamp-1 leading-tight">
                      {cleanTitle(rel.title)}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-zinc-700 text-xs">Nenhum relacionado.</p>
            )}
          </div>
        </div>
      </div>

      <footer className="border-t border-zinc-800/40 py-6 px-6 text-center mt-8">
        <Link to="/"><InwiseLogo size="sm" className="justify-center mb-2" /></Link>
        <p className="text-[9px] font-bold uppercase tracking-[0.4em] text-zinc-700">© 2026 INWISE MOVIES</p>
      </footer>
    </div>
  );
}
