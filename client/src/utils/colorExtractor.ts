/**
 * Color utilities to extract dominant color from a thumbnail image
 * and derive theme-aware tinted backgrounds.
 */

/** Parse a hex string into { r, g, b } */
function parseHex(hex: string) {
  const c = hex.replace('#', '');
  return {
    r: parseInt(c.substring(0, 2), 16) || 0,
    g: parseInt(c.substring(2, 4), 16) || 0,
    b: parseInt(c.substring(4, 6), 16) || 0,
  };
}

/** Convert RGB to hex */
function toHex(r: number, g: number, b: number) {
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/**
 * Mix a hex color toward black.
 * @param amount 0 = pure black, 1 = original color
 */
export function darkenColor(hex: string, amount: number): string {
  const { r, g, b } = parseHex(hex);
  return toHex(
    Math.round(r * amount),
    Math.round(g * amount),
    Math.round(b * amount)
  );
}

/**
 * Mix a hex color toward white.
 * @param amount 0 = pure white, 1 = original color
 */
export function lightenColor(hex: string, amount: number): string {
  const { r, g, b } = parseHex(hex);
  return toHex(
    Math.round(r + (255 - r) * (1 - amount)),
    Math.round(g + (255 - g) * (1 - amount)),
    Math.round(b + (255 - b) * (1 - amount)),
  );
}

/**
 * Given a dominant color hex and theme mode, return a tinted background color.
 */
export function getThemedTint(dominantHex: string, mode: 'dark' | 'light'): string {
  if (!dominantHex) return mode === 'dark' ? '#0a0a0a' : '#eae8e0';
  if (mode === 'dark') {
    // Stronger tint: keep 45% of the color so it's clearly visible on dark backgrounds
    return darkenColor(dominantHex, 0.45);
  }
  // Light mode: mix toward a warm off-white at 55% color strength for a noticeable wash
  const { r, g, b } = parseHex(dominantHex);
  const baseR = 234, baseG = 232, baseB = 224; // warm off-white target
  const strength = 0.55; // how much of the dominant color to keep
  return toHex(
    Math.round(baseR + (r - baseR) * strength),
    Math.round(baseG + (g - baseG) * strength),
    Math.round(baseB + (b - baseB) * strength),
  );
}

/**
 * Extracts dominant color directly from an image URL using canvas.
 */
export function extractDominantColor(imageUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return reject(new Error('Canvas 2D context not available'));

      const sampleSize = 50;
      canvas.width = sampleSize;
      canvas.height = sampleSize;
      ctx.drawImage(img, 0, 0, sampleSize, sampleSize);

      try {
        const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize);
        const data = imageData.data;
        let r = 0, g = 0, b = 0;
        let count = 0;

        // Sample every 4th pixel (step by 16 bytes: 4 pixels * 4 channels) to be even faster
        for (let i = 0; i < data.length; i += 16) {
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          count++;
        }

        r = Math.floor(r / count);
        g = Math.floor(g / count);
        b = Math.floor(b / count);

        const hex = toHex(r, g, b);
        resolve(hex);
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = (err) => reject(err);
    img.src = imageUrl;
  });
}
