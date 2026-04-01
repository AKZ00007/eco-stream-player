// ── In-memory watch history store ──
// Tracks which videos a user has watched and their category preferences.
// In production this would be backed by a database, but for our mock server
// this in-memory store is sufficient.

export interface WatchEntry {
  videoId: string;
  categorySlug: string;
  watchedAt: number;       // timestamp
  watchProgress: number;   // 0.0–1.0 how much they watched
}

// For simplicity we use a single global user session.
// In production this would be keyed by userId / sessionId.
let watchHistory: WatchEntry[] = [];

/**
 * Record that a video was watched (or update existing entry).
 */
export function recordWatch(videoId: string, categorySlug: string, progress: number) {
  const existing = watchHistory.find(e => e.videoId === videoId);
  if (existing) {
    existing.watchedAt = Date.now();
    existing.watchProgress = Math.max(existing.watchProgress, progress);
    existing.categorySlug = categorySlug;
  } else {
    watchHistory.push({
      videoId,
      categorySlug,
      watchedAt: Date.now(),
      watchProgress: progress,
    });
  }
}

/**
 * Get the full watch history, most recent first.
 */
export function getWatchHistory(): WatchEntry[] {
  return [...watchHistory].sort((a, b) => b.watchedAt - a.watchedAt);
}

/**
 * Get category affinity scores based on watch history.
 * Returns a map of categorySlug → affinity score (0–100).
 * Categories watched more recently and more frequently score higher.
 */
export function getCategoryAffinity(): Record<string, number> {
  const affinity: Record<string, { count: number; recency: number; totalProgress: number }> = {};

  const now = Date.now();
  watchHistory.forEach(entry => {
    if (!affinity[entry.categorySlug]) {
      affinity[entry.categorySlug] = { count: 0, recency: 0, totalProgress: 0 };
    }
    const cat = affinity[entry.categorySlug];
    cat.count += 1;
    // Recency: higher score for more recent watches (decay over 1 hour)
    const ageMs = now - entry.watchedAt;
    const recencyScore = Math.max(0, 100 - (ageMs / (60 * 60 * 1000)) * 100);
    cat.recency = Math.max(cat.recency, recencyScore);
    cat.totalProgress += entry.watchProgress;
  });

  const result: Record<string, number> = {};
  Object.entries(affinity).forEach(([slug, data]) => {
    // Weighted formula: frequency (40%) + recency (40%) + engagement depth (20%)
    const frequencyScore = Math.min(100, data.count * 25); // 4+ watches = max
    const engagementScore = Math.min(100, (data.totalProgress / data.count) * 100);
    result[slug] = Math.round(
      frequencyScore * 0.4 + data.recency * 0.4 + engagementScore * 0.2
    );
  });

  return result;
}

/**
 * Get IDs of videos already watched (progress > 5%).
 */
export function getWatchedVideoIds(): Set<string> {
  return new Set(
    watchHistory
      .filter(e => e.watchProgress > 0.05)
      .map(e => e.videoId)
  );
}

/**
 * Clear history (useful for testing).
 */
export function clearHistory() {
  watchHistory = [];
}
