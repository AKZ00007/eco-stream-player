import { Router, Request, Response } from 'express';
import { videos } from '../data/seed';
import { recordWatch, getWatchHistory, getCategoryAffinity } from '../data/watchHistory';

const router = Router();

// GET /videos
// Accepts ?category=slug, ?trending=true, ?sort=viewCount
router.get('/', (req: Request, res: Response) => {
  let result = [...videos];
  
  if (req.query.category) {
    result = result.filter(v => v.categorySlug === req.query.category);
  }
  
  if (req.query.trending === 'true') {
    result = result.filter(v => v.isTrending);
  }
  
  if (req.query.sort === 'viewCount') {
    result.sort((a, b) => b.viewCount - a.viewCount);
  } else {
    // Default: Apply global recommendation shuffle sorting
    const history = getWatchHistory();
    const affinity = getCategoryAffinity();

    const categoryCounts: Record<string, number> = {};
    videos.forEach(v => {
      categoryCounts[v.categorySlug] = (categoryCounts[v.categorySlug] || 0) + 1;
    });

    const watchedCategoryCounts: Record<string, number> = {};
    history.forEach(entry => {
      if (entry.watchProgress >= 0.9) {
        watchedCategoryCounts[entry.categorySlug] = (watchedCategoryCounts[entry.categorySlug] || 0) + 1;
      }
    });

    const scoredResult = result.map(video => {
      let score = video.impactScore; 

      const historyEntry = history.find(e => e.videoId === video.id);
      const progress = historyEntry ? historyEntry.watchProgress : 0;
      
      if (progress > 0.05 && progress < 0.9) score += 400; 
      if (progress >= 0.9) score -= 1000;

      const totalInCat = categoryCounts[video.categorySlug] || 0;
      const watchedInCat = watchedCategoryCounts[video.categorySlug] || 0;
      if (totalInCat > 0 && watchedInCat >= totalInCat) score -= 500;

      if (!affinity[video.categorySlug] || affinity[video.categorySlug] === 0) score += 350;

      score += (Math.random() * 200) - 100;

      return { video, score };
    });

    scoredResult.sort((a, b) => b.score - a.score);
    result = scoredResult.map(r => r.video);
  }
  
  res.json(result);
});

// GET /videos/:id 
router.get('/:id', (req: Request, res: Response): any => {
  const video = videos.find(v => v.id === req.params.id);
  if (!video) {
    return res.status(404).json({ error: 'Video not found' });
  }
  
  res.json(video);
});

// PATCH /videos/:id/progress
// Now also records watch history for the recommendation engine
router.patch('/:id/progress', (req: Request, res: Response): any => {
  const video = videos.find(v => v.id === req.params.id);
  if (!video) {
    return res.status(404).json({ error: 'Video not found' });
  }
  
  if (req.body && typeof req.body.progress === 'number') {
    const progress = Math.max(0, Math.min(1, req.body.progress));
    video.watchProgress = progress;

    // Record this watch event for recommendations
    recordWatch(video.id, video.categorySlug, progress);
  }
  
  res.json(video);
});

export default router;
