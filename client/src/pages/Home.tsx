import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

import { useCategories, useVideos, useContinueWatching } from '../api/queries';
import { useQueryClient } from '@tanstack/react-query';
import { usePlayerStore } from '../store/usePlayerStore';
import { useSearchStore } from '../store/useSearchStore';
import { ChevronRight, Search, Menu, Play, Compass, Moon, Sun, X, Home as HomeIcon, Bookmark, Settings } from 'lucide-react';
import DesktopHome from '../desktop/DesktopHome';
import { useThemeStore } from '../store/useThemeStore';
import { useIntersectionObserver } from '../hooks/useIntersectionObserver';
import type { Video, Category } from '../types';

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 768);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return isDesktop;
}

/* ── Helper: chip color class ── */
function chipClass(score: number) {
  if (score >= 80) return 'c-hi';
  if (score >= 65) return 'c-mid';
  return 'c-lo';
}

/* ── SVG Thumbnail generator (generative art, no images needed) ── */
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



/* ── Section icon SVGs by category ── */
const SECTION_ICONS: Record<string, { svg: string; className: string }> = {
  'ocean-health': {
    className: 's-ocean',
    svg: `<svg viewBox="0 0 20 14" fill="none" width="15" height="15"><path d="M1 5c1.5-4 4-4 5.5 0S10 9 11.5 5s4-4 5.5 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M1 10c1.5-4 4-4 5.5 0S10 14 11.5 10s4-4 5.5 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" opacity=".5"/></svg>`,
  },
  'clean-power': {
    className: 's-energy',
    svg: `<svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15"><path d="M11 2L4 11h7l-2 7 9-10h-7l2-6z"/></svg>`,
  },
  'forest-growth': {
    className: 's-forest',
    svg: `<svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15"><path d="M10 1L4 8h4.5L6 14h4v4h0V14h4l-2.5-6H16L10 1z"/></svg>`,
  },
  'green-cities': {
    className: 's-cities',
    svg: `<svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15"><path d="M10 1L4 8h4.5L6 14h4v4h0V14h4l-2.5-6H16L10 1z"/></svg>`,
  },
  'biodiversity': {
    className: 's-wildlife',
    svg: `<svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15"><ellipse cx="4.5" cy="6" rx="2.5" ry="3.5"/><ellipse cx="9.5" cy="4" rx="2.5" ry="3.5"/><ellipse cx="14.5" cy="6" rx="2.5" ry="3.5"/><path d="M9.5 9.5c-4 0-6.5 2-6.5 5.5a2.5 2.5 0 002.5 2h8a2.5 2.5 0 002.5-2c0-3.5-2.5-5.5-6.5-5.5z"/></svg>`,
  },
};

/* ── Badge HTML for trending/hot ── */
function BadgeTag({ video }: { video: Video }) {
  if (video.isTrending) {
    return (
      <div className="badge b-trend" style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
        <svg viewBox="0 0 12 12" fill="currentColor" width="8" height="8"><path d="M1 9.5l3-3.5 2 2 4.5-6 .8.8L6 11l-2-2L2 11H1z" /></svg>
        Trending
      </div>
    );
  }
  return null;
}

/* ── Single Video Card ── */
function HomeVideoCard({ video }: { video: Video }) {
  const openPlayer = usePlayerStore((s) => s.openPlayer);
  const { ref, isIntersecting, isVisible } = useIntersectionObserver({ threshold: 0.15, rootMargin: '0px' }, 600);

  return (
    <div ref={ref} className="vcard" onClick={() => openPlayer(video)} style={{ minHeight: 180 }}>
      <div className="vthumb" style={{ background: 'var(--base-1)' }}>
        <div
          style={{ position: 'absolute', inset: 0 }}
          dangerouslySetInnerHTML={{ __html: thumbSVG(video.title) }}
        />
        {/* Faux network latency skeleton state */}
        {isIntersecting && !isVisible && (
          <div className="skeleton" style={{ position: 'absolute', inset: 0, zIndex: 1, opacity: 0.8 }} />
        )}
        {/* Actual Image Fade-In */}
        {isVisible && (
          <motion.img
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            src={video.thumbnailUrl}
            alt=""
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85, zIndex: 2 }}
            onError={(e: any) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        )}
        <div className="vthumb-vignette" />
        <div className="vthumb-top">
          <BadgeTag video={video} />
          <span />
        </div>
        <div className="vthumb-bot">
          <div className="duration">{video.duration}</div>
        </div>
        {video.watchProgress > 0 && (
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, background: 'rgba(255,255,255,0.2)', zIndex: 10 }}>
            <div className="vprog" style={{ width: `${video.watchProgress * 100}%` }} />
          </div>
        )}
      </div>
      <div className="vmeta">
        <div className="vtitle" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {video.title}
        </div>
        <div className="vstats">
          <div className={`chip ${chipClass(video.impactScore)}`} style={{ padding: '4px 10px', fontSize: 12 }}>
            <div className="chip-dot" />
            Impact {video.impactScore}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Category Section ── */
function HomeCategorySection({ category, onSeeAll }: { category: Category; onSeeAll: () => void }) {
  const { data: videos, isLoading, isError } = useVideos(category.slug);
  const sectionInfo = SECTION_ICONS[category.slug] || { className: 's-forest', svg: '' };
  const queryClient = useQueryClient();

  return (
    <div className={`section ${sectionInfo.className}`}>
      <div className="sec-head">
        <div className="sec-left">
          <div className="sec-icon" dangerouslySetInnerHTML={{ __html: sectionInfo.svg }} />
          <span className="sec-title">{category.category}</span>
        </div>
        <button className="see-all" onClick={onSeeAll}>
          See all <ChevronRight size={13} strokeWidth={2} />
        </button>
      </div>
      <div className="card-row">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ width: 196, height: 150, borderRadius: 14, flexShrink: 0 }} />
          ))
        ) : isError ? (
          <div style={{ width: '100%', height: 150, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--base-1)', borderRadius: 14, border: '1px solid var(--border-sub)', gap: 12 }}>
            <span style={{ color: 'var(--ink-2)', fontSize: 13 }}>Failed to load {category.category}</span>
            <button 
              onClick={() => queryClient.invalidateQueries()}
              style={{ background: 'var(--emerald)', color: '#fff', border: 'none', padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600 }}
            >
              Retry
            </button>
          </div>
        ) : (
          videos?.map((v) => <HomeVideoCard key={v.id} video={v} />)
        )}
      </div>
    </div>
  );
}

/* ── Filter pills ── */
const FILTERS = [
  { label: 'All', slug: 'all', svg: `<svg viewBox="0 0 14 14" width="14" height="14" fill="currentColor"><rect x="0" y="0" width="6" height="6" rx="1.5"/><rect x="8" y="0" width="6" height="6" rx="1.5"/><rect x="0" y="8" width="6" height="6" rx="1.5"/><rect x="8" y="8" width="6" height="6" rx="1.5"/></svg>` },
  { label: 'Ocean', slug: 'ocean-health', svg: `<svg viewBox="0 0 14 10" fill="none" width="14" height="14"><path d="M1 5c1-3 3-3 4 0s3 3 4 0 2-3 3 0" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M1 9c1-3 3-3 4 0s3 3 4 0 2-3 3 0" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" opacity="0.5"/></svg>` },
  { label: 'Energy', slug: 'clean-power', svg: `<svg viewBox="0 0 14 14" fill="currentColor" width="14" height="14"><path d="M8 1L3 8h4l-2 5 7-8H8L9 1H8z"/></svg>` },
  { label: 'Forests', slug: 'forest-growth', svg: `<svg viewBox="0 0 14 14" fill="currentColor" width="14" height="14"><path d="M7 1L3 6h3l-1.5 3.5H7V1zM7 1l4 5h-3l1.5 3.5H7V1z"/><rect x="6" y="10.5" width="2" height="2.5" rx="0.5"/></svg>` },
  { label: 'Wildlife', slug: 'biodiversity', svg: `<svg viewBox="0 0 14 14" fill="currentColor" width="14" height="14"><ellipse cx="3" cy="5.5" rx="2" ry="2.8"/><ellipse cx="7" cy="3.8" rx="2" ry="2.8"/><ellipse cx="11" cy="5.5" rx="2" ry="2.8"/><path d="M7 8c-3.5 0-5.5 1.5-5.5 4A1.8 1.8 0 003 13.5h8a1.8 1.8 0 001.5-1.5c0-2.5-2-4-5.5-4z"/></svg>` },
];

/* ── Theme Toggle Button ── */
function ThemeToggle() {
  const { mode, toggleTheme } = useThemeStore();
  return (
    <div className="ibtn" onClick={toggleTheme} title={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`}>
      {mode === 'dark'
        ? <Sun size={16} stroke="var(--ink-1)" strokeWidth={1.8} />
        : <Moon size={16} stroke="var(--ink-1)" strokeWidth={1.8} />
      }
    </div>
  );
}

/* ══════════════════════════════════════════════
   MAIN HOME COMPONENT
   ══════════════════════════════════════════════ */
export default function Home() {
  const isDesktop = useIsDesktop();
  const { data: categories, isLoading: isCatsLoading, isError: isCatsError } = useCategories();
  const { data: allVideos, isError: isAllVideosError } = useVideos('');
  const { data: continueWatching } = useContinueWatching();
  const queryClient = useQueryClient();
  const openPlayer = usePlayerStore((s) => s.openPlayer);
  const navigate = useNavigate();

  const { query, setQuery } = useSearchStore();
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [activeFilterSlug, setActiveFilterSlug] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const ptrRef = useRef<HTMLDivElement>(null);

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Pick featured video: find the first trending video, fallback to most recent/first
  const featuredVideo = useMemo(() => {
    if (!allVideos?.length) return null;
    return allVideos.find(v => v.isTrending) || allVideos[0];
  }, [allVideos]);

  // Pull-to-refresh
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (scrollRef.current?.scrollTop === 0) startY.current = e.touches[0].clientY;
  }, []);
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (startY.current > 0 && !isRefreshing && scrollRef.current?.scrollTop === 0) {
      const diff = e.touches[0].clientY - startY.current;
      if (diff > 64 && ptrRef.current) ptrRef.current.classList.add('on');
    }
  }, [isRefreshing]);
  const handleTouchEnd = useCallback(() => {
    if (ptrRef.current?.classList.contains('on')) {
      setIsRefreshing(true);
      queryClient.invalidateQueries();
      setTimeout(() => {
        ptrRef.current?.classList.remove('on');
        setIsRefreshing(false);
        startY.current = 0;
      }, 1500);
    } else {
      startY.current = 0;
    }
  }, [queryClient]);

  // ── Desktop view ──
  if (isDesktop) return <DesktopHome />;

  // ── Mobile view ──
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--base-0)' }}>
      {/* Top Nav */}
      <div className="topnav" style={{ position: 'relative' }}>
        {isSearchMode ? (
          <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: 12 }}>
            <button 
              onClick={() => { setIsSearchMode(false); setQuery(''); }}
              style={{ background: 'transparent', border: 'none', color: 'var(--ink-1)', padding: 4 }}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <input 
              autoFocus
              type="text" 
              placeholder="Search streams..." 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                flex: 1, height: 36, background: 'var(--base-1)', border: 'none', borderRadius: 18,
                padding: '0 16px', fontSize: 14, color: 'var(--ink-0)', outline: 'none'
              }}
            />
          </div>
        ) : (
          <>
            <div className="brand" onClick={() => {
              queryClient.invalidateQueries();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }} style={{ cursor: 'pointer' }}>
              <div className="brand-mark">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="#fff">
                  <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 008 20c11 0 14-17 14-17-1 2-8 2-8 2s7-2 3 1z" />
                </svg>
              </div>
              <span className="brand-name">Eco-Stream</span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <ThemeToggle />
              <div className="ibtn" onClick={() => setIsSearchMode(true)}>
                <Search size={16} stroke="var(--ink-1)" strokeWidth={1.8} />
              </div>
              <div className="ibtn" onClick={() => setIsMenuOpen(true)}>
                <Menu size={16} stroke="var(--ink-1)" strokeWidth={1.8} />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Scroll Body */}
      <div
        ref={scrollRef}
        className="scroll-area"
        style={{ flex: 1, paddingBottom: 0 }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Pull-to-refresh */}
        <div ref={ptrRef} className="ptr">
          <div className="ptr-spin" />
          <span>Fetching latest stories</span>
        </div>

        {/* Page Head */}
        {!query && (
          <div style={{ padding: '4px 22px 18px', display: 'flex', alignItems: 'flex-start', flexDirection: 'column', gap: 4 }}>
            <h1 style={{ 
              fontFamily: 'var(--font-serif)', fontWeight: 400, 
              fontSize: 28, color: 'var(--ink-0)', letterSpacing: '-0.3px',
              display: 'flex', alignItems: 'center', gap: 10
            }}>
              Discover Feed
              <Compass size={18} color="var(--emerald)" />
            </h1>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.4 }}>
              Stories that shape our planet's future
            </p>
          </div>
        )}

        {/* Filter Pills */}
        {!query && (
          <div className="fstrip">
            {FILTERS.map((f) => (
              <div
                key={f.label}
                className={`fpill ${f.slug === activeFilterSlug ? 'active' : ''}`}
                onClick={() => setActiveFilterSlug(f.slug)}
              >
                <span dangerouslySetInnerHTML={{ __html: f.svg }} />
                {f.label}
              </div>
            ))}
          </div>
        )}

        {/* Hero Feature (Hide during search) */}
        {!query && featuredVideo && activeFilterSlug === 'all' && (
          <div
            onClick={() => openPlayer(featuredVideo)}
            style={{ margin: '0 14px 20px', cursor: 'pointer' }}
          >
            {/* Thumbnail — clean, no overlays */}
            <div style={{ position: 'relative', width: '100%', borderRadius: 16, overflow: 'hidden', aspectRatio: '16/9' }}>
              <img
                src={featuredVideo.thumbnailUrl}
                alt={featuredVideo.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
              {/* Play button overlay only — small, unobtrusive */}
              <div style={{
                position: 'absolute', bottom: 10, right: 10,
                width: 40, height: 40, borderRadius: '50%',
                background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Play size={16} fill="#fff" color="#fff" />
              </div>
              {/* TRENDING badge — top-left, solid opaque pill */}
              <div style={{
                position: 'absolute', top: 10, left: 10,
                background: '#ff1744', color: '#fff',
                fontSize: 10, fontWeight: 800, letterSpacing: '0.5px',
                padding: '4px 10px', borderRadius: 100,
                display: 'flex', alignItems: 'center', gap: 5
              }}>
                <svg viewBox="0 0 10 10" width="8" height="8" fill="#fff">
                  <polygon points="5,.5 6.5,3.5 9.5,4 7.5,6 8,9 5,7.5 2,9 2.5,6 .5,4 3.5,3.5" />
                </svg>
                TRENDING
              </div>
            </div>

            {/* Text info — BELOW the thumbnail, always readable */}
            <div style={{ padding: '10px 4px 0' }}>
              <div style={{ fontSize: 11, color: 'var(--ink-2)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 5 }}>
                {featuredVideo.categorySlug?.replace(/-/g, ' ')} &middot; {featuredVideo.duration}
              </div>
              <div style={{
                fontSize: 16, fontWeight: 700, color: 'var(--ink-0)',
                lineHeight: 1.35, marginBottom: 8,
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
              }}>
                {featuredVideo.title}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: 'rgba(62,207,142,0.12)', color: 'var(--emerald)',
                  border: '1px solid rgba(62,207,142,0.3)',
                  padding: '4px 10px', borderRadius: 100, fontSize: 12, fontWeight: 700
                }}>
                  Impact {featuredVideo.impactScore}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search Results */}
        {query && allVideos && (
          <div style={{ padding: '0 22px' }}>
            <h4 style={{ color: 'var(--ink-1)', fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
              Search Results for "{query}"
            </h4>
            <div className="card-row" style={{ flexWrap: 'wrap', gap: 16 }}>
              {allVideos.filter(v => v.title.toLowerCase().includes(query.toLowerCase())).map(v => (
                <HomeVideoCard key={v.id} video={v} />
              ))}
            </div>
          </div>
        )}

        {/* Recommended for You Section (No Header) */}
        {!query && continueWatching && continueWatching.length > 0 && activeFilterSlug === 'all' && (
          <div className="section" style={{ paddingTop: 8 }}>
            <div className="card-row">
              {continueWatching.map((v) => <HomeVideoCard key={v.id} video={v} />)}
            </div>
          </div>
        )}

        {/* Global Error State for entire feed */}
        {(isCatsError || isAllVideosError) && !query && (
          <div style={{ padding: '60px 22px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 16 }}>
            <div style={{ padding: 20, background: 'var(--base-1)', borderRadius: '50%' }}>
              <svg viewBox="0 0 24 24" width="32" height="32" stroke="var(--ink-2)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M2 2l20 20M8.5 4.5A10.5 10.5 0 0122 12M5 5.5A10.5 10.5 0 0012 22a10.5 10.5 0 005.5-1.5M16 8a4.5 4.5 0 011.5 5.5"/></svg>
            </div>
            <div>
              <h3 style={{ fontSize: 18, color: 'var(--ink-0)', fontWeight: 600, marginBottom: 6 }}>Connection Timeout</h3>
              <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.5, maxWidth: 280, margin: '0 auto' }}>Please check your internet connection and try again.</p>
            </div>
            <button 
              onClick={() => queryClient.invalidateQueries()}
              style={{ background: 'var(--emerald)', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: 24, fontSize: 14, fontWeight: 600, marginTop: 8 }}
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* Category Sections (Hide during search) */}
        {!query && !(isCatsError || isAllVideosError) && (isCatsLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{ marginBottom: 34 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 22px', marginBottom: 15 }}>
                  <div className="skeleton" style={{ width: 30, height: 30, borderRadius: 9 }} />
                  <div className="skeleton" style={{ width: 140, height: 18 }} />
                </div>
                <div style={{ display: 'flex', gap: 13, paddingLeft: 22 }}>
                  {[1, 2].map(j => (
                    <div key={j} className="skeleton" style={{ width: 196, height: 150, borderRadius: 14, flexShrink: 0 }} />
                  ))}
                </div>
              </div>
            ))
          : categories
              ?.filter(cat => activeFilterSlug === 'all' || cat.slug === activeFilterSlug)
              .map(cat => (
                <HomeCategorySection
                  key={cat.slug}
                  category={cat}
                  onSeeAll={() => {
                    navigate(`/category/${cat.slug}`);
                  }}
                />
              ))
        )}

        <div style={{ height: 20 }} />
      </div>

      {/* Bottom Nav */}
      <div className="bottomnav">
        <button className="bni active">
          <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="var(--emerald)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span className="bni-lbl">Home</span>
        </button>
        <button className="bni">
          <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="var(--ink-2)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <span className="bni-lbl">Explore</span>
        </button>
        <button className="bni" style={{ position: 'relative' }}>
          <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="var(--ink-2)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <span className="bni-lbl">Impact</span>
          <div className="bni-pip" />
        </button>
        <button className="bni">
          <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="var(--ink-2)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
          </svg>
          <span className="bni-lbl">Saved</span>
        </button>
        <button className="bni">
          <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="var(--ink-2)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
          </svg>
          <span className="bni-lbl">Profile</span>
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMenuOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', flexDirection: 'column'
        }}>
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMenuOpen(false)}
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} 
          />
          
          {/* Menu Panel */}
          <motion.div 
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={{ 
              position: 'absolute', top: 0, bottom: 0, left: 0, width: 280, 
              background: 'var(--base-0)', borderRight: '1px solid var(--border-sub)',
              display: 'flex', flexDirection: 'column', padding: '24px 16px', zIndex: 2
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, #00e676, #00bcd4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Compass size={18} color="#000" />
                </div>
                <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--ink-0)' }}>Eco-Stream</span>
              </div>
              <button 
                onClick={() => setIsMenuOpen(false)}
                style={{ background: 'var(--base-2)', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-0)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[{ icon: <HomeIcon size={20} />, label: 'Discover', active: true },
                { icon: <Compass size={20} />, label: 'Explore' },
                { icon: <Bookmark size={20} />, label: 'Saved' },
                { icon: <Settings size={20} />, label: 'Settings' }].map((item, i) => (
                <div key={i} style={{ 
                  display: 'flex', alignItems: 'center', gap: 16, padding: '12px 16px', 
                  borderRadius: 12, background: item.active ? 'var(--base-1)' : 'transparent',
                  color: item.active ? 'var(--emerald)' : 'var(--ink-1)',
                  fontWeight: item.active ? 700 : 500, cursor: 'pointer'
                }}>
                  {item.icon}
                  <span style={{ fontSize: 16 }}>{item.label}</span>
                </div>
              ))}
            </div>
            
            <div style={{ marginTop: 'auto', padding: '16px', background: 'var(--base-1)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #00e676, #00bcd4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 700 }}>A</div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-0)' }}>Alex User</span>
                <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>Premium Member</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
