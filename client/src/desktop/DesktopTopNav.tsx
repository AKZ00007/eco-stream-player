import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Moon, Sun, Bell, Leaf, Menu, Mic, Plus } from 'lucide-react';
import { useThemeStore } from '../store/useThemeStore';
import { useSearchStore } from '../store/useSearchStore';
import { useLayoutStore } from '../store/useLayoutStore';
import { usePlayerStore } from '../store/usePlayerStore';

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

function ThemeToggle() {
  const { mode, toggleTheme } = useThemeStore();
  return (
    <button
      onClick={toggleTheme}
      title={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 40, height: 40, borderRadius: '50%',
        background: 'transparent', border: 'none', cursor: 'pointer',
        color: 'var(--ink-0)'
      }}
      onMouseOver={e => e.currentTarget.style.background = 'var(--base-2)'}
      onMouseOut={e => e.currentTarget.style.background = 'transparent'}
    >
      {mode === 'dark'
        ? <Sun size={20} strokeWidth={1.5} />
        : <Moon size={20} strokeWidth={1.5} />
      }
    </button>
  );
}

export default function DesktopTopNav() {
  const isDesktop = useIsDesktop();
  const navigate = useNavigate();
  const { query, setQuery } = useSearchStore();
  const toggleSidebar = useLayoutStore(s => s.toggleSidebar);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      height: 64, padding: '0 24px', flexShrink: 0,
      background: 'var(--base-0)',
      borderBottom: '1px solid var(--border-sub)',
      position: 'sticky', top: 0, zIndex: 50,
    }}>

      {/* Left Logo & Hamburger */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: '1 0 fit-content', minWidth: 'min-content' }}>
        <button
          onClick={toggleSidebar}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 40, height: 40, borderRadius: '50%',
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'var(--ink-0)'
          }}
          onMouseOver={e => e.currentTarget.style.background = 'var(--base-2)'}
          onMouseOut={e => e.currentTarget.style.background = 'transparent'}
        >
          <Menu size={20} strokeWidth={1.5} />
        </button>  
        
        <div 
          onClick={() => {
            usePlayerStore.getState().closePlayer();
            navigate('/');
          }}
          style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
        >
          <div style={{
          width: 34, height: 34, borderRadius: 10,
          background: 'linear-gradient(135deg, #00e676, #00bcd4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Leaf size={18} fill="#000" color="#000" />
          </div>
          <span className="gradient-text" style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-0.4px', color: 'var(--ink-0)' }}>
            Eco-Stream
          </span>
        </div>
      </div>

      {/* Center Group (Search + Mic) */}
      {isDesktop ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '1 1 732px', minWidth: 100, margin: '0 16px' }}>
          <div style={{
            flex: 1,
            display: 'flex', alignItems: 'center',
            background: 'var(--base-1)', border: '1px solid var(--border-sub)',
            borderRadius: 40,
            padding: '0 16px', height: 44,
          }}>
            <Search size={18} color="var(--ink-2)" style={{ marginRight: 12 }} />
            <input
              type="text"
              placeholder="Search eco stories..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                fontSize: 16, color: 'var(--ink-0)',
                fontFamily: 'var(--font-sans)',
              }}
            />
          </div>
          <button style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            width: 40, height: 40, borderRadius: '50%', marginLeft: 16,
            background: 'var(--base-2)', border: 'none', cursor: 'pointer',
            color: 'var(--ink-0)'
          }} title="Search with your voice">
            <Mic size={18} strokeWidth={1.5} />
          </button>
        </div>
      ) : (
        <div style={{ flex: '1 1 auto' }} /> // Spacer for mobile
      )}

      {/* Right Icons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 0 fit-content', justifyContent: 'flex-end', minWidth: 'min-content' }}>
        {!isDesktop && (
          <button style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 40, height: 40, borderRadius: '50%',
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'var(--ink-0)'
          }}
          onClick={() => {
            usePlayerStore.getState().closePlayer();
            navigate('/');
          }}>
            <Search size={20} strokeWidth={2} />
          </button>
        )}
        {isDesktop && (
          <button style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--base-2)', border: 'none', borderRadius: 20,
            padding: '8px 16px 8px 12px', cursor: 'pointer',
            color: 'var(--ink-0)', fontSize: 14, fontWeight: 500
          }}>
            <Plus size={18} strokeWidth={2} />
            Create
          </button>
        )}
        <ThemeToggle />
        <button style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 40, height: 40, borderRadius: '50%',
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: 'var(--ink-0)'
        }}
        onMouseOver={e => e.currentTarget.style.background = 'var(--base-2)'}
        onMouseOut={e => e.currentTarget.style.background = 'transparent'}
        >
          <Bell size={20} strokeWidth={1.5} />
        </button>
        <button style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 34, height: 34, borderRadius: '50%', marginLeft: 8,
          background: 'linear-gradient(135deg, #00e676, #00bcd4)', border: 'none', cursor: 'pointer',
          color: '#000', fontWeight: 700
        }}>
          A
        </button>
      </div>
    </div>
  );
}
