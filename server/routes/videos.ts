import { Router, Request, Response } from 'express';
import { videos } from '../data/seed';

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
router.patch('/:id/progress', (req: Request, res: Response): any => {
  const video = videos.find(v => v.id === req.params.id);
  if (!video) {
    return res.status(404).json({ error: 'Video not found' });
  }
  
  if (req.body && typeof req.body.progress === 'number') {
    video.watchProgress = Math.max(0, Math.min(1, req.body.progress));
  }
  
  res.json(video);
});

export default router;
