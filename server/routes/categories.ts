import { Router, Request, Response } from 'express';
import { categories, videos } from '../data/seed';
import { getWatchHistory, getCategoryAffinity } from '../data/watchHistory';

const router = Router();

// GET /categories
// Now returns categories dynamically sorted by recommendation engine
router.get('/', (req: Request, res: Response) => {
  const history = getWatchHistory();
  const affinity = getCategoryAffinity();

  const categoryScores = categories.map(cat => {
    let score = 0;
    
    // Evaluate watch status for this category's videos
    const catVideos = videos.filter(v => v.categorySlug === cat.slug);
    const totalVideos = catVideos.length;

    let fullyWatched = 0;
    let inProgress = 0;

    catVideos.forEach(v => {
      const entry = history.find(e => e.videoId === v.id);
      if (entry) {
        if (entry.watchProgress >= 0.9) {
          fullyWatched++;
        } else if (entry.watchProgress > 0.05) {
          inProgress++;
        }
      }
    });

    // 1. Exhausted Category Penalty -> Send to bottom
    if (totalVideos > 0 && fullyWatched >= totalVideos) {
      score -= 1000;
    }

    // 2. Active Engagement Boost -> Keep towards top
    if (inProgress > 0) {
      score += 500;
    }

    // 3. Discovery Boost -> High priority for unwatched categories
    if (!affinity[cat.slug] || affinity[cat.slug] === 0) {
      score += 400; 
    }

    // 4. Shuffle Factor -> Mix closely scored categories
    score += (Math.random() * 200) - 100;

    return { ...cat, score };
  });

  // Sort descending by calculated score
  categoryScores.sort((a, b) => b.score - a.score);

  // Strip score before returning
  const sortedCategories = categoryScores.map(({ score, ...rest }) => rest);

  res.json(sortedCategories);
});

export default router;
