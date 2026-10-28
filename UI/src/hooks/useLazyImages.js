import { useEffect, useRef, useCallback, useState } from 'react';
import { customPromiseAll } from '../utils/promiseAll.js';

/**
 * Image Loading Concurrency Queue
 *
 * DEMONSTRATES: Custom concurrency control for resource loading.
 *
 * WHY CONCURRENCY LIMIT: Loading all images simultaneously would:
 * - Overwhelm the browser's network connections
 * - Cause memory spikes
 * - Make ALL images load slowly instead of some loading quickly
 *
 * By limiting to 3 concurrent loads, we ensure:
 * - Visible images load fast
 * - Network bandwidth is used efficiently
 * - The browser remains responsive
 *
 * CONCURRENCY = 3 (maximum simultaneous image loads)
 */
const MAX_CONCURRENT = 3;

class ImageLoadQueue {
  constructor() {
    this.queue = [];          // Pending image load tasks
    this.activeCount = 0;     // Currently loading images
    this.loaded = new Set();  // URLs that have been loaded successfully
    this.failed = new Set();  // URLs that failed to load

    /**
     * Map of URL → Array of { id, onLoad, onError }
     *
     * LIFECYCLE FIX (Fix #5): Each callback entry carries a stable `id`
     * (a Symbol unique to each useLazyImages hook instance). When a
     * TweetCard unmounts, its hook calls removeCallback(url, id) to
     * deregister just its own callbacks without canceling the shared
     * image request — other components waiting for the same URL are unaffected.
     */
    this.loadingCallbacks = new Map(); // url → [{ id, onLoad, onError }]
  }

  /**
   * Enqueue a URL for loading and register callbacks with a component-unique ID.
   *
   * @param {string}   url        - Image URL to load
   * @param {Function} onLoad     - Called with url when the image loads
   * @param {Function} onError    - Called with url when the image fails
   * @param {symbol}   callbackId - Unique ID for this component's callback registration
   */
  enqueue(url, onLoad, onError, callbackId) {
    // Already successfully loaded — notify immediately
    if (this.loaded.has(url)) {
      onLoad(url);
      return;
    }
    // Already permanently failed — notify immediately
    if (this.failed.has(url)) {
      onError(url);
      return;
    }

    if (this.loadingCallbacks.has(url)) {
      // Another component is already loading this URL — just add our callbacks.
      // The actual image request is shared; we get notified when it finishes.
      this.loadingCallbacks.get(url).push({ id: callbackId, onLoad, onError });
      return;
    }

    // Brand-new URL — register callbacks and add to the queue
    this.loadingCallbacks.set(url, [{ id: callbackId, onLoad, onError }]);
    this.queue.push(url);
    this._processQueue();
  }

  /**
   * Remove a specific component's callbacks for a URL.
   *
   * LIFECYCLE FIX: Called on cleanup (unmount / dep change).
   * - Does NOT cancel the actual image request.
   * - Does NOT affect other components waiting for the same URL.
   * - Prevents setState calls on unmounted components.
   *
   * @param {string} url        - The URL whose callback list to clean up
   * @param {symbol} callbackId - The ID of the callback entry to remove
   */
  removeCallback(url, callbackId) {
    if (!this.loadingCallbacks.has(url)) return;

    const remaining = this.loadingCallbacks
      .get(url)
      .filter((cb) => cb.id !== callbackId);

    if (remaining.length === 0) {
      // No more waiting components — remove the entry entirely.
      // The image download continues in the background; if a new component
      // later requests the same URL, it will see it in this.loaded / this.failed.
      this.loadingCallbacks.delete(url);
    } else {
      this.loadingCallbacks.set(url, remaining);
    }
  }

  _processQueue() {
    while (this.activeCount < MAX_CONCURRENT && this.queue.length > 0) {
      const url = this.queue.shift();
      this.activeCount++;
      this._loadImage(url);
    }
  }

  _loadImage(url) {
    const img = new Image();

    img.onload = () => {
      this.activeCount--;
      this.loaded.add(url);
      const callbacks = this.loadingCallbacks.get(url) || [];
      this.loadingCallbacks.delete(url);
      callbacks.forEach((cb) => cb.onLoad(url));
      this._processQueue();
    };

    img.onerror = () => {
      this.activeCount--;
      this.failed.add(url);
      const callbacks = this.loadingCallbacks.get(url) || [];
      this.loadingCallbacks.delete(url);
      callbacks.forEach((cb) => cb.onError(url));
      this._processQueue();
    };

    img.src = url;
  }

  /**
   * Load a batch of image URLs through the concurrency queue, resolving
   * all of them with our custom Promise.all implementation.
   *
   * DEMONSTRATES customPromiseAll with MULTIPLE promises:
   * - Each URL becomes an independent Promise queued through the concurrency system.
   * - customPromiseAll waits for ALL to settle, preserves input order, and
   *   rejects immediately if ANY promise rejects (hand-rolled to demonstrate
   *   the mechanics of native Promise.all).
   *
   * Called with [thumbnailUrl, fullUrl] so the batch always contains 2 promises,
   * making the ordering guarantee and early-rejection behaviour observable.
   *
   * @param {string[]} urls        - Array of image URLs to load
   * @param {symbol}   callbackId  - Component callback ID for lifecycle tracking
   * @returns {Promise<string[]>}  - Resolves with array of loaded URLs (in input order)
   */
  loadBatch(urls, callbackId) {
    const promises = urls.map(
      (url) =>
        new Promise((resolve, reject) => {
          this.enqueue(url, resolve, reject, callbackId);
        })
    );

    // customPromiseAll receives multiple promises — it waits for ALL,
    // preserves order, and rejects on first failure.
    return customPromiseAll(promises);
  }

  /** Check if a URL has been loaded. */
  isLoaded(url) {
    return this.loaded.has(url);
  }

  /** Check if a URL failed to load. */
  hasFailed(url) {
    return this.failed.has(url);
  }

  /** Reset the queue (for cleanup). */
  reset() {
    this.queue = [];
    this.activeCount = 0;
    this.loadingCallbacks.clear();
    this.failed.clear();
  }
}

// Singleton queue shared across all useLazyImages instances
const imageQueue = new ImageLoadQueue();

/**
 * useLazyImages — Custom hook for lazy-loading images with IntersectionObserver.
 *
 * DEMONSTRATES:
 * - IntersectionObserver for lazy loading (separate from infinite scroll)
 * - Concurrency Queue (max 3 simultaneous loads)
 * - Custom Promise.all with a real multi-promise batch
 *
 * HOW IT WORKS:
 * 1. Each image element gets an IntersectionObserver.
 * 2. When the image approaches the viewport, BOTH thumbnailUrl and fullUrl are
 *    submitted as a 2-promise batch through the concurrency queue.
 * 3. customPromiseAll waits for both; the hook uses the full-res result for display.
 * 4. If the TweetCard unmounts while loading, cleanup calls removeCallback() to
 *    deregister this component's callbacks without canceling the shared download.
 *
 * @param {string} thumbnailUrl - Low-res URL (batched first)
 * @param {string} fullUrl      - Full-res URL (batched second; used for display)
 * @returns {{ imgRef, src, isLoaded, hasError }}
 */
export function useLazyImages(thumbnailUrl, fullUrl) {
  const imgRef = useRef(null);
  const [src, setSrc] = useState(thumbnailUrl);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const observerRef = useRef(null);

  /**
   * Stable, component-unique Symbol used to identify this instance's callbacks
   * inside the shared queue. Created once on mount and never changes.
   * On unmount, removeCallback(url, callbackId) finds and removes exactly
   * this component's entries without touching other components' entries.
   * React StrictMode safe: each real mount gets its own distinct Symbol.
   */
  const callbackIdRef = useRef(Symbol('useLazyImages'));

  useEffect(() => {
    const imgElement = imgRef.current;
    if (!imgElement || !fullUrl) return;

    const callbackId = callbackIdRef.current;

    // If the full image was already loaded by a previous render or another
    // component that shared the same URL, apply the result immediately.
    if (imageQueue.isLoaded(fullUrl)) {
      setSrc(fullUrl);
      setIsLoaded(true);
      return;
    }

    // If the image previously failed, don't retry indefinitely.
    if (imageQueue.hasFailed(fullUrl)) {
      setHasError(true);
      return;
    }

    /**
     * IntersectionObserver for Lazy Images
     *
     * root: null       → viewport
     * rootMargin: 50px → start loading 50px before image enters viewport
     * threshold: 0.01  → trigger as soon as even a tiny bit is visible
     */
    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Build the URL batch with both thumbnail and full-res URLs.
          // Both are fed into the concurrency queue as separate promises.
          const urlBatch = [thumbnailUrl, fullUrl].filter(Boolean);

          /**
           * CUSTOM PROMISE.ALL DEMONSTRATION:
           * loadBatch submits all URLs as independent promises through the
           * concurrency-limited queue, then feeds them ALL to customPromiseAll.
           * Here urlBatch has 2 items, so customPromiseAll receives 2 promises —
           * its order-preservation and early-rejection behaviour are properly exercised.
           */
          imageQueue.loadBatch(urlBatch, callbackId)
            .then((loadedUrls) => {
              // loadedUrls[0] = thumbnailUrl result
              // loadedUrls[1] = fullUrl result  ← use this for display
              const finalUrl = loadedUrls[loadedUrls.length - 1];
              if (finalUrl) {
                setSrc(finalUrl);
                setIsLoaded(true);
              }
            })
            .catch(() => {
              // customPromiseAll rejects on first failure (thumbnail OR full).
              // Clear the skeleton to avoid it spinning forever.
              console.warn(`[useLazyImages] Batch failed for: ${fullUrl}`);
              setIsLoaded(true);
              setHasError(true);
            });

          // Stop observing once the load has been triggered
          observerRef.current?.unobserve(imgElement);
        }
      },
      {
        root: null,
        rootMargin: '50px',
        threshold: 0.01,
      }
    );

    observerRef.current.observe(imgElement);

    return () => {
      // Disconnect the observer so it stops firing after unmount / dep change
      observerRef.current?.disconnect();

      /**
       * LIFECYCLE FIX (Fix #5):
       * Remove this component's callbacks from the queue for both URLs.
       * - The actual image download is NOT cancelled.
       * - Other components waiting on the same URL are completely unaffected.
       * - Prevents setState calls on this (now unmounted) component.
       * - React StrictMode safe: each mount gets a fresh Symbol; the first
       *   mount's cleanup removes only the first Symbol's callbacks and not
       *   the second (real) mount's callbacks.
       */
      if (thumbnailUrl) imageQueue.removeCallback(thumbnailUrl, callbackId);
      if (fullUrl) imageQueue.removeCallback(fullUrl, callbackId);
    };
  }, [fullUrl, thumbnailUrl]);

  return { imgRef, src, isLoaded, hasError };
}

export { imageQueue };
export default useLazyImages;

