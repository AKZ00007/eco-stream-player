import { Router, Request, Response } from 'express';
import { videos } from '../data/seed';

const router = Router();

// GET /recommendations?watchedCategory=slug&excludeId=id
router.get('/', (req: Request, res: Response): any => {
  const { watchedCategory, excludeId } = req.query;
  
  if (!excludeId || typeof excludeId !== 'string') {
    return res.status(400).json({ error: 'excludeId is required' });
  }

  // 1. Exclude the current watched video
  let candidates = videos.filter(v => v.id !== excludeId);

  // Sorting Logic:
  // - Same-category priority
  // - High impact score
  // - Trending bonus (+10 pts to sort score)
  
  const scoredCandidates = candidates.map(v => {
    let sortScore = v.impactScore; // Base is impact score
    
    // 3. Trending bonus
    if (v.isTrending) {
      sortScore += 10;
    }
    
    // 1. Same-category priority (bump significantly so they appear first)
    if (watchedCategory && v.categorySlug === watchedCategory) {
      sortScore += 1000; 
    }
    
    return { video: v, sortScore };
  });

  // Sort DESC
  scoredCandidates.sort((a, b) => b.sortScore - a.sortScore);
  
  // 4. Returns exactly 4 video objects
  const finalList = scoredCandidates.slice(0, 4).map(sc => sc.video);
  
  res.json(finalList);
});

export default router;
