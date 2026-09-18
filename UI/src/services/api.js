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
 * Persisted like API request.
 * Sends desiredState to the backend and updates PostgreSQL.
 */
export async function simulateLikeRequest(tweetId, desiredState = true) {
  const response = await fetch(`${BASE_URL}/posts/${tweetId}/like`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ desiredState }),
  });

  if (!response.ok) {
    let message = `API Error: ${response.status}`;

    try {
      const errorBody = await response.json();
      if (errorBody?.error?.message) {
        message = errorBody.error.message;
      }
    } catch {
      // Keep generic message
    }

    throw new Error(message);
  }

  return response.json();
}

/**
 * Create a new post (original, reply, or repost) in PostgreSQL.
 */
export async function createPostRequest({
  kind = 'original',
  text = null,
  replyToId = null,
  repostOfId = null,
}) {
  const response = await fetch(`${BASE_URL}/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ kind, text, replyToId, repostOfId }),
  });

  if (!response.ok) {
    let message = `API Error: ${response.status}`;

    try {
      const errorBody = await response.json();
      if (errorBody?.error?.message) {
        message = errorBody.error.message;
      }
    } catch {
      // Keep generic message
    }

    throw new Error(message);
  }

  const data = await response.json();
  return data.item ?? data;
}

export async function simulateCommentRequest(tweetId, commentText) {
  return createPostRequest({
    kind: 'reply',
    replyToId: tweetId,
    text: commentText,
  });
}

export async function simulateRetweetRequest(tweetId) {
  return createPostRequest({
    kind: 'repost',
    repostOfId: tweetId,
  });
}