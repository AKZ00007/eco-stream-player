import { useQuery } from '@tanstack/react-query';
import type { Video, Category } from '../types';

const API_URL = 'http://localhost:4000';

export function useVideos(category?: string) {
  return useQuery({
    queryKey: ['videos', category],
    queryFn: async () => {
      const url = category ? `${API_URL}/videos?category=${category}` : `${API_URL}/videos`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch videos');
      return res.json() as Promise<Video[]>;
    }
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/categories`);
      if (!res.ok) throw new Error('Failed to fetch categories');
      return res.json() as Promise<Category[]>;
    }
  });
}

export function useTrendingTicker(onUpdate?: (videos: Video[]) => void) {
  return useQuery({
    queryKey: ['trending-tick'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/trending-tick`);
      if (!res.ok) throw new Error('Failed to fetch trending tick');
      const data = await res.json() as Video[];
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
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch recommendations');
      return res.json() as Promise<Video[]>;
    },
    enabled: !!excludeId,
  });
}

export async function updateWatchProgress(videoId: string, progress: number) {
  const res = await fetch(`${API_URL}/videos/${videoId}/progress`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ progress }),
  });
  if (!res.ok) throw new Error('Failed to update progress');
  return res.json() as Promise<Video>;
}
