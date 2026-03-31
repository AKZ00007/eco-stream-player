import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Flame, Leaf, ArrowLeft } from 'lucide-react';
import { useVideos, useRecommendations } from '../api/queries';
import DesktopVideoPlayer from './DesktopVideoPlayer';
import DesktopCompactVideoCard from './DesktopCompactVideoCard';
import { getImpactClass } from '../utils/helpers';
import { calculateImpactScore } from '../utils/impact';
import { useColorExtract } from '../hooks/useColorExtract';
import { useThemeStore } from '../store/useThemeStore';
import { getThemedTint } from '../utils/colorExtractor';

export default function DesktopVideoPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: videos, isLoading } = useVideos();
  const themeMode = useThemeStore(state => state.mode);
  
  const video = videos?.find(v => v.id === id);
  const { data: recommendations } = useRecommendations(video?.categorySlug || '', video?.id || '');

  // 1. Dynamic Background Tints
  const dominantColor = useColorExtract(video?.thumbnailUrl);
  const tintedBg = getThemedTint(dominantColor, themeMode);

  // 2. Simulated Trending Status
  const [isTrendingSim, setIsTrendingSim] = useState(false);

  useEffect(() => {
    if (!video) return;
    
    // Toggle trending every 15-30 seconds
    const interval = setInterval(() => {
      setIsTrendingSim(prev => !prev);
    }, 15000 + Math.random() * 15000);

    return () => clearInterval(interval);
  }, [video]);

  if (isLoading) {
    return <div style={{ padding: 40, color: 'var(--ink-1)' }}>Loading video...</div>;
  }

  if (!video) {
    return <div style={{ padding: 40, color: 'var(--ink-1)' }}>Video not found.</div>;
  }

  const impactScore = calculateImpactScore(video);

  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: 24, padding: '24px',
      height: '100%', overflowY: 'auto',
      background: tieredBackground(tintedBg, themeMode),
      transition: 'background 1.2s ease',
    }}>
      {/* ── Left Column: Player & Meta ── */}
      <div style={{ flex: '1 1 600px', minWidth: 'min(100%, 600px)', display: 'flex', flexDirection: 'column' }}>
        <button 
          onClick={() => navigate(-1)}
          style={{ 
            display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16,
            background: 'none', border: 'none', color: 'var(--ink-2)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            padding: 0, width: 'fit-content', transition: 'color 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.color = 'var(--ink-0)'}
          onMouseOut={(e) => e.currentTarget.style.color = 'var(--ink-2)'}
        >
          <ArrowLeft size={16} strokeWidth={2.5} /> Back
        </button>
        <DesktopVideoPlayer video={video} recommendations={recommendations} />
        
        {/* Title */}
        <h1 style={{
          fontSize: 24, fontWeight: 700, color: 'var(--ink-0)',
          marginTop: 16, marginBottom: 8, lineHeight: 1.3
        }}>
          {video.title}
        </h1>
        
        {/* Metadata Row */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          paddingBottom: 16, borderBottom: '1px solid var(--border-sub)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, #00e676, #00bcd4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 800, color: '#000',
            }}>
              {video.categorySlug[0].toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--ink-0)' }}>
                {video.categorySlug.replace('-', ' ')}
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <AnimatePresence>
              {(video.isTrending || isTrendingSim) && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 14px', borderRadius: 20,
                    background: 'linear-gradient(135deg, #ff6b35, #ff1744)',
                    color: '#fff', fontSize: 13, fontWeight: 700,
                  }}
                >
                  <Flame size={14} fill="#fff" /> TRENDING
                </motion.div>
              )}
            </AnimatePresence>

            <div className={`chip ${getImpactClass(impactScore)}`} style={{ padding: '6px 14px', fontSize: 14 }}>
              <Leaf size={14} />
              Climate Impact {impactScore}
            </div>
          </div>
        </div>

        {/* Description Box */}
        <div style={{
          marginTop: 16, padding: 16, borderRadius: 12,
          background: 'rgba(var(--ink-0-rgb), 0.05)', color: 'var(--ink-1)',
          fontSize: 14, lineHeight: 1.5
        }}>
          <p style={{ margin: 0 }}>
            {video.description}
          </p>
        </div>
      </div>

      {/* ── Right Column: Up Next ── */}
      <div style={{ flex: '1 1 350px', maxWidth: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h3 style={{ margin: 0, fontSize: 16, color: 'var(--ink-0)' }}>Up Next</h3>
        {recommendations?.map(rec => (
          <DesktopCompactVideoCard key={rec.id} video={rec} />
        ))}
      </div>
    </div>
  );
}
function tieredBackground(tintColor: string, mode: 'light' | 'dark') {
  const base = mode === 'dark' ? '#0f0f0f' : '#f9fafb';
  // Use a broader gradient so the tint is prominent across the full page
  return `linear-gradient(180deg, ${tintColor} 0%, ${tintColor} 30%, ${base} 100%)`;
}
