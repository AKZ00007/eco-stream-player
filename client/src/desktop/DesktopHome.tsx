import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DesktopVideoCard from './DesktopVideoCard';
import { useVideos, useCategories } from '../api/queries';
import { useSearchStore } from '../store/useSearchStore';
import type { Category } from '../types';

function DesktopSkeletonCard() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div className="skeleton" style={{ width: '100%', aspectRatio: '16/9', borderRadius: 12 }} />
      <div style={{ display: 'flex', gap: 10, padding: '10px 4px 4px' }}>
        <div className="skeleton" style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="skeleton" style={{ height: 14, width: '90%', borderRadius: 4 }} />
          <div className="skeleton" style={{ height: 14, width: '70%', borderRadius: 4 }} />
          <div className="skeleton" style={{ height: 12, width: '50%', borderRadius: 4 }} />
        </div>
      </div>
    </div>
  );
}

function DesktopCategoryShelf({ category }: { category: Category }) {
  const { data: videos, isLoading } = useVideos(category.slug);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeft(scrollLeft > 10);
      setShowRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    // Check again after a short delay to account for layout/image loading
    const timer = setTimeout(checkScroll, 500);
    return () => clearTimeout(timer);
  }, [videos, isLoading]);

  if (!isLoading && (!videos || videos.length === 0)) return null;

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const amount = direction === 'left' ? -800 : 800;
      scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
      // The onScroll event will trigger checkScroll
    }
  };

  return (
    <div style={{ marginBottom: 12, position: 'relative' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h2 style={{ 
          fontSize: 20, fontWeight: 700, color: 'var(--ink-0)', 
          margin: 0, fontFamily: 'var(--font-sans)'
        }}>
          {category.category}
        </h2>
        <button 
          onClick={() => navigate(`/category/${category.slug}`)}
          style={{
            background: 'transparent', border: 'none', color: 'var(--emerald)',
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
            padding: '4px 8px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 4,
            transition: 'background 0.2s'
          }}
          onMouseOver={e => e.currentTarget.style.background = 'var(--base-2)'}
          onMouseOut={e => e.currentTarget.style.background = 'transparent'}
        >
          See all <ChevronRight size={14} strokeWidth={2.5} />
        </button>
      </div>
      
      {/* Horizontal Scroll List */}
      <div style={{ position: 'relative' }}>
        <AnimatePresence>
          {showLeft && (
            <motion.button 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => scroll('left')}
              style={{
                 position: 'absolute', left: -20, top: '50%', transform: 'translateY(-50%)', zIndex: 10,
                 width: 40, height: 40, borderRadius: '50%', background: 'var(--base-0)', border: '1px solid var(--border-sub)',
                 boxShadow: '0 4px 12px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                 cursor: 'pointer', color: 'var(--ink-0)'
              }}
              onMouseOver={e => e.currentTarget.style.background = 'var(--base-1)'}
              onMouseOut={e => e.currentTarget.style.background = 'var(--base-0)'}
            >
              <ChevronLeft size={24} strokeWidth={1.5} />
            </motion.button>
          )}
        </AnimatePresence>

        <div 
          ref={scrollRef}
          onScroll={checkScroll}
          className="scroll-area hide-scrollbar"
          style={{
            display: 'flex', gap: 20, overflowX: 'auto', paddingBottom: 16,
            scrollSnapType: 'x mandatory', scrollBehavior: 'smooth'
          }}
        >
          {isLoading 
            ? Array.from({length: 4}).map((_, i) => (
               <div key={i} style={{ width: 380, flexShrink: 0 }}><DesktopSkeletonCard /></div>
              ))
            : videos?.map((v, i) => (
               <div key={v.id} style={{ width: 380, flexShrink: 0, scrollSnapAlign: 'start' }}>
                 <DesktopVideoCard video={v} index={i} />
               </div>
              ))
          }
        </div>

        <AnimatePresence>
          {showRight && (
            <motion.button 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => scroll('right')}
              style={{
                 position: 'absolute', right: -20, top: '50%', transform: 'translateY(-50%)', zIndex: 10,
                 width: 40, height: 40, borderRadius: '50%', background: 'var(--base-0)', border: '1px solid var(--border-sub)',
                 boxShadow: '0 4px 12px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                 cursor: 'pointer', color: 'var(--ink-0)'
              }}
              onMouseOver={e => e.currentTarget.style.background = 'var(--base-1)'}
              onMouseOut={e => e.currentTarget.style.background = 'var(--base-0)'}
            >
              <ChevronRight size={24} strokeWidth={1.5} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function DesktopHome() {
  const { data: categories } = useCategories();
  const [activeSlug, setActiveSlug] = useState('all');
  const { query: searchQuery } = useSearchStore();

  const tagsScrollRef = useRef<HTMLDivElement>(null);
  const [showTagsLeft, setShowTagsLeft] = useState(false);
  const [showTagsRight, setShowTagsRight] = useState(true);

  const checkTagsScroll = () => {
    if (tagsScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tagsScrollRef.current;
      setShowTagsLeft(scrollLeft > 5);
      setShowTagsRight(scrollLeft < scrollWidth - clientWidth - 5);
    }
  };

  useEffect(() => {
    checkTagsScroll();
    window.addEventListener('resize', checkTagsScroll);
    return () => window.removeEventListener('resize', checkTagsScroll);
  }, [categories]);

  const scrollTags = (direction: 'left' | 'right') => {
    if (tagsScrollRef.current) {
      const amount = direction === 'left' ? -350 : 350;
      tagsScrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  // Fetch videos for active category (undefined = all)
  const { data: filteredVideos, isLoading } = useVideos(activeSlug === 'all' ? undefined : activeSlug);

  const searchFiltered = useMemo(() => {
    if (!filteredVideos) return [];
    if (!searchQuery.trim()) return filteredVideos;
    const q = searchQuery.toLowerCase();
    return filteredVideos.filter(v =>
      v.title.toLowerCase().includes(q) ||
      v.categorySlug.includes(q)
    );
  }, [filteredVideos, searchQuery]);

  const allTabs = [
    { slug: 'all', label: 'All' },
    ...(categories?.map(c => ({ slug: c.slug, label: c.category })) ?? []),
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: 'var(--base-0)' }}>



      {/* ── Category filter chips ── */}
      <div style={{ position: 'relative', borderBottom: '1px solid var(--border-sub)', background: 'var(--base-0)', display: 'flex', alignItems: 'center' }}>
        
        <AnimatePresence>
          {showTagsLeft && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'absolute', left: 0, top: 0, bottom: 0, zIndex: 10,
                display: 'flex', alignItems: 'center',
                background: 'linear-gradient(to right, var(--base-0) 60%, transparent)',
                paddingLeft: 16, paddingRight: 32, pointerEvents: 'none'
              }}
            >
              <button
                onClick={() => scrollTags('left')}
                style={{
                  width: 32, height: 32, borderRadius: '50%', background: 'var(--base-0)',
                  border: '1px solid var(--border-sub)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: 'var(--ink-0)', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', pointerEvents: 'auto', transition: 'background 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.background = 'var(--base-1)'}
                onMouseOut={e => e.currentTarget.style.background = 'var(--base-0)'}
              >
                <ChevronLeft size={18} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div 
          ref={tagsScrollRef}
          onScroll={checkTagsScroll}
          className="hide-scrollbar"
          style={{
            display: 'flex', gap: 12, padding: '12px 24px',
            overflowX: 'auto', scrollbarWidth: 'none', scrollBehavior: 'smooth',
            width: '100%'
          }}
        >
          {allTabs.map(tab => {
            const isActive = activeSlug === tab.slug;
            return (
              <motion.button
                key={tab.slug}
                onClick={() => setActiveSlug(tab.slug)}
                whileTap={{ scale: 0.94 }}
                style={{
                  flexShrink: 0,
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 14, fontWeight: isActive ? 600 : 500,
                  background: isActive ? 'var(--ink-0)' : 'var(--base-2)',
                  color: isActive ? 'var(--base-0)' : 'var(--ink-0)',
                  transition: 'all 0.2s',
                }}
                onMouseOver={e => !isActive && (e.currentTarget.style.background = 'var(--base-3)')}
                onMouseOut={e => !isActive && (e.currentTarget.style.background = 'var(--base-2)')}
              >
                <span style={{ whiteSpace: 'nowrap' }}>{tab.label}</span>
              </motion.button>
            );
          })}
        </div>

        <AnimatePresence>
          {showTagsRight && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'absolute', right: 0, top: 0, bottom: 0, zIndex: 10,
                display: 'flex', alignItems: 'center',
                background: 'linear-gradient(to left, var(--base-0) 60%, transparent)',
                paddingRight: 16, paddingLeft: 32, pointerEvents: 'none'
              }}
            >
              <button
                onClick={() => scrollTags('right')}
                style={{
                  width: 32, height: 32, borderRadius: '50%', background: 'var(--base-0)',
                  border: '1px solid var(--border-sub)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: 'var(--ink-0)', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', pointerEvents: 'auto', transition: 'background 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.background = 'var(--base-1)'}
                onMouseOut={e => e.currentTarget.style.background = 'var(--base-0)'}
              >
                <ChevronRight size={18} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Video grid ── */}
      <div
        className="scroll-area"
        style={{ flex: 1, overflowY: 'auto', padding: '24px 24px 80px' }}
      >
        <AnimatePresence mode="wait">
          {activeSlug === 'all' && searchQuery.trim().length === 0 ? (
            <motion.div
              key="shelves"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {categories?.map((c) => (
                <DesktopCategoryShelf key={c.slug} category={c} />
              ))}
            </motion.div>
          ) : (
            <motion.div
              key={activeSlug}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
                gap: '32px 20px',
              }}
            >
              {isLoading
                ? Array.from({ length: 9 }).map((_, i) => <DesktopSkeletonCard key={i} />)
                : searchFiltered.map((v, i) => (
                  <DesktopVideoCard key={v.id} video={v} index={i} />
                ))
              }
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        {!isLoading && searchFiltered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 24px' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🌿</div>
            <p style={{ fontSize: 16, color: 'var(--ink-1)', fontWeight: 500 }}>
              No videos found for "{searchQuery}"
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
