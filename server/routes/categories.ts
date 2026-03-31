import { Router, Request, Response } from 'express';
import { categories } from '../data/seed';

const router = Router();

// GET /categories
router.get('/', (req: Request, res: Response) => {
  res.json(categories);
});

export default router;
