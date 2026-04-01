import express from 'express';
import cors from 'cors';
import { videos } from './data/seed';
import { startTrendingTicker } from './middleware/trendingTicker';

import videosRouter from './routes/videos';
import categoriesRouter from './routes/categories';
import recommendationsRouter from './routes/recommendations';
import historyRouter from './routes/history';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Routes (Local dev)
app.use('/videos', videosRouter);
app.use('/categories', categoriesRouter);
app.use('/recommendations', recommendationsRouter);
app.use('/history', historyRouter);

// Routes (Vercel Serverless)
app.use('/api/videos', videosRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/recommendations', recommendationsRouter);
app.use('/api/history', historyRouter);

// Trending TICK endpoint (Internal polling for UI refresh)
app.get('/trending-tick', (req, res) => {
  // Returns current mutated video list reflecting trending edits
  // In serverless, we just return the static list
  res.json(videos.filter(v => v.isTrending));
});

// For Vercel Serverless environment, we export the app
// For local development, we listen to a port
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`[Eco-Stream Backend] Server running at http://localhost:${PORT}`);
    console.log(`[Eco-Stream Backend] Started mock data engine with ${videos.length} videos.`);
  });
}

// Ensure the trending ticker is not started automatically in production
if (process.env.NODE_ENV !== 'production') {
  startTrendingTicker(30000); // 30 seconds
}

export default app;
