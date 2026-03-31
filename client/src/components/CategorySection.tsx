import { useVideos } from '../api/queries';
import VideoCard from './VideoCard';
import type { Category } from '../types';
import { ChevronRight } from 'lucide-react';

interface CategorySectionProps {
  category: Category;
}

const CATEGORY_COLORS: Record<string, string> = {
  'ocean-health':  'linear-gradient(90deg, #0d4f72, #1a9bc2)',
  'clean-power':   'linear-gradient(90deg, #c47d0e, #f5a623)',
  'forest-growth': 'linear-gradient(90deg, #1a4d2e, #2e7d32)',
  'green-cities':  'linear-gradient(90deg, #2c4a1e, #558b2f)',
  'biodiversity':  'linear-gradient(90deg, #5d2e0c, #8d4e27)',
};

export default function CategorySection({ category }: CategorySectionProps) {
  const { data: videos, isLoading } = useVideos(category.slug);
  const accentGrad = CATEGORY_COLORS[category.slug] || 'linear-gradient(90deg, #333, #555)';

  return (
    <section style={{ marginBottom: 36 }}>
      {/* Section header — uses responsive class */}
      <div className="section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 4, height: 22, borderRadius: 4, background: accentGrad, flexShrink: 0 }} />
          <span style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px' }}>
            {category.category}
          </span>
        </div>
        <button style={{
          display: 'flex', alignItems: 'center', gap: 2,
          color: 'rgba(255,255,255,0.35)', fontSize: 12, fontWeight: 600,
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          transition: 'color 0.2s',
        }}>
          See all <ChevronRight size={14} />
        </button>
      </div>

      {/* ── category-grid: horizontal scroll on mobile, CSS grid on desktop ── */}
      <div className="category-grid">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="skeleton"
              style={{
                width: 200, height: 160,
                borderRadius: 16, flexShrink: 0,
                /* On desktop the grid handles width, so override */
                minWidth: 0,
              }}
            />
          ))
          : videos?.map((v, i) => (
            <VideoCard key={v.id} video={v} index={i} />
          ))
        }
        {/* Trailing spacer to prevent last card clipping on mobile */}
        <div style={{ minWidth: 4, flexShrink: 0 }} className="desktop-hidden" />
      </div>
    </section>
  );
}
