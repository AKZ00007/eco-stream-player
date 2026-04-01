import { Router, Request, Response } from 'express';
import { videos } from '../data/seed';
import { getWatchHistory, getCategoryAffinity, clearHistory } from '../data/watchHistory';

const router = Router();

// GET /history
// Returns the user's watch history with full video data, most recent first.
router.get('/', (req: Request, res: Response) => {
  const history = getWatchHistory();
  
  const result = history
    .map(entry => {
      const video = videos.find(v => v.id === entry.videoId);
      if (!video) return null;
      return {
        ...video,
        lastWatchedAt: entry.watchedAt,
      };
    })
    .filter(Boolean);

  res.json(result);
});

// GET /history/continue
// Now an advanced recommendation and discovery engine for "Recommended for You".
router.get('/continue', (req: Request, res: Response) => {
  const history = getWatchHistory();
  const affinity = getCategoryAffinity();

  // Count total videos per category
  const categoryCounts: Record<string, number> = {};
  videos.forEach(v => {
    categoryCounts[v.categorySlug] = (categoryCounts[v.categorySlug] || 0) + 1;
  });

  // Count completely watched videos (progress > 0.9) per category
  const watchedCategoryCounts: Record<string, number> = {};
  history.forEach(entry => {
    if (entry.watchProgress >= 0.9) {
      watchedCategoryCounts[entry.categorySlug] = (watchedCategoryCounts[entry.categorySlug] || 0) + 1;
    }
  });

  const recommendations = videos.map(video => {
    let score = video.impactScore; // 0-100 base score

    const historyEntry = history.find(e => e.videoId === video.id);
    const progress = historyEntry ? historyEntry.watchProgress : 0;
    
    // 1. In-Progress Priority: Just started -> Keep toward the front
    if (progress > 0.05 && progress < 0.9) {
      score += 400; 
    }

    // 2. Almost Finished: Nearing completion -> Keep Last
    if (progress >= 0.9) {
      score -= 1000;
    }

    // 3. Category Exhaustion: Watched all videos in this category -> Keep Last
    const totalInCat = categoryCounts[video.categorySlug] || 0;
    const watchedInCat = watchedCategoryCounts[video.categorySlug] || 0;
    if (totalInCat > 0 && watchedInCat >= totalInCat) {
      score -= 500;
    }

    // 4. Discovery: Unwatched category -> High chance to be first
    if (!affinity[video.categorySlug] || affinity[video.categorySlug] === 0) {
      score += 350;
    }

    // 5. Shuffle: Large random factor so in-progress and discovery videos truly mix
    score += (Math.random() * 200) - 100;

    return { video, score };
  });

  // Sort descending by calculated score
  recommendations.sort((a, b) => b.score - a.score);

  // Return the top 6 videos
  res.json(recommendations.slice(0, 6).map(r => r.video));
});

// GET /history/affinity
// Returns the user's category preferences for debugging / "For You" features.
router.get('/affinity', (req: Request, res: Response) => {
  res.json(getCategoryAffinity());
});

// DELETE /history
// Clear watch history (useful for testing).
router.delete('/', (req: Request, res: Response) => {
  clearHistory();
  res.json({ message: 'Watch history cleared' });
});

export default router;
