import { useEffect, useState, useRef } from 'react';

export function useIntersectionObserver(options: IntersectionObserverInit = { threshold: 0.1, rootMargin: '0px' }, delayMs = 600) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsIntersecting(true);
        setTimeout(() => setIsVisible(true), delayMs);
        
        if (ref.current) observer.unobserve(ref.current);
      }
    }, options);

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) observer.unobserve(ref.current);
    };
  }, [options.threshold, options.rootMargin, delayMs]);

  return { ref, isVisible, isIntersecting };
}
