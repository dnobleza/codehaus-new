import { useEffect, useState } from 'react';

/**
 * Tracks whether the page has scrolled past `threshold` pixels. Used by the
 * marketing `Navbar` to switch from a transparent top-of-page treatment to
 * its frosted/solid scrolled treatment.
 *
 * Cheap by construction: the scroll handler only ever computes a boolean and
 * calls `setState` when that boolean actually flips, so re-renders happen at
 * most twice per scroll session (crossing the threshold down, then back up)
 * rather than once per pixel. The handler itself is also rAF-throttled so a
 * fast scroll never queues more than one read per frame.
 */
export function useScrolled(threshold = 8) {
  const [scrolled, setScrolled] = useState(() => window.scrollY > threshold);

  useEffect(() => {
    let ticking = false;

    function checkScroll() {
      ticking = false;
      setScrolled((prev) => {
        const next = window.scrollY > threshold;
        return prev === next ? prev : next;
      });
    }

    function handleScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(checkScroll);
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Covers the case where the page is restored mid-scroll (bfcache, hash
    // navigation) so the initial render isn't stuck showing the wrong state.
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold]);

  return scrolled;
}
