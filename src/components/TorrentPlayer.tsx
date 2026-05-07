import React, { useEffect, useRef, useState, useCallback } from 'react';
// @ts-ignore
import WebTorrent from 'webtorrent/dist/webtorrent.min.js';
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  Activity, Loader2, FastForward, Rewind, Subtitles, SubtitlesIcon,
  Wifi, WifiOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TorrentPlayerProps {
  magnet: string;
  title: string;
  poster?: string;
}

function srtToVtt(srt: string): string {
  return 'WEBVTT\n\n' + srt
    .replace(/\r\n/g, '\n')
    .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2')
    .replace(/^\d+\n/gm, '')
    .trim();
}

function formatTime(s: number): string {
  if (!isFinite(s)) return '0:00';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return `${h > 0 ? h + ':' : ''}${m < 10 ? '0' + m : m}:${sec < 10 ? '0' + sec : sec}`;
}

const TorrentPlayer: React.FC<TorrentPlayerProps> = ({ magnet, title, poster }) => {
  const videoRef   = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef   = useRef<HTMLTrackElement>(null);
  const hideTimer  = useRef<ReturnType<typeof setTimeout>>();

  const [status, setStatus]           = useState<'loading' | 'buffering' | 'streaming' | 'error'>('loading');
  const [stats, setStats]             = useState({ speed: 0, peers: 0, progress: 0 });
  const [isPlaying, setIsPlaying]     = useState(false);
  const [isMuted, setIsMuted]         = useState(false);
  const [volume, setVolume]           = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration]       = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [subtitleTrack, setSubtitleTrack] = useState<string | null>(null);
  const [subtitleEnabled, setSubtitleEnabled] = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [statusMsg, setStatusMsg]     = useState('Conectando ao enxame de peers...');

  // ── controls auto-hide ────────────────────────────────────────────
  const showControlsTemp = useCallback(() => {
    setShowControls(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 3500);
  }, []);

  // ── WebTorrent ────────────────────────────────────────────────────
  useEffect(() => {
    if (!magnet) return;
    setStatus('loading');
    setStatusMsg('Conectando ao enxame de peers...');

    const client = new WebTorrent();

    client.on('error', (err: any) => {
      setError(String(err?.message || err));
      setStatus('error');
    });

    client.add(magnet, (torrent: any) => {
      setStatusMsg(`Torrent encontrado: ${torrent.name || 'desconhecido'}`);

      // Largest video file
      const videoFile = [...torrent.files]
        .filter((f: any) => /\.(mp4|mkv|webm|avi)$/i.test(f.name))
        .sort((a: any, b: any) => b.length - a.length)[0];

      if (!videoFile) {
        setError('Nenhum arquivo de vídeo encontrado neste torrent.');
        setStatus('error');
        return;
      }

      // SRT subtitle (any .srt inside the torrent)
      const srtFile = torrent.files.find((f: any) => /\.srt$/i.test(f.name));
      if (srtFile) {
        srtFile.getBuffer((err: any, buf: Buffer) => {
          if (!err && buf) {
            const vtt = srtToVtt(buf.toString('utf-8'));
            const blob = new Blob([vtt], { type: 'text/vtt' });
            setSubtitleTrack(URL.createObjectURL(blob));
          }
        });
      }

      // Render video
      setStatus('buffering');
      setStatusMsg('Baixando metadados do vídeo...');
      if (videoRef.current) {
        videoFile.renderTo(videoRef.current, { autoplay: true, controls: false },
          (err: any) => {
            if (err) {
              setError('Erro ao renderizar: ' + err.message);
              setStatus('error');
            }
          }
        );
      }

      // Stats interval
      const iv = setInterval(() => {
        setStats({
          speed:    torrent.downloadSpeed / 1024 / 1024,
          peers:    torrent.numPeers,
          progress: torrent.progress * 100,
        });
      }, 1000);

      return () => clearInterval(iv);
    });

    return () => { client.destroy(); };
  }, [magnet]);

  // ── Video events ──────────────────────────────────────────────────
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onPlay      = () => { setIsPlaying(true);  setStatus('streaming'); };
    const onPause     = () => setIsPlaying(false);
    const onWaiting   = () => setStatus('buffering');
    const onPlaying   = () => setStatus('streaming');
    const onTimeUpdate = () => setCurrentTime(v.currentTime);
    const onDuration  = () => setDuration(v.duration);
    const onError     = () => { setError('Erro de reprodução.'); setStatus('error'); };
    v.addEventListener('play',       onPlay);
    v.addEventListener('pause',      onPause);
    v.addEventListener('waiting',    onWaiting);
    v.addEventListener('playing',    onPlaying);
    v.addEventListener('timeupdate', onTimeUpdate);
    v.addEventListener('durationchange', onDuration);
    v.addEventListener('error',      onError);
    return () => {
      v.removeEventListener('play',       onPlay);
      v.removeEventListener('pause',      onPause);
      v.removeEventListener('waiting',    onWaiting);
      v.removeEventListener('playing',    onPlaying);
      v.removeEventListener('timeupdate', onTimeUpdate);
      v.removeEventListener('durationchange', onDuration);
      v.removeEventListener('error',      onError);
    };
  }, []);

  // Fullscreen change
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // ── Subtitle track ────────────────────────────────────────────────
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !subtitleTrack) return;
    const t = v.textTracks[0];
    if (t) t.mode = subtitleEnabled ? 'showing' : 'hidden';
  }, [subtitleTrack, subtitleEnabled]);

  // ── Controls ──────────────────────────────────────────────────────
  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    v.paused ? v.play() : v.pause();
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setIsMuted(v.muted);
  };

  const seek = (delta: number) => {
    const v = videoRef.current;
    if (v) v.currentTime = Math.max(0, Math.min(duration, v.currentTime + delta));
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    const t = parseFloat(e.target.value);
    if (v) v.currentTime = t;
    setCurrentTime(t);
  };

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      setIsMuted(val === 0);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    document.fullscreenElement
      ? document.exitFullscreen()
      : containerRef.current.requestFullscreen();
  };

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video bg-black overflow-hidden select-none"
      onMouseMove={showControlsTemp}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      style={{ cursor: showControls ? 'default' : 'none' }}
    >
      {/* ── Video ── */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        onClick={togglePlay}
        poster={poster}
        crossOrigin="anonymous"
      >
        {subtitleTrack && (
          <track
            ref={trackRef}
            kind="subtitles"
            src={subtitleTrack}
            srcLang="pt"
            label="Português"
            default
          />
        )}
      </video>

      {/* ── Loading / Buffering overlay ── */}
      <AnimatePresence>
        {(status === 'loading' || status === 'buffering') && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm gap-4"
          >
            <div className="relative">
              <Loader2 className="w-14 h-14 text-[#00d4ff] animate-spin" />
              {poster && (
                <img src={poster} alt="" className="absolute inset-0 w-full h-full object-cover rounded-full opacity-20" />
              )}
            </div>
            <div className="text-center">
              <p className="font-black text-lg uppercase tracking-widest text-[#00d4ff]">
                {status === 'loading' ? 'Iniciando' : 'Carregando...'}
              </p>
              <p className="text-zinc-500 text-xs mt-1 max-w-xs text-center">{statusMsg}</p>
            </div>
            {stats.peers > 0 && (
              <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 bg-zinc-900/80 px-4 py-2 rounded-full">
                <span className="flex items-center gap-1"><Wifi className="w-3 h-3 text-[#00d4ff]" />{stats.peers} peers</span>
                <span>{stats.speed.toFixed(1)} MB/s</span>
                <span>{stats.progress.toFixed(0)}%</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Error overlay ── */}
      <AnimatePresence>
        {status === 'error' && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/95 p-8 text-center gap-4"
          >
            <WifiOff className="w-16 h-16 text-red-500" />
            <h3 className="text-xl font-black uppercase tracking-widest text-red-400">Erro de Reprodução</h3>
            <p className="text-zinc-500 text-sm max-w-sm">{error || 'Não foi possível reproduzir este torrent.'}</p>
            <p className="text-zinc-600 text-xs">Tente baixar o arquivo e assistir localmente.</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Stats badge (top-left, visible while streaming) ── */}
      {status === 'streaming' && (
        <div className="absolute top-3 left-3 z-10 flex items-center gap-3 text-[9px] font-black uppercase tracking-widest text-white/40 bg-black/40 backdrop-blur-sm px-3 py-1 rounded-full">
          <span className="flex items-center gap-1"><Activity className="w-3 h-3 text-[#00d4ff]" />{stats.speed.toFixed(1)} MB/s</span>
          <span>{stats.peers} peers</span>
          <span>{stats.progress.toFixed(0)}%</span>
        </div>
      )}

      {/* ── Controls ── */}
      <AnimatePresence>
        {showControls && status !== 'error' && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-20 flex flex-col justify-end"
          >
            {/* Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/30 pointer-events-none" />

            {/* Title */}
            <div className="relative px-5 pb-1 pt-0">
              <p className="text-xs font-black uppercase tracking-widest text-white/50 truncate">{title}</p>
            </div>

            {/* Progress */}
            <div className="relative px-5 pb-1 group/bar">
              <div className="h-1 bg-white/20 rounded-full relative">
                <div
                  className="absolute inset-y-0 left-0 bg-[#00d4ff] rounded-full shadow-[0_0_8px_rgba(0,212,255,0.6)] transition-all"
                  style={{ width: `${pct}%` }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-[#00d4ff] rounded-full shadow-[0_0_8px_rgba(0,212,255,0.8)] -translate-x-1/2 opacity-0 group-hover/bar:opacity-100 transition-opacity"
                  style={{ left: `${pct}%` }}
                />
              </div>
              <input
                type="range" min="0" max={duration || 0} step="0.1" value={currentTime}
                onChange={handleSeek}
                className="absolute inset-0 w-full opacity-0 cursor-pointer h-4 -top-1.5"
              />
            </div>

            {/* Buttons */}
            <div className="relative flex items-center justify-between px-5 pb-4 pt-2">
              <div className="flex items-center gap-4">
                {/* Play/Pause */}
                <button onClick={togglePlay} className="text-white hover:text-[#00d4ff] transition-colors">
                  {isPlaying
                    ? <Pause className="w-7 h-7 fill-current" />
                    : <Play  className="w-7 h-7 fill-current" />}
                </button>
                {/* Skip */}
                <button onClick={() => seek(-10)} className="text-white/70 hover:text-white transition-colors">
                  <Rewind className="w-5 h-5" />
                </button>
                <button onClick={() => seek(10)} className="text-white/70 hover:text-white transition-colors">
                  <FastForward className="w-5 h-5" />
                </button>
                {/* Volume */}
                <div className="flex items-center gap-2">
                  <button onClick={toggleMute} className="text-white/70 hover:text-white transition-colors">
                    {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                  <input
                    type="range" min="0" max="1" step="0.05" value={isMuted ? 0 : volume}
                    onChange={handleVolume}
                    className="w-16 accent-[#00d4ff] cursor-pointer"
                  />
                </div>
                {/* Time */}
                <span className="text-xs font-black tabular-nums text-white/60">
                  {formatTime(currentTime)} <span className="text-white/30">/ {formatTime(duration)}</span>
                </span>
              </div>

              <div className="flex items-center gap-4">
                {/* Subtitles */}
                {subtitleTrack && (
                  <button
                    onClick={() => setSubtitleEnabled(p => !p)}
                    className={`transition-colors ${subtitleEnabled ? 'text-[#00d4ff]' : 'text-white/40'}`}
                    title="Legendas"
                  >
                    <SubtitlesIcon className="w-5 h-5" />
                  </button>
                )}
                {/* Fullscreen */}
                <button onClick={toggleFullscreen} className="text-white/70 hover:text-white transition-colors">
                  {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Click to play/pause (center area) ── */}
      <AnimatePresence>
        {!isPlaying && status === 'streaming' && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
            className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none"
          >
            <div className="w-16 h-16 bg-[#00d4ff] rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(0,212,255,0.4)]">
              <Play className="w-7 h-7 fill-black text-black ml-1" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TorrentPlayer;
