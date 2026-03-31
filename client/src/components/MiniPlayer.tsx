import { motion, type PanInfo, AnimatePresence } from 'framer-motion';
import { Play, Pause, X, ChevronUp } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { formatTime } from '../utils/helpers';

export default function MiniPlayer() {
  const { currentVideo, state, isPlaying, setPlaying, closePlayer, openPlayer, progress } = usePlayerStore();

  if (state !== 'MINI' || !currentVideo) return null;

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (Math.abs(info.offset.x) > 80) {
      closePlayer();
    }
    if (info.offset.y < -60) {
      openPlayer(currentVideo); // swipe up to expand
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        drag={true}
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElastic={0.4}
        onDragEnd={handleDragEnd}
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 30 }}
        className="mini-player"
        style={{
          background: 'rgba(7, 14, 7, 0.98)',
          backdropFilter: 'blur(16px)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          cursor: 'pointer',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.5)',
        }}
        onClick={() => openPlayer(currentVideo)}
      >
        {/* Green progress line at top */}
        <div style={{ height: 2, background: 'rgba(255,255,255,0.08)', width: '100%' }}>
          <motion.div
            style={{ height: '100%', width: `${progress * 100}%`, background: 'var(--emerald)' }}
          />
        </div>

        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 6 }}>
          <div style={{ width: 32, height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.15)' }} />
        </div>

        {/* Main row */}
        <div style={{
          display: 'flex', alignItems: 'center',
          padding: '8px 12px 12px', gap: 12,
        }}>
          {/* Thumbnail */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <img
              src={currentVideo.thumbnailUrl}
              alt={currentVideo.title}
              style={{ width: 56, height: 40, objectFit: 'cover', borderRadius: 8, display: 'block' }}
            />
            {/* Expand hint */}
            <div style={{
              position: 'absolute', inset: 0, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.4)', borderRadius: 8,
              opacity: 0,
            }}>
              <ChevronUp size={16} color="#fff" />
            </div>
          </div>

          {/* Text info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              margin: 0, fontSize: 13, fontWeight: 600,
              color: '#fff', whiteSpace: 'nowrap',
              overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {currentVideo.title}
            </p>
            <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 500, marginTop: 3 }}>
              {formatTime((progress || 0) * 1)} · {currentVideo.duration}
            </p>
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={e => e.stopPropagation()}>
            <motion.button
              whileTap={{ scale: 0.8 }}
              onClick={() => setPlaying(!isPlaying)}
              style={{
                width: 44, height: 44, borderRadius: '50%',
                background: 'transparent',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--ink-0)'
              }}
            >
              {isPlaying
                ? <Pause size={22} fill="currentColor" color="currentColor" />
                : <Play size={22} fill="currentColor" color="currentColor" style={{ marginLeft: 2 }} />}
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.8 }}
              onClick={closePlayer}
              style={{
                width: 40, height: 40, borderRadius: '50%',
                background: 'transparent', border: 'none',
                cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <X size={24} color="rgba(255,255,255,0.7)" />
            </motion.button>
          </div>
        </div>

        <div style={{ textAlign: 'center', paddingBottom: 6 }}>
          <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>
            Swipe ↔ dismiss · Swip ↕ expand
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
