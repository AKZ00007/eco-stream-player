import { Router, Request, Response } from 'express';
import { videos } from '../data/seed';
import { getCategoryAffinity, getWatchedVideoIds } from '../data/watchHistory';

const router = Router();

// GET /recommendations?watchedCategory=slug&excludeId=id
// 
// Enhanced recommendation algorithm:
//   1. Same-category priority           (+1000 pts)
//   2. Category affinity from history   (+0–200 pts based on user preference)
//   3. Trending bonus                    (+15 pts)
//   4. View count popularity             (+0–20 pts normalized)
//   5. Impact score baseline             (+0–100 pts)
//   6. Already watched penalty           (-500 pts, push to bottom)
//   7. Diversity: ensure at least 1 cross-category recommendation
//
router.get('/', (req: Request, res: Response): any => {
  const { watchedCategory, excludeId } = req.query;
  
  if (!excludeId || typeof excludeId !== 'string') {
    return res.status(400).json({ error: 'excludeId is required' });
  }

  // Exclude the current video
  const candidates = videos.filter(v => v.id !== excludeId);

  // Get user signals
  const categoryAffinity = getCategoryAffinity();
  const watchedIds = getWatchedVideoIds();

  // Normalize view counts for scoring (0–20 range)
  const maxViewCount = Math.max(...candidates.map(v => v.viewCount), 1);

  const scoredCandidates = candidates.map(v => {
    let sortScore = 0;

    // 1. Base: Impact score (0–100)
    sortScore += v.impactScore;

    // 2. Same-category priority
    if (watchedCategory && v.categorySlug === watchedCategory) {
      sortScore += 1000;
    }

    // 3. Category affinity from watch history (0–200)
    const affinity = categoryAffinity[v.categorySlug] || 0;
    sortScore += affinity * 2; // Scale to 0–200

    // 4. Trending bonus
    if (v.isTrending) {
      sortScore += 15;
    }

    // 5. View count popularity (0–20)
    sortScore += Math.round((v.viewCount / maxViewCount) * 20);

    // 6. Already watched penalty — push these down but don't exclude entirely
    if (watchedIds.has(v.id)) {
      sortScore -= 500;
    }

    // 7. Partially watched bonus — user might want to finish these
    if (v.watchProgress > 0.1 && v.watchProgress < 0.9) {
      sortScore += 50; // "Continue watching" nudge
    }

    return { video: v, sortScore };
  });

  // Sort by score DESC
  scoredCandidates.sort((a, b) => b.sortScore - a.sortScore);

  // ── Diversity pass ──
  // Ensure at least 1 recommendation is from a DIFFERENT category
  // to encourage cross-category discovery.
  const top4 = scoredCandidates.slice(0, 4).map(sc => sc.video);
  const allSameCategory = top4.every(v => v.categorySlug === watchedCategory);

  if (allSameCategory && watchedCategory) {
    // Find the highest-scored cross-category video
    const crossCategory = scoredCandidates.find(
      sc => sc.video.categorySlug !== watchedCategory
    );
    if (crossCategory) {
      // Replace the 4th slot with the cross-category pick
      top4[3] = crossCategory.video;
    }
  }

  res.json(top4);
});

export default router;
