import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Video } from '../types';

export type PlayerState = 'CLOSED' | 'FULL' | 'MINI';

interface PlayerStore {
  state: PlayerState;
  currentVideo: Video | null;
  isPlaying: boolean;
  progress: number;
  
  openPlayer: (video: Video) => void;
  minimizePlayer: () => void;
  maximizePlayer: () => void;
  closePlayer: () => void;
  
  setPlaying: (playing: boolean) => void;
  setProgress: (progress: number) => void;

  // New Desktop Mini Player States
  desktopMiniVideo: Video | null;
  desktopMiniProgress: number;
  setDesktopMini: (video: Video | null, progress: number) => void;
  clearDesktopMini: () => void;
}

export const usePlayerStore = create<PlayerStore>()(
  persist(
    (set) => ({
      state: 'CLOSED',
      currentVideo: null,
      isPlaying: false,
      progress: 0,
      
      openPlayer: (video) => set({ 
        state: 'FULL', 
        currentVideo: video,
        isPlaying: true // Auto play on open
      }),
      
      minimizePlayer: () => set((state) => {
        if (state.currentVideo) {
          return { state: 'MINI' };
        }
        return state;
      }),
      
      maximizePlayer: () => set((state) => {
        if (state.currentVideo) {
          return { state: 'FULL' };
        }
        return state;
      }),
      
      closePlayer: () => set({ 
        state: 'CLOSED', 
        currentVideo: null,
        isPlaying: false 
      }),
      
      setPlaying: (playing) => set({ isPlaying: playing }),
      setProgress: (progress) => set({ progress }),

      // New Desktop Actions
      desktopMiniVideo: null,
      desktopMiniProgress: 0,
      setDesktopMini: (video, progress) => set({ desktopMiniVideo: video, desktopMiniProgress: progress }),
      clearDesktopMini: () => set({ desktopMiniVideo: null, desktopMiniProgress: 0 }),
    }),
    {
      name: 'eco-stream-player-storage',
      partialize: (state) => ({ 
        progress: state.progress, 
        currentVideo: state.currentVideo,
        desktopMiniVideo: state.desktopMiniVideo,
        desktopMiniProgress: state.desktopMiniProgress
      }),
    }
  )
);
