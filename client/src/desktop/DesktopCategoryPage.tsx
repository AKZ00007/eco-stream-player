import { useParams, useNavigate } from 'react-router-dom';
import { useVideos, useCategories } from '../api/queries';
import { Play, ArrowLeft } from 'lucide-react';
import DesktopVideoCard from './DesktopVideoCard';

/* ── SVG Thumbnail generator (reused) ── */
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
  const id = 'td' + h;
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

export default function DesktopCategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: categories } = useCategories();
  const { data: videos, isLoading } = useVideos(slug || '');

  const category = categories?.find(c => c.slug === slug);
  const totalSeconds = videos?.reduce((acc, v) => {
    const parts = (v.duration || '0:00').split(':').map(Number);
    if (parts.length === 3) return acc + parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return acc + parts[0] * 60 + parts[1];
    return acc;
  }, 0) || 0;
  const totalDuration = Math.max(1, Math.round(totalSeconds / 60));
  
  return (
    <div className="scroll-area" style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--base-0)', overflowY: 'auto' }}>
      
      {/* Cinematic Hero Header (scaled for Desktop) */}
      <div style={{ position: 'relative', width: '100%', marginBottom: 32 }}>
        <div style={{ height: 320, width: '100%', position: 'relative' }}>
          <div dangerouslySetInnerHTML={{ __html: thumbSVG(category?.category || slug || 'fallback') }} style={{ position: 'absolute', inset: 0, opacity: 0.8 }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(7,14,7,0.1) 0%, rgba(7,14,7,0.5) 50%, var(--base-0) 100%)' }} />
        </div>
        
        <div style={{ padding: '0 40px', marginTop: -120, position: 'relative', zIndex: 2 }}>
          <button 
            onClick={() => navigate(-1)}
            style={{ 
              display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16,
              background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              padding: '6px 12px', borderRadius: 100, width: 'fit-content'
            }}
          >
            <ArrowLeft size={16} strokeWidth={2.5} /> Back
          </button>
          
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--emerald)', textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 8 }}>
            Curated Category
          </div>
          
          <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 56, lineHeight: 1.1, marginBottom: 16, color: '#fff', textShadow: '0 4px 20px rgba(0,0,0,0.5)', letterSpacing: '-1px' }}>
            {category?.category || slug || 'Playlist'}
          </h1>
          
          <p style={{ fontSize: 15, color: 'var(--ink-1)', lineHeight: 1.6, marginBottom: 24, maxWidth: 600 }}>
            Explore our collection of the most impactful stories focusing on {category?.category}.
          </p>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <button 
              style={{ height: 48, padding: '0 32px', borderRadius: 100, background: 'linear-gradient(135deg, #3ecf8e, #1da870)', color: '#fff', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, border: 'none', boxShadow: '0 6px 20px rgba(62,207,142,0.3)', cursor: 'pointer', transition: 'transform 0.2s' }}
              onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <Play size={20} fill="#fff" /> Play All
            </button>
            <div style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 500 }}>
               {category?.videoCount || videos?.length || 0} videos • Up to {totalDuration} min
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 40px 80px' }}>
        {isLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '32px 20px' }}>
            {Array.from({length: 8}).map((_,i) => <div key={i} className="skeleton" style={{ width: '100%', aspectRatio: '16/9', borderRadius: 12 }} />)}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '32px 20px' }}>
            {videos?.map((v, i) => (
              <DesktopVideoCard key={v.id} video={v} index={i} />
            ))}
          </div>
        )}
        
        {!isLoading && videos?.length === 0 && (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--ink-2)' }}>
            No videos found for this category.
          </div>
        )}
      </div>
    </div>
  );
}
