import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, X, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePlayerStore } from '../store/usePlayerStore';
import { updateWatchProgress } from '../api/queries';

export default function DesktopMiniPlayer() {
  const { desktopMiniVideo: video, desktopMiniProgress, clearDesktopMini } = usePlayerStore();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(true);
  const [progressPct, setProgressPct] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const lastSyncRef = useRef(Date.now());

  // Restore playback immediately
  useEffect(() => {
    if (video && videoRef.current) {
      const onLoaded = () => {
        if (videoRef.current) {
          videoRef.current.currentTime = desktopMiniProgress * videoRef.current.duration;
          videoRef.current.play().catch(() => setIsPlaying(false));
        }
      };
      if (videoRef.current.readyState >= 1) onLoaded();
      else videoRef.current.addEventListener('loadedmetadata', onLoaded, { once: true });
    }
  }, [video, desktopMiniProgress]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    if (isPlaying) videoRef.current.pause();
    else videoRef.current.play().catch(() => {});
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current || !video) return;
    const ct = videoRef.current.currentTime;
    const dur = videoRef.current.duration || 1;
    setProgressPct((ct / dur) * 100);

    const now = Date.now();
    if (isPlaying && now - lastSyncRef.current > 5000) {
      lastSyncRef.current = now;
      updateWatchProgress(video.id, ct / dur).catch(() => {});
    }
  };

  if (!video) return null;

  return (
    <AnimatePresence>
      <motion.div
        drag
        dragConstraints={{ left: -1000, right: 0, top: -1000, bottom: 0 }}
        dragElastic={0.1}
        initial={{ y: 100, opacity: 0, scale: 0.8 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 100, opacity: 0, scale: 0.8 }}
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          width: 320, aspectRatio: '16/9',
          background: '#000', borderRadius: 12, overflow: 'hidden',
          boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
          border: '1px solid rgba(255,255,255,0.1)',
          cursor: isHovered ? 'grab' : 'default',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        whileDrag={{ cursor: 'grabbing', scale: 1.02 }}
      >
        <video
          ref={videoRef}
          src={video.mediaUrl}
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => setIsPlaying(false)}
          playsInline
          style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }}
        />

        {/* ── Progress Bar ── */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 4,
          background: 'rgba(255,255,255,0.2)'
        }}>
          <div style={{ height: '100%', width: `${progressPct}%`, background: '#ff0000' }} />
        </div>

        {/* ── Hover Controls ── */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24
              }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // Capture live progress so the full player resumes perfectly
                  const finalProgress = videoRef.current ? (videoRef.current.currentTime / (videoRef.current.duration||1)) : desktopMiniProgress;
                  // Sync progress to backend before expanding
                  updateWatchProgress(video.id, finalProgress).catch(() => {});
                  navigate(`/video/${video.id}`);
                  clearDesktopMini();
                }}
                style={{
                  background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 8,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4
                }}
              >
                <div style={{ background: 'rgba(255,255,255,0.15)', padding: 10, borderRadius: '50%' }}>
                  <ExternalLink size={20} />
                </div>
              </button>

              <button
                onClick={togglePlay}
                style={{
                  background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 8,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4
                }}
              >
                <div style={{ background: 'rgba(255,255,255,0.15)', padding: 14, borderRadius: '50%' }}>
                  {isPlaying ? <Pause size={28} /> : <Play size={28} style={{ marginLeft: 4 }} />}
                </div>
              </button>
              
              <button
                // Positioned specifically top-right for a native "close" feel
                onClick={(e) => { e.stopPropagation(); clearDesktopMini(); }}
                style={{
                  position: 'absolute', top: 8, right: 8,
                  background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', cursor: 'pointer',
                  padding: 6, borderRadius: '50%'
                }}
              >
                <X size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
