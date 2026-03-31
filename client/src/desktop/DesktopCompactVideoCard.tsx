import { useNavigate } from 'react-router-dom';
import type { Video } from '../types';

export default function DesktopCompactVideoCard({ video }: { video: Video }) {
  const navigate = useNavigate();
  return (
    <div
      onClick={() => navigate(`/video/${video.id}`)}
      style={{
        display: 'flex', gap: 10, cursor: 'pointer',
        alignItems: 'flex-start',
        padding: '6px 0',
        transition: 'background 0.2s',
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--base-2)'}
      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
    >
      <div style={{
        position: 'relative', width: 168, minWidth: 168, height: 94,
        borderRadius: 8, overflow: 'hidden', background: '#000'
      }}>
        <img src={video.thumbnailUrl} alt={video.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{
          position: 'absolute', bottom: 4, right: 4,
          background: 'rgba(0,0,0,0.85)', color: '#fff', fontSize: 11,
          padding: '2px 6px', borderRadius: 4, fontWeight: 700
        }}>
          {video.duration}
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h4 style={{
          margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--ink-0)',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          overflow: 'hidden', lineHeight: 1.3
        }}>
          {video.title}
        </h4>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--ink-2)', fontWeight: 500 }}>
          {video.categorySlug}
        </p>
        <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--ink-2)' }}>
          Impact: {video.impactScore}
        </p>
      </div>
    </div>
  );
}
