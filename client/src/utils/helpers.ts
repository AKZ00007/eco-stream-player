// No Video import needed here

// Format large numbers like YouTube: 142K, 2.1M
export function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${Math.floor(n / 1_000)}K`;
  return String(n);
}

// Format seconds → MM:SS
export function formatTime(s: number): string {
  if (isNaN(s) || !isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

// Get impact badge class
export function getImpactClass(score: number): string {
  if (score >= 90) return 'impact-high';
  if (score >= 75) return 'impact-mid';
  return 'impact-low';
}

// Get dominant color from thumbnailUrl via a fast canvas sample (best-effort)
export async function extractDominantColor(imgUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 8; canvas.height = 8;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve('#111318'); return; }
        ctx.drawImage(img, 0, 0, 8, 8);
        const d = ctx.getImageData(0, 0, 8, 8).data;
        let r = 0, g = 0, b = 0;
        for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i+1]; b += d[i+2]; }
        const px = d.length / 4;
        // Darken the color so it works as a background tint
        resolve(`rgb(${Math.floor(r/px*0.4)},${Math.floor(g/px*0.4)},${Math.floor(b/px*0.4)})`);
      } catch { resolve('#111318'); }
    };
    img.onerror = () => resolve('#111318');
    img.src = imgUrl + '&w=32&q=10';
  });
}
