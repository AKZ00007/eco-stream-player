import type { Video } from '../types';

const GREEN_KEYWORDS = [
  'solar', 'wind', 'renewable', 'energy', 'clean',
  'conservation', 'biodiversity', 'ocean', 'forest',
  'climate', 'sustainable', 'eco', 'earth', 'nature',
  'recycle', 'waste', 'pollution', 'green', 'future'
];

const CATEGORY_SCORES: Record<string, number> = {
  'renewable-energy': 25,
  'ocean-health': 20,
  'biodiversity': 18,
  'clean-cities': 15,
  'forest-growth': 22,
};

/**
 * Calculates a dynamic Climate Impact score based on video metadata.
 * Returns a score between 1 and 100.
 */
export function calculateImpactScore(video: Video): number {
  let score = 50; // Base score

  // Category weight
  score += CATEGORY_SCORES[video.categorySlug] || 10;

  // Keyword weight (Title & Description)
  const fullText = `${video.title} ${video.description}`.toLowerCase();
  
  GREEN_KEYWORDS.forEach(word => {
    if (fullText.includes(word)) {
      score += 4;
    }
  });

  // Unique hash based on ID to ensure the same video always has the same score
  const hash = video.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  score += (hash % 10);

  // Cap the score between 1 and 99
  return Math.min(99, Math.max(1, score));
}
