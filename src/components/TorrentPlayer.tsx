import React, { useEffect, useRef, useState } from 'react';
import WebTorrent from 'webtorrent/dist/webtorrent.min.js';
import { Play, Pause, Volume2, VolumeX, Maximize, Settings, Subtitles, Activity, Loader2, FastForward, Rewind } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TorrentPlayerProps {
  magnet: string;
  title: string;
  poster?: string;
}

const TorrentPlayer: React.FC<TorrentPlayerProps> = ({ magnet, title, poster }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [client, setClient] = useState<WebTorrent.Instance | null>(null);
  const [status, setStatus] = useState<'loading' | 'metadata' | 'streaming' | 'error'>('loading');
  const [stats, setStats] = useState({ progress: 0, downloadSpeed: 0, peers: 0 });
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!magnet) return;

    // WebTorrent client initialization
    const wtClient = new WebTorrent();
    setClient(wtClient);

    wtClient.add(magnet, (torrent) => {
      setStatus('metadata');
      
      // Find the largest video file
      const file = torrent.files.find(f => 
        f.name.endsWith('.mp4') || f.name.endsWith('.mkv') || f.name.endsWith('.webm')
      );

      if (file && videoRef.current) {
        file.renderTo(videoRef.current, {
          autoplay: true,
          controls: false
        }, (err) => {
          if (err) {
            console.error('Render error:', err);
            setError('Erro ao renderizar vídeo. Torrent pode ser incompatível.');
            setStatus('error');
          } else {
            setStatus('streaming');
            setIsPlaying(true);
          }
        });
      } else {
        setError('Nenhum arquivo de vídeo compatível encontrado no torrent.');
        setStatus('error');
      }

      // Update stats
      const interval = setInterval(() => {
        setStats({
          progress: torrent.progress * 100,
          downloadSpeed: torrent.downloadSpeed / 1024 / 1024, // MB/s
          peers: torrent.numPeers
        });
      }, 1000);

      return () => {
        clearInterval(interval);
      };
    });

    wtClient.on('error', (err) => {
      console.error('WebTorrent error:', err);
      setError(err.message);
      setStatus('error');
    });

    return () => {
      wtClient.destroy();
    };
  }, [magnet]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  const handleFullscreen = () => {
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        containerRef.current.requestFullscreen();
      }
    }
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hrs > 0 ? hrs + ':' : ''}${mins < 10 ? '0' + mins : mins}:${secs < 10 ? '0' + secs : secs}`;
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    const onDurationChange = () => setDuration(video.duration);
    
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('durationchange', onDurationChange);
    
    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('durationchange', onDurationChange);
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className="relative w-full aspect-video bg-black rounded-xl overflow-hidden group border border-white/5"
      onMouseMove={() => {
        setShowControls(true);
        const timeout = setTimeout(() => setShowControls(false), 3000);
        return () => clearTimeout(timeout);
      }}
    >
      {/* Video Element */}
      <video 
        ref={videoRef} 
        className="w-full h-full"
        onClick={togglePlay}
        poster={poster}
      />

      {/* Overlay: Loading/Metadata */}
      <AnimatePresence>
        {(status === 'loading' || status === 'metadata') && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm"
          >
            <Loader2 className="w-12 h-12 text-neon-green animate-spin mb-4" />
            <div className="text-xl font-bold">{status === 'loading' ? 'Iniciando WebTorrent...' : 'Buscando Metadados...'}</div>
            <p className="text-muted-foreground text-sm mt-2">Isso pode levar alguns segundos dependendo dos peers.</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlay: Error */}
      <AnimatePresence>
        {status === 'error' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/90 p-6 text-center"
          >
            <Activity className="w-16 h-16 text-red-500 mb-4" />
            <h3 className="text-xl font-bold text-red-500">Ocorreu um erro</h3>
            <p className="text-muted-foreground mt-2 max-w-md">{error || 'Não foi possível reproduzir este torrent.'}</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-6 bg-white/10 hover:bg-white/20 px-6 py-2 rounded-full font-bold transition-all"
            >
              Tentar Novamente
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Overlay (Mini) */}
      <div className="absolute top-4 left-4 z-10 flex gap-4 text-[10px] font-bold uppercase tracking-widest text-white/50 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
        <div className="flex items-center gap-1">
          <Activity className="w-3 h-3 text-neon-green" />
          {stats.downloadSpeed.toFixed(2)} MB/s
        </div>
        <div className="flex items-center gap-1">
          <Activity className="w-3 h-3 text-blue-400" />
          {stats.peers} PEERS
        </div>
      </div>

      {/* Controls Overlay */}
      <AnimatePresence>
        {showControls && status === 'streaming' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 flex flex-col justify-end bg-gradient-to-t from-black/80 via-transparent to-black/20"
          >
            <div className="p-6 space-y-4">
              {/* Progress Bar */}
              <div className="relative group/progress h-1.5 bg-white/20 rounded-full cursor-pointer">
                <div 
                  className="absolute top-0 left-0 h-full bg-neon-green rounded-full shadow-[0_0_10px_rgba(200,255,0,0.5)]" 
                  style={{ width: `${(currentTime / duration) * 100}%` }}
                />
                <input 
                  type="range"
                  min="0"
                  max={duration || 0}
                  value={currentTime}
                  onChange={(e) => {
                    const time = parseFloat(e.target.value);
                    if (videoRef.current) videoRef.current.currentTime = time;
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>

              {/* Control Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <button onClick={togglePlay} className="text-white hover:text-neon-green transition-colors">
                    {isPlaying ? <Pause className="w-7 h-7 fill-current" /> : <Play className="w-7 h-7 fill-current" />}
                  </button>
                  <div className="flex items-center gap-4">
                    <button onClick={() => videoRef.current && (videoRef.current.currentTime -= 10)}>
                      <Rewind className="w-6 h-6 hover:text-neon-green transition-colors" />
                    </button>
                    <button onClick={() => videoRef.current && (videoRef.current.currentTime += 10)}>
                      <FastForward className="w-6 h-6 hover:text-neon-green transition-colors" />
                    </button>
                  </div>
                  <div className="flex items-center gap-4">
                    <button onClick={toggleMute} className="text-white hover:text-neon-green transition-colors">
                      {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                    </button>
                    <div className="text-sm font-medium tabular-nums">
                      {formatTime(currentTime)} <span className="text-white/40">/ {formatTime(duration)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <button className="text-white hover:text-neon-green transition-colors">
                    <Subtitles className="w-6 h-6" />
                  </button>
                  <button className="text-white hover:text-neon-green transition-colors">
                    <Settings className="w-6 h-6" />
                  </button>
                  <button onClick={handleFullscreen} className="text-white hover:text-neon-green transition-colors">
                    <Maximize className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TorrentPlayer;
