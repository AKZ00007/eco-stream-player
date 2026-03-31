import { useRef, useEffect, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Play, Pause, Maximize, Minimize2,
  SkipBack, SkipForward, RotateCcw, RotateCw,
  Volume2, VolumeX, Settings, Loader
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Video } from '../types';
import { updateWatchProgress } from '../api/queries';
import { useQueryClient } from '@tanstack/react-query';
import { formatTime } from '../utils/helpers';

export default function DesktopVideoPlayer({ video, recommendations, onProgressUpdate }: { video: Video; recommendations?: Video[]; onProgressUpdate?: (progress: number) => void }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastSyncRef = useRef<number>(Date.now());
  const hasAutoResumed = useRef<string | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [seekFlash, setSeekFlash] = useState<'left' | 'right' | null>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isBuffering, setIsBuffering] = useState(false);

  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrubberRef = useRef<HTMLDivElement>(null);

  // Use refs for values needed inside click handlers to avoid stale closures
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  const progress = duration > 0 ? currentTime / duration : 0;
  const progressPct = `${(progress * 100).toFixed(2)}%`;

  // ── Auto-resume from saved watch progress ──
  useEffect(() => {
    if (video && hasAutoResumed.current !== video.id) {
      hasAutoResumed.current = video.id;
      const savedProgress = video.watchProgress || 0;
      if (savedProgress > 0.02 && savedProgress < 0.99 && videoRef.current) {
        const onLoaded = () => {
          if (videoRef.current) {
            videoRef.current.currentTime = savedProgress * videoRef.current.duration;
          }
        };
        if (videoRef.current.readyState >= 1) {
          onLoaded();
        } else {
          videoRef.current.addEventListener('loadedmetadata', onLoaded, { once: true });
        }
      }
    }
  }, [video.id]);

  // ── Auto-play with fade-in audio ──
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    vid.volume = 0;
    vid.muted = false;
    vid.play().then(() => {
      setIsPlaying(true);
      let fadeStep = 0;
      const fadeInterval = setInterval(() => {
        fadeStep += 0.05;
        if (fadeStep >= 1) {
          vid.volume = isMuted ? 0 : volume;
          clearInterval(fadeInterval);
        } else {
          vid.volume = isMuted ? 0 : fadeStep * volume;
        }
      }, 75);
    }).catch(() => {});
  }, [video.id]);

  // ── Sync mute/volume state ──
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = isMuted ? 0 : volume;
    }
  }, [isMuted, volume]);

  // ── Controls auto-hide ──
  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (isPlayingRef.current && !isScrubbing) setControlsVisible(false);
    }, 3000);
  }, [isScrubbing]);

  useEffect(() => {
    showControls();
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, [isPlaying, showControls]);

  // ── Core functions (stable via refs) ──
  const togglePlayDirect = useCallback(() => {
    if (!videoRef.current) return;
    if (isPlayingRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
    showControls();
  }, [showControls]);

  const seekDirect = useCallback((seconds: number) => {
    if (!videoRef.current) return;
    const d = videoRef.current.duration || 0;
    videoRef.current.currentTime = Math.max(0, Math.min(d, videoRef.current.currentTime + seconds));
    showControls();
  }, [showControls]);

  // ── Double-click seek (robust implementation) ──
  // All click detection happens at the CONTAINER level (highest z-index)
  // so button overlays can't steal the second click.
  const lastClickTime = useRef(0);
  const lastClickSide = useRef<'left' | 'right' | null>(null);
  const singleClickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleContainerClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Skip if user clicked on an interactive control (button, input, scrubber)
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('[data-scrubber]')) {
      return;
    }

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const clickX = e.clientX - rect.left;
    const side: 'left' | 'right' = clickX < rect.width / 2 ? 'left' : 'right';

    const now = Date.now();
    const wasDouble = (now - lastClickTime.current < 400) && lastClickSide.current === side;

    if (wasDouble) {
      // ── DOUBLE CLICK: Seek ±10s ──
      if (singleClickTimer.current) {
        clearTimeout(singleClickTimer.current);
        singleClickTimer.current = null;
      }
      lastClickTime.current = 0;
      lastClickSide.current = null;

      seekDirect(side === 'left' ? -10 : 10);
      setSeekFlash(side);
      setTimeout(() => setSeekFlash(null), 700);
    } else {
      // ── FIRST CLICK: Wait for potential second ──
      lastClickTime.current = now;
      lastClickSide.current = side;

      if (singleClickTimer.current) clearTimeout(singleClickTimer.current);
      singleClickTimer.current = setTimeout(() => {
        // No second click → toggle play/pause
        togglePlayDirect();
        singleClickTimer.current = null;
      }, 400);
    }
  }, [seekDirect, togglePlayDirect]);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Only respond if the player area or body is focused
      if (document.activeElement && document.activeElement !== document.body
        && !containerRef.current?.contains(document.activeElement)) return;

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlayDirect();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          seekDirect(-10);
          break;
        case 'ArrowRight':
          e.preventDefault();
          seekDirect(10);
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          setIsMuted(prev => !prev);
          break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [togglePlayDirect, seekDirect]);

  const cycleSpeed = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = playbackSpeed === 1 ? 1.5 : playbackSpeed === 1.5 ? 0.5 : 1;
    setPlaybackSpeed(next);
    if (videoRef.current) videoRef.current.playbackRate = next;
    showControls();
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      try {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } catch {}
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // ── Time/progress tracking ──
  const handleTimeUpdate = () => {
    if (!videoRef.current || isScrubbing) return;
    const ct = videoRef.current.currentTime;
    const dur = videoRef.current.duration || 0;
    setCurrentTime(ct);
    setDuration(dur);
    if (dur > 0 && onProgressUpdate) onProgressUpdate(ct / dur);

    if (videoRef.current.buffered.length > 0) {
      setBuffered(videoRef.current.buffered.end(videoRef.current.buffered.length - 1) / dur);
    }

    const now = Date.now();
    if (now - lastSyncRef.current > 5000 && dur > 0) {
      lastSyncRef.current = now;
      updateWatchProgress(video.id, ct / dur).then((updatedVideo) => {
        queryClient.setQueriesData({ queryKey: ['videos'] }, (old: any) => {
          if (!Array.isArray(old)) return old;
          return old.map(v => v.id === updatedVideo.id ? { ...v, watchProgress: updatedVideo.watchProgress } : v);
        });
        queryClient.setQueriesData({ queryKey: ['recommendations'] }, (old: any) => {
          if (!Array.isArray(old)) return old;
          return old.map(v => v.id === updatedVideo.id ? { ...v, watchProgress: updatedVideo.watchProgress } : v);
        });
        queryClient.setQueriesData({ queryKey: ['trending-tick'] }, (old: any) => {
          if (!Array.isArray(old)) return old;
          return old.map(v => v.id === updatedVideo.id ? { ...v, watchProgress: updatedVideo.watchProgress } : v);
        });
      }).catch(() => {});
    }
  };

  // ── Scrubber interactions ──
  const getScrubRatio = (clientX: number) => {
    if (!scrubberRef.current) return 0;
    const rect = scrubberRef.current.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  };

  const handleScrubStart = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    setIsScrubbing(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const ratio = getScrubRatio(e.clientX);
    if (videoRef.current) {
      videoRef.current.currentTime = ratio * (videoRef.current.duration || 0);
      setCurrentTime(videoRef.current.currentTime);
    }
    showControls();
  };

  const handleScrubMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrubbing) return;
    e.stopPropagation();
    const ratio = getScrubRatio(e.clientX);
    if (videoRef.current) {
      videoRef.current.currentTime = ratio * (videoRef.current.duration || 0);
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleScrubEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setIsScrubbing(false);
    showControls();
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const val = parseFloat(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);
  };

  return (
    <div
      ref={containerRef}
      onClick={handleContainerClick}
      onMouseMove={showControls}
      style={{
        width: '100%',
        aspectRatio: '16/9',
        background: '#000',
        borderRadius: isFullscreen ? 0 : 16,
        overflow: 'hidden',
        position: 'relative',
        cursor: controlsVisible ? 'default' : 'none',
      }}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={video.mediaUrl}
        poster={video.thumbnailUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => {
          setDuration(videoRef.current?.duration || 0);
          if (videoRef.current) videoRef.current.playbackRate = playbackSpeed;
        }}
        onEnded={() => setIsPlaying(false)}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
        onCanPlay={() => setIsBuffering(false)}
        playsInline
        style={{
          width: '100%', height: '100%', objectFit: 'contain',
          display: 'block', pointerEvents: 'none',
        }}
      />

      {/* ── Buffering / Loading Spinner ── */}
      <AnimatePresence>
        {isBuffering && isPlaying && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute', inset: 0, zIndex: 50,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Loader
                size={32}
                color="#fff"
                style={{ animation: 'spin 1s linear infinite' }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Seek Flash Overlay ── */}
      <AnimatePresence>
        {seekFlash && (
          <motion.div
            key={seekFlash + Date.now()}
            initial={{ opacity: 0.85 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.7 }}
            style={{
              position: 'absolute', [seekFlash === 'left' ? 'left' : 'right']: 0,
              top: 0, bottom: 0, width: '50%', zIndex: 40,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: seekFlash === 'left'
                ? 'radial-gradient(circle at 30% 50%, rgba(255,255,255,0.12), transparent 70%)'
                : 'radial-gradient(circle at 70% 50%, rgba(255,255,255,0.12), transparent 70%)',
              pointerEvents: 'none',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              {seekFlash === 'left'
                ? <RotateCcw size={38} color="#fff" strokeWidth={2} />
                : <RotateCw size={38} color="#fff" strokeWidth={2} />
              }
              <span style={{ fontSize: 14, fontWeight: 700, color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.4)' }}>
                {seekFlash === 'left' ? '10 seconds' : '10 seconds'}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Controls Overlay ── */}
      <AnimatePresence>
        {controlsVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'absolute', inset: 0, zIndex: 10,
              pointerEvents: 'none',
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 22%, transparent 60%, rgba(0,0,0,0.65) 100%)',
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            }}
          >
            {/* ── Top Bar ── */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
              padding: '10px 16px', gap: 10, pointerEvents: 'all',
            }}>
              <button onClick={cycleSpeed} title="Playback speed" style={{
                background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff',
                fontSize: 13, fontWeight: 700, padding: '5px 14px', borderRadius: 6,
                cursor: 'pointer', backdropFilter: 'blur(4px)',
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <Settings size={14} />
                {playbackSpeed}x
              </button>
            </div>

            {/* ── Center: Prev Video / Play-Pause / Next Video ── */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 48, pointerEvents: 'all',
            }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // If more than 3s into video, restart it (YouTube behavior)
                  if (videoRef.current && videoRef.current.currentTime > 3) {
                    videoRef.current.currentTime = 0;
                    showControls();
                    return;
                  }
                  // Otherwise navigate to last recommendation
                  if (recommendations && recommendations.length > 0) {
                    navigate(`/video/${recommendations[recommendations.length - 1].id}`);
                  }
                }}
                title="Previous video"
                style={{
                  background: 'rgba(0,0,0,0.4)', borderRadius: '50%', padding: 10,
                  border: 'none', color: '#fff', cursor: 'pointer',
                  backdropFilter: 'blur(4px)', transition: 'transform 0.15s, background 0.15s',
                  opacity: recommendations && recommendations.length > 0 ? 1 : 0.4,
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.4)')}
              >
                <SkipBack size={28} fill="#fff" />
              </button>

              <button
                onClick={(e) => { e.stopPropagation(); togglePlayDirect(); }}
                title={isPlaying ? 'Pause' : 'Play'}
                style={{
                  background: 'rgba(0,0,0,0.4)', borderRadius: '50%', padding: 16,
                  border: 'none', color: '#fff', cursor: 'pointer',
                  backdropFilter: 'blur(4px)', transition: 'transform 0.15s, background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.4)')}
              >
                {isPlaying
                  ? <Pause size={40} fill="#fff" />
                  : <Play size={40} fill="#fff" style={{ marginLeft: 4 }} />
                }
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (recommendations && recommendations.length > 0) {
                    navigate(`/video/${recommendations[0].id}`);
                  }
                }}
                title="Next video"
                style={{
                  background: 'rgba(0,0,0,0.4)', borderRadius: '50%', padding: 10,
                  border: 'none', color: '#fff', cursor: 'pointer',
                  backdropFilter: 'blur(4px)', transition: 'transform 0.15s, background 0.15s',
                  opacity: recommendations && recommendations.length > 0 ? 1 : 0.4,
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.4)')}
              >
                <SkipForward size={28} fill="#fff" />
              </button>
            </div>

            {/* ── Bottom Bar ── */}
            <div style={{ display: 'flex', flexDirection: 'column', pointerEvents: 'all' }}>
              {/* Scrubber */}
              <div
                ref={scrubberRef}
                data-scrubber="true"
                onPointerDown={handleScrubStart}
                onPointerMove={handleScrubMove}
                onPointerUp={handleScrubEnd}
                onPointerCancel={handleScrubEnd}
                style={{
                  position: 'relative', width: '100%', height: 20,
                  display: 'flex', alignItems: 'flex-end', cursor: 'pointer',
                  padding: '0 12px', touchAction: 'none',
                }}
              >
                <div style={{
                  position: 'relative', width: '100%',
                  height: isScrubbing ? 6 : 4,
                  background: 'rgba(255,255,255,0.25)',
                  borderRadius: 3, transition: 'height 0.15s ease',
                }}>
                  <div style={{
                    position: 'absolute', left: 0, top: 0, height: '100%',
                    width: `${buffered * 100}%`, background: 'rgba(255,255,255,0.4)',
                    borderRadius: 3,
                  }} />
                  <div style={{
                    position: 'absolute', left: 0, top: 0, height: '100%',
                    width: progressPct, background: '#ff0000', borderRadius: 3,
                  }} />
                  <div style={{
                    position: 'absolute', left: progressPct, top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: isScrubbing ? 16 : 12, height: isScrubbing ? 16 : 12,
                    borderRadius: '50%', background: '#ff0000',
                    transition: 'width 0.15s, height 0.15s',
                    boxShadow: '0 0 4px rgba(0,0,0,0.4)',
                  }} />
                </div>
              </div>

              {/* Time + Controls Row */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '4px 12px 10px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); showControls(); }}
                    style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 4, display: 'flex' }}
                  >
                    {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                  </button>
                  <input
                    type="range"
                    min="0" max="1" step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    onClick={(e) => e.stopPropagation()}
                    style={{ width: 70, accentColor: '#fff', cursor: 'pointer' }}
                  />
                  <span style={{
                    color: '#ddd', fontSize: 13, fontWeight: 500,
                    fontFamily: 'Roboto, Arial, sans-serif',
                  }}>
                    {formatTime(currentTime)} <span style={{ opacity: 0.6 }}>/ {formatTime(duration)}</span>
                  </span>
                </div>

                <button
                  onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
                  title="Fullscreen"
                  style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 4 }}
                >
                  {isFullscreen ? <Minimize2 size={20} /> : <Maximize size={20} />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Slim progress bar when controls are hidden ── */}
      {!controlsVisible && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
          background: 'rgba(255,255,255,0.2)', pointerEvents: 'none', zIndex: 15,
        }}>
          <div style={{
            height: '100%', width: progressPct, background: '#ff0000',
            borderRadius: '0 2px 2px 0',
          }} />
        </div>
      )}

      {/* Inline keyframe for spinner */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
