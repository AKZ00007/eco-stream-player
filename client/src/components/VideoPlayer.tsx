import { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useDragControls } from 'framer-motion';
import { usePlayerStore } from '../store/usePlayerStore';
import {
  Play, Pause, ChevronDown, Maximize,
  SkipBack, SkipForward, X,
  Cast, RotateCcw, RotateCw, Volume2, VolumeX,
  Loader, WifiOff
} from 'lucide-react';
import { formatTime } from '../utils/helpers';
import { useRecommendations, updateWatchProgress } from '../api/queries';
import { useQueryClient } from '@tanstack/react-query';
import { getThemedTint } from '../utils/colorExtractor';
import { useThemeStore } from '../store/useThemeStore';
import { useColorExtract } from '../hooks/useColorExtract';

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 768);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return isDesktop;
}

export default function VideoPlayer() {
  const {
    currentVideo, state, minimizePlayer, maximizePlayer, isPlaying,
    setPlaying, progress, setProgress, openPlayer, closePlayer
  } = usePlayerStore();
  const queryClient = useQueryClient();

  // Derive a theme-aware tinted background from the dynamically extracted video's thumbnail color
  const themeMode = useThemeStore((s) => s.mode);
  const extractedHex = useColorExtract(currentVideo?.thumbnailUrl, '#0a0a0a');
  const tintedBg = getThemedTint(extractedHex, themeMode);

  const isDesktop = useIsDesktop();
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isMuted, setMuted] = useState(false);
  const [seekFlash, setSeekFlash] = useState<'left' | 'right' | null>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [networkError, setNetworkError] = useState(false);

  const hasAutoResumed = useRef<string | null>(null);

  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSyncRef = useRef<number>(0);
  const miniRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();
  const dragY = useMotionValue(0);
  const playerOpacity = useTransform(dragY, [0, 200], [1, 0.4]);

  const isFull = state === 'FULL';

  // Fetch recommendations for Up Next
  const { data: recommendations } = useRecommendations(
    currentVideo?.categorySlug || '',
    currentVideo?.id || ''
  );

  // Auto-resume & Auto-play logic
  useEffect(() => {
    if (currentVideo && isFull && hasAutoResumed.current !== currentVideo.id) {
      hasAutoResumed.current = currentVideo.id;
      setNetworkError(false);
      setIsBuffering(true);
      
      const savedProgress = currentVideo.watchProgress || 0;
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

      // ── Always auto-play with muted start ──
      // Browsers block autoplay with sound. We start muted then fade in.
      if (videoRef.current) {
        videoRef.current.muted = true;
        videoRef.current.play().then(() => {
          setPlaying(true);
          // Gently fade in audio after a short delay
          setTimeout(() => {
            if (videoRef.current) {
              videoRef.current.muted = false;
              let fadeStep = 0;
              const fadeInterval = setInterval(() => {
                fadeStep += 0.1;
                if (fadeStep >= 1) {
                  videoRef.current!.volume = 1;
                  clearInterval(fadeInterval);
                } else {
                  videoRef.current!.volume = fadeStep;
                }
              }, 50);
            }
          }, 300);
        }).catch(() => {
          setPlaying(false);
          setIsBuffering(false);
        });
      }
    }
  }, [currentVideo?.id, isFull, setPlaying]);

  // Auto-play toggle
  useEffect(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  }, [isPlaying]);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (isPlaying) setControlsVisible(false);
    }, 3500);
  }, [isPlaying]);

  useEffect(() => {
    showControls();
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, [isPlaying, showControls]);

  // ── Double-tap seek: YouTube-style gesture ──
  // Handled on the player CONTAINER so it works regardless of controls visibility.
  // Buttons inside use stopPropagation so they don't trigger this.
  const lastTapTimeRef = useRef(0);
  const lastTapSideRef = useRef<'left' | 'right' | null>(null);
  const singleTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePlayerTap = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Determine which side was tapped
    const rect = e.currentTarget.getBoundingClientRect();
    const tapX = e.clientX - rect.left;
    const side: 'left' | 'right' = tapX < rect.width / 2 ? 'left' : 'right';

    const now = Date.now();
    const wasDoubleTap = (now - lastTapTimeRef.current < 300) && lastTapSideRef.current === side;

    if (wasDoubleTap) {
      // Cancel the pending single-tap toggle
      if (singleTapTimer.current) { clearTimeout(singleTapTimer.current); singleTapTimer.current = null; }
      lastTapTimeRef.current = 0;
      lastTapSideRef.current = null;
      // Perform the 10-second skip
      if (videoRef.current) {
        const d = videoRef.current.duration || 0;
        const ct = videoRef.current.currentTime;
        videoRef.current.currentTime = Math.max(0, Math.min(d, ct + (side === 'left' ? -10 : 10)));
        setSeekFlash(side);
        setTimeout(() => setSeekFlash(null), 600);
      }
    } else {
      // Record this tap and wait to see if a second tap follows
      lastTapTimeRef.current = now;
      lastTapSideRef.current = side;
      if (singleTapTimer.current) clearTimeout(singleTapTimer.current);
      singleTapTimer.current = setTimeout(() => {
        // No second tap arrived → toggle controls visibility
        setControlsVisible(prev => !prev);
        if (!controlsVisible) showControls();
        singleTapTimer.current = null;
      }, 300);
    }
  }, [controlsVisible, showControls]);

  // ── Next / Previous video from recommendations ──
  const playNextVideo = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (recommendations && recommendations.length > 0) {
      openPlayer(recommendations[0]);
    }
    showControls();
  };

  const playPrevVideo = (e: React.MouseEvent) => {
    e.stopPropagation();
    // If more than 3 seconds into the video, restart it (like YouTube)
    if (videoRef.current && videoRef.current.currentTime > 3) {
      videoRef.current.currentTime = 0;
      showControls();
      return;
    }
    // Otherwise go to the last recommendation (wrap around)
    if (recommendations && recommendations.length > 0) {
      openPlayer(recommendations[recommendations.length - 1]);
    }
    showControls();
  };

  const handleCast = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current && (videoRef.current as any).remote && (videoRef.current as any).remote.prompt) {
      (videoRef.current as any).remote.prompt().catch(() => {
        alert("Cast not supported or no devices found.");
      });
    } else {
      alert("Screen sharing / Cast is not supported in this browser.");
    }
  };

  const cycleSpeed = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextSpeed = playbackSpeed === 1 ? 1.5 : playbackSpeed === 1.5 ? 0.5 : 1;
    setPlaybackSpeed(nextSpeed);
    if (videoRef.current) videoRef.current.playbackRate = nextSpeed;
    showControls();
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current || isScrubbing) return;
    const ct = videoRef.current.currentTime;
    const dur = videoRef.current.duration || 0;
    setCurrentTime(ct);
    setDuration(dur);
    
    const currProgress = dur ? ct / dur : 0;
    setProgress(currProgress);

    if (videoRef.current.buffered.length > 0) {
      setBuffered(videoRef.current.buffered.end(videoRef.current.buffered.length - 1) / dur);
    }

    const now = Date.now();
    if (isPlaying && now - lastSyncRef.current > 5000 && currentVideo) {
      lastSyncRef.current = now;
      if (dur > 0) {
        updateWatchProgress(currentVideo.id, currProgress).then((updatedVideo) => {
          queryClient.setQueriesData({ predicate: () => true }, (old: any) => {
            if (!Array.isArray(old)) return old;
            return old.map((item: any) => 
               item?.id === updatedVideo.id ? { ...item, watchProgress: updatedVideo.watchProgress } : item
            );
          });
        }).catch(() => {});
      }
    }
  };

  const handleScrubberClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    if (videoRef.current) {
      videoRef.current.currentTime = ratio * (videoRef.current.duration || 0);
    }
    showControls();
  };

  // ── Draggable scrubber with pointer capture ──
  const scrubberRef = useRef<HTMLDivElement>(null);

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
      setProgress(ratio);
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
      setProgress(ratio);
    }
  };

  const handleScrubEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setIsScrubbing(false);
    showControls();
  };


  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPlaying(!isPlaying);
    if (!isPlaying) showControls();
  };

  const toggleFullscreen = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // iOS Safari: use webkitEnterFullscreen on the video element directly
    const vid = videoRef.current as any;
    if (vid?.webkitEnterFullscreen) {
      try {
        vid.webkitEnterFullscreen();
        setIsFullscreen(true);
      } catch (err) {}
      return;
    }

    // Standard Fullscreen API (Android/Chrome/Desktop)
    if (!playerContainerRef.current) return;
    if (!(document.fullscreenElement || (document as any).webkitFullscreenElement)) {
      try {
        if (playerContainerRef.current.requestFullscreen) {
          await playerContainerRef.current.requestFullscreen();
        } else if ((playerContainerRef.current as any).webkitRequestFullscreen) {
          (playerContainerRef.current as any).webkitRequestFullscreen();
        }
        setIsFullscreen(true);
        if (screen.orientation && (screen.orientation as any).lock) {
          try { await (screen.orientation as any).lock('landscape'); } catch (err) {}
        }
      } catch (err) {}
    } else {
      try {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          (document as any).webkitExitFullscreen();
        }
        setIsFullscreen(false);
        if (screen.orientation && (screen.orientation as any).unlock) {
          try { (screen.orientation as any).unlock(); } catch (err) {}
        }
      } catch (err) {}
    }
  };

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!(document.fullscreenElement || (document as any).webkitFullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
    };
  }, []);


  // Save progress whenever the player is minimized or closed
  const saveProgressBeforeLeave = useCallback(() => {
    if (currentVideo && videoRef.current) {
      const dur = videoRef.current.duration || 0;
      if (dur > 0) {
        const currProgress = videoRef.current.currentTime / dur;
        updateWatchProgress(currentVideo.id, currProgress).catch(() => {});
      }
    }
  }, [currentVideo]);

  const handleDragEnd = (_: any, info: any) => {
    if (isFull) {
      if (info.offset.y > 80 && info.velocity.y > 0) {
        saveProgressBeforeLeave();
        minimizePlayer();
      } else {
        dragY.set(0);
      }
    } else {
      // ONLY close if flicked rapidly horizontally. Don't close on normal slow dragging.
      if (Math.abs(info.velocity.x) > 500) {
        saveProgressBeforeLeave();
        closePlayer();
      }
    }
  };

  if (!currentVideo || state === 'CLOSED') return null;

  const progressPct = `${(progress * 100).toFixed(2)}%`;

  // ── Shared inner content for both full and mini states ──
  const playerInner = (
    <div 
      className={isFull ? "scroll-area h-full w-full" : "w-full h-full"}
      style={{ 
        display: 'flex', flexDirection: 'column', height: '100%', 
        overflowY: isFullscreen || !isFull ? 'hidden' : 'auto', 
        width: '100%',
        backgroundColor: isFull ? 'transparent' : 'var(--base-0)',
      }}
    >
      {/* ── Video Player Container ── */}
      <div 
        ref={playerContainerRef}
        onPointerDown={(e) => {
          if (isFull && !isFullscreen && !isScrubbing) dragControls.start(e);
        }}
        style={{ position: 'relative', width: '100%', height: isFull ? 'auto' : '100%', aspectRatio: isFull ? '16/9' : undefined, backgroundColor: '#000', flexShrink: 0, touchAction: 'none' }}
        onClick={isFull ? handlePlayerTap : maximizePlayer}
      >
        <motion.video
          layoutId={`video-thumb-${currentVideo.id}`}
          ref={videoRef}
          src={currentVideo.mediaUrl}
          muted={isMuted}
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', pointerEvents: 'none' }}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={() => {
            setDuration(videoRef.current?.duration || 0);
            if (videoRef.current) videoRef.current.playbackRate = playbackSpeed;
          }}
          onEnded={() => setPlaying(false)}
          onWaiting={() => setIsBuffering(true)}
          onPlaying={() => { setIsBuffering(false); setNetworkError(false); }}
          onCanPlay={() => setIsBuffering(false)}
          onError={() => setNetworkError(true)}
          playsInline
        />

        {/* ── Buffering / Loading Overlay ── */}
        <AnimatePresence>
          {isBuffering && !networkError && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{
                position: 'absolute', inset: 0, zIndex: 45,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                pointerEvents: 'none',
              }}
            >
              <div style={{
                width: 50, height: 50, borderRadius: '50%',
                background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Loader size={28} color="#fff" style={{ animation: 'spin 1.2s linear infinite' }} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Network Error Overlay ── */}
        <AnimatePresence>
          {networkError && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{
                position: 'absolute', inset: 0, zIndex: 55,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,0,0,0.85)', gap: 12, padding: 20, textAlign: 'center'
              }}
            >
              <WifiOff size={40} color="#888" />
              <span style={{ color: '#eee', fontSize: 15, fontWeight: 600 }}>Connect to the internet</span>
              <span style={{ color: '#888', fontSize: 13 }}>You're offline. Check your connection.</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setNetworkError(false);
                  setIsBuffering(true);
                  if (videoRef.current) {
                    videoRef.current.load();
                    videoRef.current.play().then(() => setPlaying(true)).catch(() => {});
                  }
                }}
                style={{
                  marginTop: 10, padding: '8px 24px', borderRadius: 20,
                  background: '#fff', color: '#000', border: 'none',
                  fontSize: 14, fontWeight: 700, cursor: 'pointer',
                }}
              >
                Retry
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Seek flash indicators */}
        <AnimatePresence>
          {seekFlash && (
            <motion.div
              key={seekFlash}
              initial={{ opacity: 0.9 }} animate={{ opacity: 0 }} exit={{}} transition={{ duration: 0.6 }}
              style={{
                position: 'absolute', [seekFlash === 'left' ? 'left' : 'right']: 0,
                top: 0, bottom: 0, width: '50%', zIndex: 40,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(255,255,255,0.08)', pointerEvents: 'none'
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                {seekFlash === 'left' ? <RotateCcw size={32} color="#fff" /> : <RotateCw size={32} color="#fff" />}
                <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
                  {seekFlash === 'left' ? '- 10s' : '+ 10s'}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Interactive Controls Overlay (Only in Full mode) */}
        <AnimatePresence>
          {isFull && controlsVisible && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
              style={{
                position: 'absolute', inset: 0, zIndex: 20, pointerEvents: 'none',
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 20%, transparent 70%, rgba(0,0,0,0.7) 100%)',
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
              }}
            >
              {/* Top Bar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', pointerEvents: 'all' }}>
                <button onClick={(e) => { e.stopPropagation(); saveProgressBeforeLeave(); minimizePlayer(); }} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 4 }}>
                  <ChevronDown size={28} />
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20, color: '#fff' }}>
                  <button onClick={(e) => { e.stopPropagation(); setMuted(!isMuted); showControls(); }} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 4, display: 'flex' }}>
                    {isMuted ? <VolumeX size={22} className="opacity-80" /> : <Volume2 size={22} className="opacity-80" />}
                  </button>
                  <button onClick={handleCast} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 4, display: 'flex' }}>
                    <Cast size={22} className="opacity-80" />
                  </button>
                  <button onClick={cycleSpeed} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, padding: '4px 12px', borderRadius: 12, cursor: 'pointer' }}>
                    {playbackSpeed}x
                  </button>
                </div>
              </div>

              {/* Center Controls: Prev Video / Play-Pause / Next Video */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 40, pointerEvents: 'all' }}>
                <button onClick={playPrevVideo} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '50%', padding: 12, border: 'none', color: '#fff', cursor: 'pointer' }}>
                  <SkipBack size={32} fill="#fff" />
                </button>
                <button onClick={togglePlay} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '50%', padding: 16, border: 'none', color: '#fff', cursor: 'pointer' }}>
                  {isPlaying ? <Pause size={48} fill="#fff" /> : <Play size={48} fill="#fff" style={{ marginLeft: 6 }} />}
                </button>
                <button onClick={playNextVideo} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '50%', padding: 12, border: 'none', color: '#fff', cursor: 'pointer' }}>
                  <SkipForward size={32} fill="#fff" />
                </button>
              </div>

              {/* Bottom Bar Controls */}
              <div style={{ display: 'flex', flexDirection: 'column', width: '100%', pointerEvents: 'all' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px 12px' }}>
                  <span style={{ color: '#eee', fontSize: 13, fontWeight: 500, fontFamily: 'Roboto, Arial, sans-serif' }}>
                    {formatTime(currentTime)} <span style={{ opacity: 0.7 }}>/ {formatTime(duration)}</span>
                  </span>
                  <button onClick={toggleFullscreen} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 4 }}>
                    <Maximize size={22} />
                  </button>
                </div>
                {/* Scrubber */}
                <div
                  ref={scrubberRef}
                  onPointerDown={handleScrubStart}
                  onPointerMove={handleScrubMove}
                  onPointerUp={handleScrubEnd}
                  onPointerCancel={handleScrubEnd}
                  onClick={handleScrubberClick}
                  style={{ position: 'absolute', bottom: -2, left: 0, right: 0, height: 28, display: 'flex', alignItems: 'flex-end', cursor: 'pointer', touchAction: 'none' }}
                >
                  <div style={{ position: 'relative', width: '100%', height: isScrubbing ? 6 : 4, background: 'rgba(255,255,255,0.3)', transition: 'height 0.15s ease' }}>
                    <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${buffered * 100}%`, background: 'rgba(255,255,255,0.5)' }} />
                    <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: progressPct, background: '#ff0000' }} />
                    <div style={{ 
                      position: 'absolute', left: progressPct, top: '50%', transform: 'translate(-50%, -50%)',
                      width: isScrubbing ? 18 : 14, height: isScrubbing ? 18 : 14, borderRadius: '50%', background: '#ff0000',
                      transition: 'width 0.15s ease, height 0.15s ease'
                    }} />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Persistent slim progress bar when controls hidden (full) or always (mini) */}
        {(!controlsVisible || !isFull) && (
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: isFull ? 2 : 3, background: 'rgba(255,255,255,0.2)', pointerEvents: 'none', zIndex: 10 }}>
            <div style={{ height: '100%', width: progressPct, background: isFull ? '#ff0000' : '#00e676', borderRadius: '0 2px 2px 0' }} />
          </div>
        )}

        {/* ── PiP Overlay (only in mini mode) ── */}
        {!isFull && (
          <div
            style={{
              position: 'absolute', inset: 0, zIndex: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.15)',
            }}
          >
            <button
              onClick={(e) => { e.stopPropagation(); setPlaying(!isPlaying); }}
              style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              {isPlaying ? <Pause size={18} fill="#fff" /> : <Play size={18} fill="#fff" style={{ marginLeft: 2 }} />}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); saveProgressBeforeLeave(); closePlayer(); }}
              style={{ position: 'absolute', top: 6, right: 6, color: '#fff', background: 'rgba(0,0,0,0.5)', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {/* ── Metadata & Feed (only in Full, not Fullscreen) ── */}
      {isFull && !isFullscreen && (
        <div style={{ paddingBottom: 100 }}>
          <div style={{ padding: '16px', borderBottom: '1px solid var(--border-sub)' }}>
            <div style={{ marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: 'var(--emerald)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {currentVideo.categorySlug?.replace(/-/g, ' ')}
              </span>
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 400, color: 'var(--ink-0)', margin: '0 0 12px 0', lineHeight: 1.2, fontFamily: '"DM Serif Display", serif' }}>
              {currentVideo.title}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--emerald)', fontWeight: 600, padding: '2px 8px', background: 'var(--emerald-dim)', borderRadius: 4 }}>
                Impact Score: {currentVideo.impactScore}
              </span>
            </div>
          </div>

          {/* ── Up Next / Recommendations Rail ── */}
          <div style={{ padding: '24px 0' }}>
            <div style={{ 
              display: isDesktop ? 'grid' : 'flex',
              flexDirection: isDesktop ? 'row' : 'column',
              gridTemplateColumns: isDesktop ? 'repeat(auto-fill, minmax(300px, 1fr))' : 'none',
              gap: '16px',
              padding: '0 16px',
            }}>
              {!recommendations && Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton" style={{ width: '100%', height: 100, borderRadius: 12 }} />
              ))}

              {recommendations?.map((v) => (
                <div key={v.id} onClick={() => { openPlayer(v) }} style={{ display: 'flex', gap: 12, cursor: 'pointer' }}>
                  <div style={{ width: 160, minWidth: 160, height: 90, borderRadius: 12, overflow: 'hidden', position: 'relative', background: '#222' }}>
                    <img src={v.thumbnailUrl} alt={v.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', bottom: 4, right: 4, background: 'rgba(0,0,0,0.8)', color: '#fff', fontSize: 11, padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>{v.duration}</div>
                    {v.watchProgress > 0 && (
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: 'rgba(255,255,255,0.2)' }}>
                        <div style={{ width: `${v.watchProgress * 100}%`, height: '100%', background: '#ff0000' }} />
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', paddingTop: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#f1f1f1', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.3 }}>{v.title}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ── Render the correct wrapper ──
  if (isFull) {
    return (
      <motion.div
        drag={!isFullscreen ? "y" : false}
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.2}
        style={{ 
          y: dragY, 
          opacity: playerOpacity, 
          display: 'flex', flexDirection: 'column', 
          backgroundColor: tintedBg,
          transition: 'background-color 0.6s ease',
          position: 'fixed' as any,
          zIndex: isFullscreen ? 9999 : 200,
          height: '100dvh'
        }}
        className={`player-fullscreen ${isFullscreen ? 'z-[9999]' : ''}`}
        onDragEnd={handleDragEnd}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 35 }}
      >
        {playerInner}
      </motion.div>
    );
  }

  return (
    <motion.div
      ref={miniRef}
      drag
      dragMomentum={false}
      dragElastic={0}
      onDragEnd={handleDragEnd}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.6 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      style={{ 
        display: 'flex', flexDirection: 'column', 
        backgroundColor: '#0f0f0f', 
        position: 'fixed' as any,
        zIndex: 250,
        bottom: 'calc(70px + env(safe-area-inset-bottom))',
        right: '12px',
        width: '220px',
        aspectRatio: '16/9',
        borderRadius: '12px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
        overflow: 'hidden',
        cursor: 'grab',
        touchAction: 'none',
      }}
    >
      {playerInner}
    </motion.div>
  );


}
