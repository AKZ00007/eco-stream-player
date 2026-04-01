import './index.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Home as HomeIcon, Compass, BookMarked, Settings } from 'lucide-react';
import { useNotification } from './hooks/useNotification';
import Home from './pages/Home';
import CategoryPlaylist from './pages/CategoryPlaylist';
import PlayerRoot from './components/PlayerRoot';
import DesktopTopNav from './desktop/DesktopTopNav';
import DesktopVideoPage from './desktop/DesktopVideoPage';
import DesktopMiniPlayer from './desktop/DesktopMiniPlayer';
import { useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useLayoutStore } from './store/useLayoutStore';

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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
  },
});

function Sidebar({ isWatchPage }: { isWatchPage?: boolean }) {
  const { isSidebarExpanded } = useLayoutStore();
  const { showNotification } = useNotification();

  const navItems = [
    { icon: <HomeIcon size={isSidebarExpanded ? 20 : 24} />, label: 'Discover', active: true },
    { icon: <Compass size={isSidebarExpanded ? 20 : 24} />, label: 'Explore' },
    { icon: <BookMarked size={isSidebarExpanded ? 20 : 24} />, label: 'Saved' },
    { icon: <Settings size={isSidebarExpanded ? 20 : 24} />, label: 'Settings' },
  ];

  return (
    <aside 
      className="sidebar" 
      style={{ 
        display: isWatchPage ? 'none' : 'flex',
        flexDirection: 'column',
        width: isSidebarExpanded ? 240 : 72,
        flexShrink: 0,
        background: 'var(--base-0)',
        borderRight: '1px solid var(--border-sub)',
        overflowY: 'auto',
        transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        paddingTop: 12
      }}
    >
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: isSidebarExpanded ? 4 : 8, padding: isSidebarExpanded ? '0 12px' : '0 4px' }}>
        {navItems.map((item) => (
          <button
            key={item.label}
            style={{
              display: 'flex', 
              flexDirection: isSidebarExpanded ? 'row' : 'column',
              alignItems: 'center', 
              justifyContent: isSidebarExpanded ? 'flex-start' : 'center',
              gap: isSidebarExpanded ? 16 : 4,
              width: '100%', 
              height: isSidebarExpanded ? 44 : 74,
              padding: isSidebarExpanded ? '0 12px' : '16px 0 14px',
              borderRadius: 10,
              background: item.active ? 'var(--base-2)' : 'transparent',
              border: 'none', 
              cursor: 'pointer', 
              color: item.active ? 'var(--ink-0)' : 'var(--ink-1)',
              fontSize: isSidebarExpanded ? 14 : 10,
              fontWeight: item.active ? 600 : 400,
              transition: 'background 0.2s',
            }}
            onMouseOver={e => !item.active && (e.currentTarget.style.background = 'var(--base-1)')}
            onMouseOut={e => !item.active && (e.currentTarget.style.background = 'transparent')}
            onClick={() => !item.active && showNotification()}
          >
            {item.icon}
            <span style={{ 
              overflow: 'hidden', 
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '100%',
              marginTop: isSidebarExpanded ? 0 : 2
            }}>
              {item.label}
            </span>
          </button>
        ))}
      </nav>
    </aside>
  );
}

function AppContent() {
  const location = useLocation();
  const isWatchPage = location.pathname.startsWith('/video/');
  const isDesktop = useIsDesktop();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      {/* Global Top Nav for Desktop (also always shown on WatchPage to prevent missing header on resize) */}
      {(isDesktop || isWatchPage) && <DesktopTopNav />}
      
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar — hidden on mobile, or when on Watch page on desktop */}
        {isDesktop && <Sidebar isWatchPage={isWatchPage} />}

        {/* Main content area */}
        <div className="main-content">
          <AnimatePresence mode="wait">
            <Routes>
            <Route path="/" element={<Home />} />
              <Route path="/category/:slug" element={<CategoryPlaylist />} />
              <Route path="/video/:id" element={<DesktopVideoPage />} />
            </Routes>
          </AnimatePresence>
        </div>
      </div>

      {/* Global player layer — always on top (handles mobile via Zustand state) */}
      {!isWatchPage && !isDesktop && <PlayerRoot />}

      {/* Desktop Mini Player — floats globally across all routes */}
      {isDesktop && !isWatchPage && <DesktopMiniPlayer />}
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
