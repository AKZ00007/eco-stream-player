import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useVideos, useCategories } from '../api/queries';
import { usePlayerStore } from '../store/usePlayerStore';
import { ChevronLeft, Play } from 'lucide-react';
import type { Video } from '../types';

/* ── SVG Thumbnail generator (reused) ── */
import DesktopCategoryPage from '../desktop/DesktopCategoryPage';

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return isDesktop;
}
const PAL = [
  { b0: '#03141e', b1: '#072436', ac: '#1da8d8' },
  { b0: '#1a0e03', b1: '#2e1a06', ac: '#e8b84b' },
  { b0: '#03180c', b1: '#062918', ac: '#3ecf8e' },
  { b0: '#1a030a', b1: '#2e0812', ac: '#e06b6b' },
  { b0: '#0c0318', b1: '#18062e', ac: '#9b8fe0' },
];

function thumbSVG(title: string) {
  const h = title.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const p = PAL[h % PAL.length];
  const id = 't' + h;
  const w1 = 68 + (h % 12);
  const w2 = 78 + (h % 8);
  return `<svg style="position:absolute;inset:0;width:100%;height:100%" viewBox="0 0 200 112" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${p.b0}"/><stop offset="100%" stop-color="${p.b1}"/></linearGradient>
      <radialGradient id="rg${id}" cx="62%" cy="38%"><stop offset="0%" stop-color="${p.ac}" stop-opacity=".28"/><stop offset="100%" stop-color="${p.ac}" stop-opacity="0"/></radialGradient>
      <filter id="bl${id}"><feGaussianBlur stdDeviation="3.5"/></filter>
    </defs>
    <rect width="200" height="112" fill="url(#bg${id})"/>
    <ellipse cx="${60 + (h % 60)}" cy="${28 + (h % 18)}" rx="${(14 + (h % 10)) * 3.5}" ry="${(14 + (h % 10)) * 2}" fill="url(#rg${id})" filter="url(#bl${id})"/>
    <path d="M0,${w1} Q50,${w1 - 9 + (h % 12)} 100,${w1 + 4} Q150,${w1 + 10 + (h % 8)} 200,${w1 - 2} L200,112 L0,112Z" fill="${p.ac}" opacity=".09"/>
    <path d="M0,${w2} Q50,${w2 - 5 + (h % 8)} 100,${w2 + 3} Q150,${w2 + 7 + (h % 6)} 200,${w2 - 1} L200,112 L0,112Z" fill="${p.ac}" opacity=".055"/>
  </svg>`;
}

function PlaylistItem({ video, index }: { video: Video; index: number }) {
  const openPlayer = usePlayerStore((s) => s.openPlayer);

  return (
    <div 
      onClick={() => openPlayer(video)} 
      style={{ 
        display: 'flex', gap: 14, padding: '12px 20px', 
        cursor: 'pointer', transition: 'background 0.2s',
        alignItems: 'flex-start'
      }}
    >
      {/* Number Index (optional, gives playlist feel) */}
      <div style={{ color: 'var(--ink-2)', fontSize: 13, fontWeight: 600, width: 14, textAlign: 'center', paddingTop: 32 }}>
        {index + 1}
      </div>

      <div style={{ position: 'relative', width: 130, flexShrink: 0, aspectRatio: '16/9', borderRadius: 10, overflow: 'hidden', background: 'var(--base-3)', border: '1px solid var(--border-sub)' }}>
        <div style={{ position: 'absolute', inset: 0 }} dangerouslySetInnerHTML={{ __html: thumbSVG(video.title) }} />
        <img
          src={video.thumbnailUrl}
          alt=""
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.9 }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        <div style={{ position: 'absolute', bottom: 4, right: 4, background: 'rgba(0,0,0,0.85)', padding: '2px 5px', borderRadius: 5, fontSize: 10, fontWeight: 700, fontFamily: 'monospace', color: '#fff' }}>
          {video.duration}
        </div>
        {video.watchProgress > 0 && (
          <div style={{ position: 'absolute', bottom: 0, left: 0, height: 2.5, width: `${video.watchProgress * 100}%`, background: 'var(--emerald)', borderRadius: '0 2px 0 0', boxShadow: '0 0 6px rgba(62,207,142,0.6)' }} />
        )}
      </div>
      
      <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
        <h3 style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--ink-0)', lineHeight: 1.35, marginBottom: 6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {video.title}
        </h3>
        <div style={{ fontSize: 11, color: 'var(--ink-2)', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span>Eco-Stream Focus</span>
          <div style={{ display: 'flex', alignItems: 'center', marginTop: 3 }}>
            <span style={{ display: 'flex', alignItems: 'center', padding: '3px 8px', borderRadius: 100, background: 'rgba(62,207,142,0.12)', color: 'var(--emerald)', border: '1px solid rgba(62,207,142,0.2)', fontSize: 10, fontWeight: 600 }}>
              Impact {video.impactScore}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CategoryPlaylist() {
  const isDesktop = useIsDesktop();
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: categories } = useCategories();

  const { data: videos, isLoading } = useVideos(slug || '');

  if (isDesktop) return <DesktopCategoryPage />;

  const category = categories?.find(c => c.slug === slug);
  const totalSeconds = videos?.reduce((acc, v) => {
    const parts = (v.duration || '0:00').split(':').map(Number);
    if (parts.length === 3) return acc + parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return acc + parts[0] * 60 + parts[1];
    return acc;
  }, 0) || 0;
  const totalDuration = Math.max(1, Math.round(totalSeconds / 60));

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--base-0)' }}>
      {/* Back Button Overlay */}
      <button 
        onClick={() => navigate(-1)}
        style={{ position: 'absolute', top: 16, left: 16, width: 36, height: 36, borderRadius: '50%', background: 'rgba(7,14,7,0.5)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
      >
        <ChevronLeft size={20} color="#fff" strokeWidth={2.5} />
      </button>

      {/* Playlist List (Scrollable) */}
      <div className="scroll-area" style={{ flex: 1, paddingBottom: 'calc(20px + env(safe-area-inset-bottom))' }}>
        
        {/* Cinematic Hero Header */}
        <div style={{ position: 'relative', paddingBottom: 24 }}>
          {/* Dynamic BG generated from Category title to give it a unique album cover feel */}
          <div style={{ height: 240, width: '100%', position: 'relative' }}>
            <div dangerouslySetInnerHTML={{ __html: thumbSVG(category?.category || slug || 'fallback') }} style={{ position: 'absolute', inset: 0, opacity: 0.8 }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(7,14,7,0.1) 0%, rgba(7,14,7,0.6) 60%, var(--base-0) 100%)' }} />
          </div>
          
          <div style={{ padding: '0 20px', marginTop: -90, position: 'relative', zIndex: 2 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--emerald)', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8 }}>
              Curated Playlist
            </div>
            
            {/* NOTE: font-weight must be normal for DM Serif Display to avoid Faux Bold artifacting. */}
            <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 36, lineHeight: 1.1, marginBottom: 12, color: '#fff', textShadow: '0 4px 14px rgba(0,0,0,0.4)', letterSpacing: '-0.5px' }}>
              {category?.category || 'Playlist'}
            </h1>
            
            <p style={{ fontSize: 13, color: 'var(--ink-1)', lineHeight: 1.5, marginBottom: 20, maxWidth: '90%' }}>
              Explore our collection of the most impactful stories focusing on {category?.category}.
            </p>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 11, color: 'var(--ink-2)', fontWeight: 500 }}>
                 {category?.videoCount || videos?.length || 0} videos • Up to {totalDuration} min
              </div>
              <button 
                onClick={() => videos?.[0] && usePlayerStore.getState().openPlayer(videos[0])}
                style={{ height: 48, padding: '0 24px', borderRadius: 100, background: 'linear-gradient(135deg, #3ecf8e, #1da870)', color: '#fff', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, border: 'none', boxShadow: '0 6px 20px rgba(62,207,142,0.3)', cursor: 'pointer' }}
              >
                <Play size={18} fill="#fff" /> Play All
              </button>
            </div>
          </div>
        </div>
        
        {isLoading ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--ink-2)' }}>Loading videos...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {videos?.map((v, i) => (
              <PlaylistItem key={v.id} video={v} index={i} />
            ))}
            
            {videos?.length === 0 && (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-2)' }}>
                No videos found for this category.
              </div>
            )}
            
            {/* End of list spacer */}
            <div style={{ height: 40 }} />
          </div>
        )}
      </div>
    </div>
  );
}
