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

// Routes
app.use('/videos', videosRouter);
app.use('/categories', categoriesRouter);
app.use('/recommendations', recommendationsRouter);
app.use('/history', historyRouter);

// Trending TICK endpoint (Internal polling for UI refresh)
app.get('/trending-tick', (req, res) => {
  // Returns current mutated video list reflecting trending edits
  res.json(videos);
});

// Start the ticker Simulation
startTrendingTicker(30000); // Ev. 30 seconds

app.listen(PORT, () => {
  console.log(`[Eco-Stream Backend] Server running at http://localhost:${PORT}`);
  console.log(`[Eco-Stream Backend] Started mock data engine with ${videos.length} videos.`);
});
