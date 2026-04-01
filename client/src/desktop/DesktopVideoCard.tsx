import { motion, AnimatePresence } from 'framer-motion';
import { Leaf, MoreVertical } from 'lucide-react';
import type { Video } from '../types';
import { getImpactClass } from '../utils/helpers';
import { useIntersectionObserver } from '../hooks/useIntersectionObserver';

// Category → channel name mapping for desktop display
const CHANNEL_NAMES: Record<string, string> = {
  'ocean-health':  'EcoOcean Foundation',
  'clean-power':   'Clean Energy Network',
  'forest-growth': 'Reforestation Global',
  'green-cities':  'Urban Green Initiative',
  'biodiversity':  'Wildlife Alliance',
};



interface DesktopVideoCardProps {
  video: Video;
  index?: number;
}

import { useNavigate } from 'react-router-dom';

export default function DesktopVideoCard({ video, index = 0 }: DesktopVideoCardProps) {
  const navigate = useNavigate();
  const channel = CHANNEL_NAMES[video.categorySlug] ?? 'Eco-Stream';
  const { ref, isIntersecting, isVisible } = useIntersectionObserver({ threshold: 0.15, rootMargin: '0px' }, 600);

  return (
    <motion.article
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      onClick={() => navigate(`/video/${video.id}`)}
      style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 0 }}
    >
      {/* ── Thumbnail ── */}
      <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', borderRadius: 12, overflow: 'hidden', background: '#16191f' }}>
        
        {/* Fake network delay skeleton when intersected */}
        {isIntersecting && !isVisible && (
          <div className="skeleton" style={{ width: '100%', height: '100%', position: 'absolute', inset: 0, zIndex: 1 }} />
        )}

        {isVisible && (
          <motion.img
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            layoutId={`video-thumb-${video.id}`}
            src={video.thumbnailUrl}
            alt={video.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', zIndex: 2, position: 'relative' }}
            whileHover={{ scale: 1.04 }}
          />
        )}

        {/* Gradient overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 55%)',
          pointerEvents: 'none',
        }} />

        {/* Duration badge */}
        <div style={{
          position: 'absolute', bottom: 8, right: 8,
          background: 'rgba(0,0,0,0.88)',
          color: '#fff', fontSize: 12, fontWeight: 700,
          padding: '2px 4px', borderRadius: 4,
          fontFamily: 'var(--font-sans)', letterSpacing: '0.5px',
        }}>
          {video.duration}
        </div>

        {/* Watch progress */}
        {video.watchProgress > 0 && (
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, background: 'rgba(255,255,255,0.2)', zIndex: 10 }}>
            <div className="progress-bar" style={{ height: '100%', width: `${video.watchProgress * 100}%` }} />
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
                background: '#ff1744', color: '#fff',
                fontSize: 10, fontWeight: 800, letterSpacing: '0.5px',
                padding: '4px 10px', borderRadius: 100,
                display: 'flex', alignItems: 'center', gap: 5,
                zIndex: 10
              }}
            >
              <svg viewBox="0 0 10 10" width="8" height="8" fill="#fff">
                <polygon points="5,.5 6.5,3.5 9.5,4 7.5,6 8,9 5,7.5 2,9 2.5,6 .5,4 3.5,3.5" />
              </svg>
              TRENDING
            </motion.div>
          )}
        </AnimatePresence>

        {/* Impact badge (top right) */}
        <div className={getImpactClass(video.impactScore)} style={{
          position: 'absolute', top: 8, right: video.isTrending ? undefined : 8,
          display: 'flex', alignItems: 'center', gap: 3,
          padding: '3px 8px', borderRadius: 20,
          fontSize: 10, fontWeight: 800, color: '#000',
        }}>
          <Leaf size={9} /> {video.impactScore}
        </div>
      </div>

      {/* ── Card Metadata Row (YouTube style) ── */}
      <div style={{ display: 'flex', gap: 10, padding: '10px 4px 4px', alignItems: 'flex-start' }}>
        {/* Channel avatar */}
        <div style={{
          width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, #00e676, #00bcd4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 800, color: '#000',
          marginTop: 1,
        }}>
          {channel[0]}
        </div>

        {/* Text info */}
        <div style={{ flex: 1, minWidth: 0, marginTop: 2 }}>
          <p style={{
            margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--ink-0)',
            lineHeight: 1.4,
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {video.title}
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--ink-1)', fontWeight: 400 }}>
            {channel}
          </p>
        </div>

        {/* 3-dot menu */}
        <button
          onClick={e => e.stopPropagation()}
          style={{
            flexShrink: 0, padding: 4, marginTop: 2,
            background: 'none', border: 'none', cursor: 'pointer',
            opacity: 0, transition: 'opacity 0.2s',
            color: 'var(--ink-2)',
          }}
          className="card-menu-btn"
        >
          <MoreVertical size={16} />
        </button>
      </div>
    </motion.article>
  );
}
