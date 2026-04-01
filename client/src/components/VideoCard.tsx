import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Leaf } from 'lucide-react';
import type { Video } from '../types';
import { usePlayerStore } from '../store/usePlayerStore';
import { getImpactClass } from '../utils/helpers';

interface VideoCardProps {
  video: Video;
  index?: number;
}

export default function VideoCard({ video, index = 0 }: VideoCardProps) {
  const openPlayer = usePlayerStore((s) => s.openPlayer);

  return (
    <motion.div
      layoutId={`video-card-${video.id}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.3 }}
      className="video-card flex-shrink-0 w-[200px] overflow-hidden rounded-2xl"
      style={{ background: '#16191f' }}
      onClick={() => openPlayer(video)}
    >
      {/* Thumbnail */}
      <div className="relative w-full" style={{ aspectRatio: '16/9', background: '#0d0f14' }}>
        <motion.img
          layoutId={`video-thumb-${video.id}`}
          src={video.thumbnailUrl}
          alt={video.title}
          loading="lazy"
          className="w-full h-full object-cover"
          style={{ display: 'block' }}
        />

        {/* Dark gradient overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 60%)'
        }} />

        {/* Duration bottom-right */}
        <div style={{
          position: 'absolute', bottom: 6, right: 6,
          background: 'rgba(0,0,0,0.85)',
          color: '#fff', fontSize: 11,
          fontWeight: 700, fontFamily: 'monospace',
          padding: '2px 6px', borderRadius: 4,
          letterSpacing: '0.04em',
        }}>
          {video.duration}
        </div>

        {/* Watch progress bar */}
        {video.watchProgress > 0 && (
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, background: 'rgba(255,255,255,0.2)', zIndex: 10 }}>
            <div className="progress-bar" style={{ width: `${video.watchProgress * 100}%`, height: '100%' }} />
          </div>
        )}

        {/* Trending badge */}
        <AnimatePresence>
          {video.isTrending && (
            <motion.div
              key="trending"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              style={{
                position: 'absolute', top: 8, left: 8,
                display: 'flex', alignItems: 'center', gap: 3,
                background: 'linear-gradient(135deg, #ff6b35, #ff3d00)',
                color: '#fff', fontSize: 10, fontWeight: 800,
                padding: '3px 8px', borderRadius: 20,
                textTransform: 'uppercase', letterSpacing: '0.08em',
              }}
            >
              <Flame size={10} />
              Hot
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Card Info */}
      <motion.div layoutId={`video-info-${video.id}`} style={{ padding: '10px 12px 12px' }}>
        <p style={{
          fontSize: 13, fontWeight: 600, lineHeight: 1.4,
          color: 'rgba(255,255,255,0.92)', margin: 0,
          display: '-webkit-box', WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {video.title}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
          {/* Impact score */}
          <div className={getImpactClass(video.impactScore)} style={{
            display: 'flex', alignItems: 'center', gap: 3,
            padding: '2px 7px', borderRadius: 20,
            fontSize: 10, fontWeight: 800, color: '#000',
          }}>
            <Leaf size={9} />
            {video.impactScore}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
