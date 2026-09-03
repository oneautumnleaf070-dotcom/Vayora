import { useEffect, useRef, useState } from 'react';

/**
 * Scroll-triggered reveal, backed by IntersectionObserver (broad support,
 * event-driven — see ui-motion-designer skill, technique B). Prototyped in
 * scratch/01-motion-system/index.html section 6 before landing here.
 *
 * Respects prefers-reduced-motion: when the user has that on, the element is
 * marked visible immediately instead of waiting on scroll position.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(
  options: { threshold?: number; rootMargin?: string } = {}
) {
  const ref = useRef<T | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect(); // one-shot reveal, not a toggle
        }
      },
      { threshold: options.threshold ?? 0.15, rootMargin: options.rootMargin ?? '0px 0px -60px 0px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ref, isVisible };
}
