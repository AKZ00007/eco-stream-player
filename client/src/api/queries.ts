import { useQuery } from '@tanstack/react-query';
import type { Video, Category } from '../types';

// ── LOCAL STORAGE PERSISTENCE ──
interface LocalHistory {
  [videoId: string]: { progress: number; lastWatchedAt: number };
}

function getLocalHistory(): LocalHistory {
  try {
    const raw = localStorage.getItem('eco-stream-history');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:4000';

export function useVideos(category?: string) {
  return useQuery({
    queryKey: ['videos', category],
    queryFn: async () => {
      const url = category ? `${API_URL}/videos?category=${category}` : `${API_URL}/videos`;
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (!res.ok) throw new Error('Failed to fetch videos');
      const allVideos = await res.json() as Video[];
      
      const localProgress = getLocalHistory();
      return allVideos.map((v) => ({
        ...v,
        watchProgress: localProgress[v.id]?.progress || 0
      }));
    }
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/categories`, { signal: AbortSignal.timeout(4000) });
      if (!res.ok) throw new Error('Failed to fetch categories');
      return res.json() as Promise<Category[]>;
    }
  });
}

// Emulate a static fetch for the ticker and optionally shuffle it on client side
export function useTrendingTicker(onUpdate?: (videos: Video[]) => void) {
  return useQuery({
    queryKey: ['trending-tick'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/trending-tick`, { signal: AbortSignal.timeout(4000) });
      if (!res.ok) throw new Error('Failed to fetch trending tick');
      let data = await res.json() as Video[];
      
      // Shuffle locally so it looks live
      data = data.sort(() => 0.5 - Math.random());
      
      if (onUpdate) onUpdate(data);
      return data;
    },
    refetchInterval: 30000, // Poll every 30s
  });
}

export function useRecommendations(watchedCategory: string, excludeId: string) {
  return useQuery({
    queryKey: ['recommendations', watchedCategory, excludeId],
    queryFn: async () => {
      const url = `${API_URL}/recommendations?watchedCategory=${watchedCategory}&excludeId=${excludeId}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (!res.ok) throw new Error('Failed to fetch recommendations');
      const recs = await res.json() as Video[];
      
      const localProgress = getLocalHistory();
      return recs.map((v) => ({
        ...v,
        watchProgress: localProgress[v.id]?.progress || 0
      }));
    },
    enabled: !!excludeId,
  });
}


export async function updateWatchProgress(videoId: string, progress: number) {
  // Update in localStorage
  const history = getLocalHistory();
  history[videoId] = {
    progress: Math.min(Math.max(progress, 0), 1),
    lastWatchedAt: Date.now()
  };
  localStorage.setItem('eco-stream-history', JSON.stringify(history));

  // We return a stub since the client expects a video, but it only really needs a success signal
  return { id: videoId, watchProgress: history[videoId].progress } as Video;
}

export function useWatchHistory() {
  return useQuery({
    queryKey: ['watch-history'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/videos`);
      const allVideos = await res.json() as Video[];
      
      const localProgress = getLocalHistory();
      const historyVideos = allVideos
        .filter(v => localProgress[v.id] && localProgress[v.id].progress > 0)
        .map(v => ({
          ...v,
          watchProgress: localProgress[v.id].progress,
          lastWatchedAt: localProgress[v.id].lastWatchedAt
        }))
        .sort((a, b) => b.lastWatchedAt - a.lastWatchedAt);
      
      return historyVideos;
    }
  });
}

export function useContinueWatching() {
  return useQuery({
    queryKey: ['continue-watching'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/videos`);
      const allVideos = await res.json() as Video[];
      
      const localProgress = getLocalHistory();
      const continueWatching = allVideos
        .filter(v => {
          const p = localProgress[v.id]?.progress || 0;
          return p > 0.05 && p < 1;
        })
        .map(v => ({
          ...v,
          watchProgress: localProgress[v.id].progress,
          lastWatchedAt: localProgress[v.id].lastWatchedAt
        }))
        .sort((a, b) => b.lastWatchedAt - a.lastWatchedAt);
      
      return continueWatching;
    }
  });
}
