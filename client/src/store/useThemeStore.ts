import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ThemeMode = 'dark' | 'light';

interface ThemeStore {
  mode: ThemeMode;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      mode: 'dark',
      toggleTheme: () => {
        const next = get().mode === 'dark' ? 'light' : 'dark';
        set({ mode: next });
        document.documentElement.setAttribute('data-theme', next);
      },
    }),
    {
      name: 'eco-stream-theme',
      onRehydrateStorage: () => (state) => {
        // Apply theme to DOM on app startup
        if (state) {
          document.documentElement.setAttribute('data-theme', state.mode);
        }
      },
    }
  )
);
