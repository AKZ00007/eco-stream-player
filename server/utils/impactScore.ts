import { Video } from '../types';

const CATEGORY_WEIGHTS: Record<string, number> = {
  'biodiversity': 100, // Wildlife Protection
  'ocean-health': 95,  // Ocean Conservation
  'forest-growth': 92, // Reforestation
  'clean-power': 90,   // Renewable Energy
  'green-cities': 85   // Urban Sustainability
};

export function calculateImpactScore(
  baseScore: number, 
  categorySlug: string, 
  title: string, 
  isTrending: boolean
): number {
  const categoryWeight = CATEGORY_WEIGHTS[categorySlug] || 80;
  
  let keywordBonus = 0;
  const lowerTitle = title.toLowerCase();
  
  if (lowerTitle.includes('zero waste') || lowerTitle.includes('revival')) {
    keywordBonus += 9;
  }
  if (lowerTitle.includes('protection') || lowerTitle.includes('rhino') || lowerTitle.includes('arctic') || lowerTitle.includes('reef')) {
    keywordBonus += 7;
  }
  if (lowerTitle.includes('sahara') || lowerTitle.includes('offshore') || lowerTitle.includes('rainforest')) {
    keywordBonus += 5;
  }
  
  keywordBonus = Math.min(keywordBonus, 10); // Max 10 pts
  
  // According to PRD:
  // baseScore * 0.40
  // + categoryWeight * 0.30
  // + keywordBonus * 0.20 
  // + trendingBonus * 0.10 
  // Let's assume the PRD formula intended the keywordBonus/trending to be on a 0-100 scale before multiplication, 
  // OR the "pts" literally applies to the final score. The text says "keywordBonus x 0.20 // (0-10 pts)".
  // For balance to reach ~100 max:
  // Base (100) * 0.4 = 40
  // Cat (100) * 0.3 = 30
  // Kw (100?) * 0.2 = 20 -> If max is 10 pts, then we multiply by 10 before weight: (10*10)*0.2 = 20.
  // Trending (100?) * 0.1 = 10 -> so let's say "5" means "50 out of 100", 50*0.1=5.
  
  const kwScore = keywordBonus * 10; 
  const trendScore = isTrending ? 50 : 0; // 50 * 0.10 = 5 points
  
  let score = (baseScore * 0.40) + (categoryWeight * 0.30) + (kwScore * 0.20) + (trendScore * 0.10);
  
  if (score > 100) score = 100;
  if (score < 0) score = 0;
  
  return Math.round(score);
}
