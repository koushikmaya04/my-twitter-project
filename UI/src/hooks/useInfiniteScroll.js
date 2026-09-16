import { useEffect, useRef, useCallback } from 'react';

/**
 * useInfiniteScroll — Custom hook for infinite scrolling using IntersectionObserver.
 * 
 * DEMONSTRATES: IntersectionObserver API for infinite scroll pagination.
 * 
 * HOW IT WORKS:
 * 1. A "sentinel" div is placed at the bottom of the feed
 * 2. IntersectionObserver watches this sentinel
 * 3. When the sentinel enters (or approaches) the viewport, we fetch the next page
 * 4. A loading flag prevents duplicate fetches if the observer fires multiple times
 * 
 * WHY IntersectionObserver (instead of scroll events):
 * - More performant: runs off the main thread
 * - No need for manual scroll position calculations
 * - Built-in threshold and margin support
 * - Cleaner API with automatic cleanup
 * 
 * @param {Function} fetchMore - Async function to call when more data is needed
 * @param {boolean} hasMore - Whether there are more pages to load
 * @param {boolean} isLoading - Whether a fetch is currently in progress
 * @returns {{ sentinelRef: React.RefObject }} Ref to attach to the sentinel element
 */
export function useInfiniteScroll(fetchMore, hasMore, isLoading) {
  const sentinelRef = useRef(null);
  // Use a ref (not state) for the loading flag to avoid re-renders
  // and ensure the observer callback always has the latest value
  const isLoadingRef = useRef(isLoading);

  // Keep the ref in sync with the prop
  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  const handleIntersection = useCallback(
    (entries) => {
      const [entry] = entries;

      /**
       * Only fetch if ALL conditions are met:
       * 1. entry.isIntersecting — sentinel is visible in the viewport
       * 2. hasMore — there are more pages available
       * 3. !isLoadingRef.current — we're not already fetching
       * 
       * Condition 3 is critical: IntersectionObserver may fire multiple times
       * (e.g., during rapid scrolling), and without this guard we'd make
       * duplicate API calls for the same page.
       */
      if (entry.isIntersecting && hasMore && !isLoadingRef.current) {
        fetchMore();
      }
    },
    [fetchMore, hasMore]
  );

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    /**
     * IntersectionObserver Configuration:
     * 
     * root: null
     *   → null means the browser VIEWPORT is used as the root/container.
     *   → If we set a specific element, intersection would be calculated
     *     relative to that element instead of the viewport.
     *   → We use null because we want to detect when the sentinel
     *     scrolls into the visible window.
     * 
     * rootMargin: '0px 0px 200px 0px'
     *   → Extends the root's bounding box by 200px at the BOTTOM.
     *   → This means the observer fires 200px BEFORE the sentinel
     *     actually enters the viewport.
     *   → This gives us a head start on fetching, creating a smoother
     *     infinite scroll experience (data loads before the user
     *     reaches the bottom).
     *   → Format: 'top right bottom left' (like CSS margin).
     * 
     * threshold: 0.1
     *   → The observer callback fires when 10% of the sentinel
     *     is visible (intersecting with the root + margin).
     *   → 0.0 would fire as soon as even 1 pixel is visible.
     *   → 1.0 would require the entire sentinel to be visible.
     *   → 0.1 is a good balance: triggers early enough for smooth
     *     loading but avoids false triggers from sub-pixel rendering.
     */
    const observer = new IntersectionObserver(handleIntersection, {
      root: null,
      rootMargin: '0px 0px 200px 0px',
      threshold: 0.1,
    });

    observer.observe(sentinel);

    // Cleanup: disconnect observer when component unmounts or deps change
    return () => observer.disconnect();
  }, [handleIntersection]);

  return { sentinelRef };
}

export default useInfiniteScroll;
