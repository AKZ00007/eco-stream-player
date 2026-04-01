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
  isTrending: boolean,
  description?: string
): number {
  const categoryWeight = CATEGORY_WEIGHTS[categorySlug] || 80;
  
  let keywordBonus = 0;
  const lowerTitle = title.toLowerCase();
  const lowerDesc = description?.toLowerCase() || '';
  
  if (lowerTitle.includes('zero waste') || lowerTitle.includes('revival') || lowerDesc.includes('zero waste')) {
    keywordBonus += 9;
  }
  if (lowerTitle.includes('protection') || lowerTitle.includes('rhino') || lowerTitle.includes('arctic') || lowerTitle.includes('reef') || lowerDesc.includes('endangered')) {
    keywordBonus += 7;
  }
  if (lowerTitle.includes('sahara') || lowerTitle.includes('offshore') || lowerTitle.includes('rainforest') || lowerDesc.includes('sequester')) {
    keywordBonus += 5;
  }
  
  keywordBonus = Math.min(keywordBonus, 10); 
  
  const kwScore = keywordBonus * 10; 
  const trendScore = isTrending ? 50 : 0; 
  
  let score = (baseScore * 0.40) + (categoryWeight * 0.30) + (kwScore * 0.20) + (trendScore * 0.10);
  
  if (score > 100) score = 100;
  if (score < 0) score = 0;
  
  return Math.round(score);
}
