import { videos, recomputeScores } from '../data/seed';

export function startTrendingTicker(intervalMs = 30000) {
  setInterval(() => {
    // Reset all trending
    videos.forEach(v => v.isTrending = false);
    
    // Pick 1-2 random videos to be trending
    const numTrending = Math.floor(Math.random() * 2) + 1;
    const shuffled = [...videos].sort(() => 0.5 - Math.random());
    const picked = shuffled.slice(0, numTrending);
    
    picked.forEach(v => {
      const target = videos.find(video => video.id === v.id);
      if (target) {
        target.isTrending = true;
      }
    });
    
    // Recompute all impact scores since trending state changed
    recomputeScores();
    console.log(`[Ticker] Updated trending state. ${numTrending} videos are now trending.`);
    
  }, intervalMs);
}
