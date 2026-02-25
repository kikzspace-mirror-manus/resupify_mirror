import { useEffect, useRef, useState } from "react";

export interface UseRevealOnScrollOptions {
  /**
   * IntersectionObserver threshold (0–1).
   * Default: 0.15 — trigger when 15% of element is visible.
   */
  threshold?: number;
  /**
   * Root margin passed to IntersectionObserver.
   * Default: "0px 0px -48px 0px" — trigger slightly before bottom of viewport.
   */
  rootMargin?: string;
  /**
   * Stagger delay in milliseconds per item index.
   * Default: 80ms — each subsequent item delays by 80ms.
   */
  staggerMs?: number;
  /**
   * Whether to trigger only once (default: true).
   * Set to false to re-animate on re-entry.
   */
  once?: boolean;
}

export interface UseRevealOnScrollReturn {
  /**
   * Attach this ref to the container element whose children should be revealed.
   */
  containerRef: React.RefObject<HTMLElement | null>;
  /**
   * Whether the container is currently visible (has been intersected).
   */
  isVisible: boolean;
  /**
   * Returns a className string for the nth child item.
   * Applies staggered fade-up transition.
   *
   * @param index - 0-based index of the item
   */
  getItemClass: (index: number) => string;
}

/**
 * useRevealOnScroll
 *
 * Lightweight IntersectionObserver hook for staggered fade-up reveal.
 * No external animation libraries required.
 *
 * Usage:
 * ```tsx
 * const { containerRef, getItemClass } = useRevealOnScroll();
 *
 * <div ref={containerRef} className="grid grid-cols-3 gap-6">
 *   {items.map((item, i) => (
 *     <div key={item.id} className={getItemClass(i)}>
 *       <FeatureCard {...item} />
 *     </div>
 *   ))}
 * </div>
 * ```
 */
export function useRevealOnScroll({
  threshold = 0.15,
  rootMargin = "0px 0px -48px 0px",
  staggerMs = 80,
  once = true,
}: UseRevealOnScrollOptions = {}): UseRevealOnScrollReturn {
  const containerRef = useRef<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      // SSR / unsupported: reveal immediately
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setIsVisible(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin, once]);

  function getItemClass(index: number): string {
    const delay = index * staggerMs;
    const base =
      "transition-all duration-500 ease-out";
    const hidden = "opacity-0 translate-y-6";
    const visible = "opacity-100 translate-y-0";
    return `${base} ${isVisible ? visible : hidden}`;
  }

  return { containerRef, isVisible, getItemClass };
}

export default useRevealOnScroll;
