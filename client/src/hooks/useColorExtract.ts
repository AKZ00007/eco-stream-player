import { useState, useEffect } from 'react';
import { extractDominantColor } from '../utils/colorExtractor';

// Cache color extractions to avoid redundant canvas processing
const colorCache: Record<string, string> = {};

export function useColorExtract(thumbnailUrl?: string, fallbackColor = '#0f0f0f') {
  const [dominantColor, setDominantColor] = useState<string>(
    thumbnailUrl && colorCache[thumbnailUrl] ? colorCache[thumbnailUrl] : fallbackColor
  );

  useEffect(() => {
    if (!thumbnailUrl) return;

    if (colorCache[thumbnailUrl]) {
      setDominantColor(colorCache[thumbnailUrl]);
      return;
    }

    const extractTask = () => {
      extractDominantColor(thumbnailUrl)
        .then((color) => {
          colorCache[thumbnailUrl] = color;
          setDominantColor(color);
        })
        .catch(() => {
          colorCache[thumbnailUrl] = fallbackColor;
          setDominantColor(fallbackColor);
        });
    };

    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(extractTask, { timeout: 2000 });
    } else {
      setTimeout(extractTask, 100);
    }
  }, [thumbnailUrl, fallbackColor]);

  return dominantColor;
}
