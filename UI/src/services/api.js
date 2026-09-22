import Tweet from '../models/Tweet.js';

/**
 * API Service — Centralized data fetching layer.
 *
 * Components call these functions without knowing about
 * URLs, pagination parameters, or response transformation.
 */

const BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
  'http://localhost:3000';

export { BASE_URL };

/**
 * Resolve an image/media URL against the backend origin if it is relative.
 *
 * @param {string|null} url - Image path or full URL
 * @returns {string|null}
 */
export function resolveImageUrl(url) {
  if (!url) return null;

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  if (url.startsWith('/fixtures/')) {
    return url;
  }

  if (url.startsWith('/')) {
    return `${BASE_URL}${url}`;
  }

  return `${BASE_URL}/${url}`;
}

/**
 * Extract canonical request ID from response headers and JSON body.
 */
function extractRequestId(response, body) {
  const headerId =
    response?.headers?.get('x-request-id') ||
    response?.headers?.get('X-Request-ID') ||
    response?.headers?.get('X-Request-Id');
  return body?.requestId || headerId || null;
}

/**
 * Fetch posts from the NestJS social-feed backend.
 *
 * @param {string|null} cursor
 * @param {number} limit
 * @returns {Promise<{posts: Array, nextCursor: string|null, hasMore: boolean, requestId: string|null}>}
 */
export async function fetchPosts(cursor = null, limit = 10) {
  const params = new URLSearchParams();
  params.set('limit', String(limit));

  if (cursor) {
    params.set('cursor', cursor);
  }

  const response = await fetch(`${BASE_URL}/feed?${params.toString()}`);
  const headerRequestId =
    response.headers.get('x-request-id') ||
    response.headers.get('X-Request-ID') ||
    response.headers.get('X-Request-Id');

  if (!response.ok) {
    let message = `API Error: ${response.status}`;
    let requestId = headerRequestId;

    try {
      const errorBody = await response.json();
      requestId = errorBody?.requestId || headerRequestId;

      if (errorBody?.error?.message) {
        message = errorBody.error.message;
      }
    } catch {
      // Keep the generic HTTP error message.
    }

    const error = new Error(message);
    error.requestId = requestId;
    throw error;
  }

  const data = await response.json();
  const requestId = data.requestId || headerRequestId;

  const posts = data.items.map((post) =>
    Tweet.fromAPIPost(post).toPlainObject()
  );

  return {
    posts,
    nextCursor: data.nextCursor,
    hasMore: data.hasMore,
    requestId,
  };
}

/**
 * Fetch a single post by ID (for detail / lightbox view).
 *
 * @param {string} id
 * @returns {Promise<{post: Object, requestId: string|null}>}
 */
export async function fetchPostById(id) {
  const response = await fetch(`${BASE_URL}/posts/${id}`);
  const headerRequestId =
    response.headers.get('x-request-id') ||
    response.headers.get('X-Request-ID') ||
    response.headers.get('X-Request-Id');

  if (!response.ok) {
    let message = `API Error: ${response.status}`;
    let requestId = headerRequestId;

    try {
      const errorBody = await response.json();
      requestId = errorBody?.requestId || headerRequestId;
      if (errorBody?.error?.message) {
        message = errorBody.error.message;
      }
    } catch {
      // Keep generic message
    }

    const error = new Error(message);
    error.requestId = requestId;
    throw error;
  }

  const data = await response.json();
  const requestId = data.requestId || headerRequestId;

  return {
    post: data.item ?? data,
    requestId,
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

  const headerRequestId =
    response.headers.get('x-request-id') ||
    response.headers.get('X-Request-ID') ||
    response.headers.get('X-Request-Id');

  if (!response.ok) {
    let message = `API Error: ${response.status}`;
    let requestId = headerRequestId;

    try {
      const errorBody = await response.json();
      requestId = errorBody?.requestId || headerRequestId;
      if (errorBody?.error?.message) {
        message = errorBody.error.message;
      }
    } catch {
      // Keep generic message
    }

    const error = new Error(message);
    error.requestId = requestId;
    throw error;
  }

  const data = await response.json();
  return {
    ...data,
    requestId: data.requestId || headerRequestId,
  };
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

  const headerRequestId =
    response.headers.get('x-request-id') ||
    response.headers.get('X-Request-ID') ||
    response.headers.get('X-Request-Id');

  if (!response.ok) {
    let message = `API Error: ${response.status}`;
    let requestId = headerRequestId;

    try {
      const errorBody = await response.json();
      requestId = errorBody?.requestId || headerRequestId;
      if (errorBody?.error?.message) {
        message = errorBody.error.message;
      }
    } catch {
      // Keep generic message
    }

    const error = new Error(message);
    error.requestId = requestId;
    throw error;
  }

  const data = await response.json();
  const requestId = data.requestId || headerRequestId;
  const item = data.item ?? data;
  return {
    ...item,
    requestId,
  };
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

/**
 * Search posts via the backend search API.
 * Exactly one request is sent per submission.
 * Cancel any pending request when a new search is initiated.
 */
let searchAbortController = null;

export async function searchPosts(query, cursor = null, limit = 10) {
  const trimmed = typeof query === 'string' ? query.trim() : '';

  // Abort any prior in-flight search request
  if (searchAbortController) {
    searchAbortController.abort();
  }
  searchAbortController = new AbortController();

  const params = new URLSearchParams();
  params.set('q', trimmed);
  params.set('limit', String(limit));

  if (cursor) {
    params.set('cursor', cursor);
  }

  const response = await fetch(
    `${BASE_URL}/search/posts?${params.toString()}`,
    { signal: searchAbortController.signal }
  );

  const headerRequestId =
    response.headers.get('x-request-id') ||
    response.headers.get('X-Request-ID') ||
    response.headers.get('X-Request-Id');

  if (!response.ok) {
    let message = `API Error: ${response.status}`;
    let requestId = headerRequestId;

    try {
      const errorBody = await response.json();
      requestId = errorBody?.requestId || headerRequestId;
      if (errorBody?.error?.message) {
        message = errorBody.error.message;
      }
    } catch {
      // Keep generic message
    }

    const error = new Error(message);
    error.requestId = requestId;
    throw error;
  }

  const data = await response.json();
  const requestId = data.requestId || headerRequestId;

  const posts = (data.items || []).map((post) =>
    Tweet.fromAPIPost(post).toPlainObject()
  );

  return {
    posts,
    nextCursor: data.nextCursor,
    hasMore: data.hasMore,
    requestId,
  };
}