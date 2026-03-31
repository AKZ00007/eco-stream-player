export interface Video {
  id: string;              // UUID
  title: string;           // from dataset
  mediaUrl: string;        // MP4 stream URL
  thumbnailUrl: string;    // Unsplash image URL
  duration: string;        // "MM:SS" format
  categorySlug: string;    // linked category
  impactScore: number;     // dynamic 0–100
  isTrending: boolean;     // mutated by trending simulation
  viewCount: number;       // simulated counter
  watchProgress: number;   // 0.0–1.0, persisted per session
  dominantColor: string;   // hex
  description: string;    // video details
}

export interface Category {
  slug: string;       // e.g. "ocean-health"
  category: string;   // display name
  emoji: string;      // assigned emoji icon
  videoCount: number; // computed from contents.length
}
