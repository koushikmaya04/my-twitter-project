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
    this.loaded = new Set();  // URLs that have been loaded
    this.failed = new Set();  // URLs that failed
    
    // Map of URL -> Array of { onLoad, onError }
    // BUG FIX: Track ALL callbacks for a URL being loaded so multiple components
    // (or React Strict Mode remounts) all get notified when it finishes!
    this.loadingCallbacks = new Map();
  }

  enqueue(url, onLoad, onError) {
    if (this.loaded.has(url)) {
      onLoad(url);
      return;
    }
    if (this.failed.has(url)) {
      onError(url);
      return;
    }

    if (this.loadingCallbacks.has(url)) {
      // Already loading — just add our callbacks to the list!
      this.loadingCallbacks.get(url).push({ onLoad, onError });
      return;
    }

    // New URL to load
    this.loadingCallbacks.set(url, [{ onLoad, onError }]);
    this.queue.push(url);
    this._processQueue();
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
      callbacks.forEach(cb => cb.onLoad(url));
      this._processQueue();
    };

    img.onerror = () => {
      this.activeCount--;
      this.failed.add(url);
      const callbacks = this.loadingCallbacks.get(url) || [];
      this.loadingCallbacks.delete(url);
      callbacks.forEach(cb => cb.onError(url));
      this._processQueue();
    };

    img.src = url;
  }

  /**
   * Load multiple images using our custom Promise.all.
   * Demonstrates integration of customPromiseAll with the queue.
   * 
   * @param {string[]} urls - Array of image URLs to load
   * @returns {Promise<string[]>} Promise resolving with loaded URLs
   */
  loadBatch(urls) {
    const promises = urls.map(
      (url) =>
        new Promise((resolve, reject) => {
          this.enqueue(url, resolve, reject);
        })
    );
    return customPromiseAll(promises);
  }

  /**
   * Check if a URL has been loaded.
   */
  isLoaded(url) {
    return this.loaded.has(url);
  }

  /**
   * Check if a URL failed to load.
   */
  hasFailed(url) {
    return this.failed.has(url);
  }

  /**
   * Reset the queue (for cleanup).
   */
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
 * - Custom Promise.all integration
 * 
 * HOW IT WORKS:
 * 1. Each image element gets an IntersectionObserver
 * 2. When the image approaches the viewport, it's added to the loading queue
 * 3. The queue loads max 3 images at a time
 * 4. When one finishes, the next in queue starts
 * 
 * @param {string} thumbnailUrl - Low-res placeholder URL (shown immediately)
 * @param {string} fullUrl - Full-res image URL (loaded lazily)
 * @returns {{ imgRef, src, isLoaded }}
 */
export function useLazyImages(thumbnailUrl, fullUrl) {
  const imgRef = useRef(null);
  const [src, setSrc] = useState(thumbnailUrl);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const observerRef = useRef(null);

  useEffect(() => {
    const imgElement = imgRef.current;
    if (!imgElement || !fullUrl) return;

    // If already loaded by the queue, set immediately
    if (imageQueue.isLoaded(fullUrl)) {
      setSrc(fullUrl);
      setIsLoaded(true);
      return;
    }

    // Bug Fix #12: If previously failed, don't retry indefinitely
    if (imageQueue.hasFailed(fullUrl)) {
      setHasError(true);
      return;
    }

    /**
     * IntersectionObserver for Lazy Images
     * 
     * root: null → viewport
     * rootMargin: '50px' → start loading 50px before image enters viewport
     * threshold: 0.01 → trigger as soon as even a tiny bit is visible
     */
    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Image is approaching viewport — load it using our custom Promise.all batcher
          // BUG 1 FIX: Ensure we use the intended batching/promise.all implementation
          imageQueue.loadBatch([fullUrl])
            .then(([loadedUrl]) => {
              if (loadedUrl) {
                setSrc(loadedUrl);
                setIsLoaded(true);
              }
            })
            .catch((failedUrl) => {
              console.warn(`Failed to load image: ${failedUrl}`);
              // If the full image fails, we still want to remove the skeleton 
              // and just leave the thumbnail visible.
              setIsLoaded(true); 
              setHasError(true);
            });
          
          // Stop observing once we've triggered the load
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
      observerRef.current?.disconnect();
    };
  }, [fullUrl, thumbnailUrl]);

  return { imgRef, src, isLoaded, hasError };
}

export { imageQueue };
export default useLazyImages;
