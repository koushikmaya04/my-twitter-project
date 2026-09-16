import Tweet from '../models/Tweet.js';

/**
 * API Service — Centralized data fetching layer.
 *
 * Components call these functions without knowing about
 * URLs, pagination parameters, or response transformation.
 */

const BASE_URL = 'http://localhost:3000';

/**
 * Fetch posts from the NestJS social-feed backend.
 *
 * Backend pagination is cursor-based:
 * - cursor: opaque cursor returned by the previous response
 * - limit: number of posts requested
 *
 * The first request does not send a cursor.
 *
 * @param {string|null} cursor
 * @param {number} limit
 * @returns {Promise<{posts: Array, nextCursor: string|null, hasMore: boolean}>}
 */
export async function fetchPosts(cursor = null, limit = 10) {
  const params = new URLSearchParams();

  params.set('limit', String(limit));

  if (cursor) {
    params.set('cursor', cursor);
  }

  const response = await fetch(
    `${BASE_URL}/feed?${params.toString()}`
  );

  if (!response.ok) {
    let message = `API Error: ${response.status}`;

    try {
      const errorBody = await response.json();

      if (errorBody?.error?.message) {
        message = errorBody.error.message;
      }
    } catch {
      // Keep the generic HTTP error message.
    }

    throw new Error(message);
  }

  const data = await response.json();

  const posts = data.items.map((post) =>
    Tweet.fromAPIPost(post).toPlainObject()
  );

  return {
    posts,
    nextCursor: data.nextCursor,
    hasMore: data.hasMore,
  };
}

/**
 * Simulate a like API request.
 *
 * These action methods remain unchanged for now.
 */
export function simulateLikeRequest(tweetId) {
  return new Promise((resolve, reject) => {
    const delay = Math.random() * 600 + 200;

    setTimeout(() => {
      if (Math.random() < 0.85) {
        resolve({ success: true, tweetId });
      } else {
        reject(new Error('Failed to like post. Please try again.'));
      }
    }, delay);
  });
}

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