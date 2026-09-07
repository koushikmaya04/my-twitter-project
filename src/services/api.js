import Tweet from '../models/Tweet.js';

/**
 * API Service — Centralized data fetching layer.
 * 
 * WHY SEPARATE SERVICE: Keeps API logic out of UI components.
 * Components call these functions without knowing about URLs,
 * pagination parameters, or data transformation details.
 * 
 * Data Source: JSONPlaceholder Photos API
 * https://jsonplaceholder.typicode.com/photos
 */

const BASE_URL = 'https://jsonplaceholder.typicode.com';

/**
 * Fetch posts (photos) from JSONPlaceholder with pagination.
 * 
 * JSONPlaceholder supports _start and _limit query parameters:
 * - _start: offset (0-indexed)
 * - _limit: number of items per page
 * 
 * The API has 5000 photos total. We cap at 200 to keep things reasonable.
 * 
 * @param {number} page - Page number (1-indexed for external use)
 * @param {number} limit - Number of posts per page (default: 10)
 * @returns {Promise<{posts: Array, hasMore: boolean}>}
 */
export async function fetchPosts(page = 1, limit = 10) {
  const start = (page - 1) * limit;
  const maxPosts = 1000; // Cap total posts

  if (start >= maxPosts) {
    return { posts: [], hasMore: false };
  }

  const response = await fetch(
    `${BASE_URL}/photos?_start=${start}&_limit=${limit}`
  );

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  const photos = await response.json();

  // Transform raw API data into Tweet domain objects using the factory method
  const posts = photos.map((photo) => Tweet.fromAPIPhoto(photo).toPlainObject());
  const hasMore = start + limit < maxPosts && photos.length === limit;

  return { posts, hasMore };
}

/**
 * Simulate a like API request.
 * 
 * DEMONSTRATES: Optimistic UI setup — this simulates a real API call
 * that would persist the like on a server.
 * 
 * - 85% chance of success (simulates normal operation)
 * - 15% chance of failure (simulates network/server errors)
 * 
 * The failure rate is intentionally high enough to demonstrate
 * the rollback mechanism during a demo.
 * 
 * @param {number|string} tweetId - ID of the tweet to like
 * @returns {Promise<{success: boolean}>}
 */
export function simulateLikeRequest(tweetId) {
  return new Promise((resolve, reject) => {
    // Simulate network latency (200-800ms)
    const delay = Math.random() * 600 + 200;

    setTimeout(() => {
      // 85% success rate — high enough to feel real,
      // but 15% failure lets us demonstrate rollback
      if (Math.random() < 0.85) {
        resolve({ success: true, tweetId });
      } else {
        reject(new Error('Failed to like post. Please try again.'));
      }
    }, delay);
  });
}

/**
 * Simulate a comment API request.
 * 
 * @param {number|string} tweetId - ID of the tweet
 * @param {string} commentText - The comment content
 * @returns {Promise<{success: boolean}>}
 */
export function simulateCommentRequest(tweetId, commentText) {
  return new Promise((resolve, reject) => {
    const delay = Math.random() * 500 + 200;
    setTimeout(() => {
      if (Math.random() < 0.9) {
        resolve({ success: true, tweetId, commentText });
      } else {
        reject(new Error('Failed to post comment. Please try again.'));
      }
    }, delay);
  });
}

/**
 * Simulate a retweet API request.
 * 
 * @param {number|string} tweetId - ID of the tweet
 * @returns {Promise<{success: boolean}>}
 */
export function simulateRetweetRequest(tweetId) {
  return new Promise((resolve, reject) => {
    const delay = Math.random() * 500 + 200;
    setTimeout(() => {
      if (Math.random() < 0.9) {
        resolve({ success: true, tweetId });
      } else {
        reject(new Error('Failed to repost. Please try again.'));
      }
    }, delay);
  });
}
