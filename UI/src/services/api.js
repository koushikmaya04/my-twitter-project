import Tweet from '../models/Tweet.js';
import { DEFAULT_AVATAR } from '../utils/constants.js';

export { DEFAULT_AVATAR };

/**
 * API Service — Centralized data fetching layer for JS-P0-01 through JS-P0-07.
 *
 * Uses cookie-based authentication via credentials: 'include'.
 * Extracts and surfaces canonical X-Request-ID headers and error messages.
 */

const BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
  (typeof process !== 'undefined' && process.env?.VITE_API_BASE_URL) ||
  (typeof window === 'undefined' ? 'http://localhost:3000' : '');

export { BASE_URL };

/**
 * Resolve an image/media URL against the backend origin if relative.
 *
 * @param {string|null} url - Image path or full URL
 * @returns {string|null}
 */
export function resolveImageUrl(url) {
  if (!url) return null;

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  if (BASE_URL) {
    if (url.startsWith('/')) {
      return `${BASE_URL}${url}`;
    }
    return `${BASE_URL}/${url}`;
  }

  return url;
}

let nodeCookieJar = '';

/**
 * Helper to execute fetch requests with credentials, error handling, and request-ID tracking.
 */
async function apiFetch(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    ...options.headers,
  };

  // When running in Node.js test environment, forward cookies across requests
  if (typeof window === 'undefined' && nodeCookieJar) {
    headers['Cookie'] = nodeCookieJar;
  }

  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Always send and receive HTTP-only session cookies in browser
  });

  // Maintain in-memory cookies exclusively in Node.js test environment
  if (typeof window === 'undefined') {
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      const match = setCookie.match(/session=([^;]+)/);
      if (match) {
        nodeCookieJar = `session=${match[1]}`;
      } else if (setCookie.includes('session=;') || setCookie.includes('Max-Age=0')) {
        nodeCookieJar = '';
      }
    }
  }

  const headerRequestId =
    response.headers.get('x-request-id') ||
    response.headers.get('X-Request-ID') ||
    response.headers.get('X-Request-Id');

  let body = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      body = await response.json();
    } catch {
      body = null;
    }
  }

  const requestId = body?.requestId || headerRequestId || null;

  if (!response.ok) {
    let message = `API Error: ${response.status}`;
    if (body?.error?.message) {
      message = body.error.message;
    } else if (body?.message) {
      message = Array.isArray(body.message) ? body.message.join(', ') : body.message;
    }

    const error = new Error(message);
    error.status = response.status;
    error.code = body?.error?.code || 'API_ERROR';
    error.requestId = requestId;
    error.details = body?.error?.details || [];
    throw error;
  }

  return {
    data: body,
    requestId,
  };
}

/* ─────────────────────────────────────────────────────────────
 * P0-01: Authentication & Session Identity
 * ───────────────────────────────────────────────────────────── */

/**
 * Register a new user account.
 * Contract: POST /auth/register
 * Body: { handle, displayName, password }
 */
export async function registerUser({ handle, displayName, password }) {
  const { data, requestId } = await apiFetch('/auth/register', {
    method: 'POST',
    body: { handle, displayName, password },
  });

  return {
    user: data.item ?? data,
    requestId,
  };
}

/**
 * Log in with handle and password.
 * Backend sets an HTTP-only 'session' cookie.
 * Contract: POST /auth/login
 * Body: { handle, password }
 */
export async function loginUser({ handle, password }) {
  const { data, requestId } = await apiFetch('/auth/login', {
    method: 'POST',
    body: { handle, password },
  });

  return {
    user: data.item ?? data,
    requestId,
  };
}

/**
 * Fetch authenticated user via session cookie (session restoration).
 * Contract: GET /auth/me
 */
export async function fetchCurrentUser() {
  const { data, requestId } = await apiFetch('/auth/me', {
    method: 'GET',
  });

  return {
    user: data.item ?? data,
    requestId,
  };
}

/**
 * Log out current session. Backend revokes session and clears cookie.
 * Contract: POST /auth/logout
 */
export async function logoutUser() {
  const { data, requestId } = await apiFetch('/auth/logout', {
    method: 'POST',
  });

  return {
    result: data.item ?? data,
    requestId,
  };
}

/**
 * Permanently deactivate account. Revokes all sessions and clears cookie.
 * Contract: POST /auth/deactivate
 */
export async function deactivateAccount() {
  const { data, requestId } = await apiFetch('/auth/deactivate', {
    method: 'POST',
  });

  return {
    result: data.item ?? data,
    requestId,
  };
}

/* ─────────────────────────────────────────────────────────────
 * P0-04: Feeds (Public & Personalized Home Feed)
 * ───────────────────────────────────────────────────────────── */

/**
 * Fetch public feed of original posts.
 * Contract: GET /feed?limit=10&cursor=...
 */
export async function fetchPosts(cursor = null, limit = 10) {
  const params = new URLSearchParams();
  params.set('limit', String(limit));
  if (cursor) {
    params.set('cursor', cursor);
  }

  const { data, requestId } = await apiFetch(`/feed?${params.toString()}`);
  const posts = (data.items || []).map((post) =>
    Tweet.fromAPIPost(post).toPlainObject()
  );

  return {
    posts,
    nextCursor: data.nextCursor ?? null,
    hasMore: Boolean(data.hasMore),
    requestId,
  };
}

/**
 * Fetch personalized home feed (authored by viewer + accounts followed).
 * Contract: GET /feed/home?limit=10&cursor=...
 */
export async function fetchHomeFeed(cursor = null, limit = 10) {
  const params = new URLSearchParams();
  params.set('limit', String(limit));
  if (cursor) {
    params.set('cursor', cursor);
  }

  const { data, requestId } = await apiFetch(`/feed/home?${params.toString()}`);
  const posts = (data.items || []).map((post) =>
    Tweet.fromAPIPost(post).toPlainObject()
  );

  return {
    posts,
    nextCursor: data.nextCursor ?? null,
    hasMore: Boolean(data.hasMore),
    requestId,
  };
}

/* ─────────────────────────────────────────────────────────────
 * P0-05: Post Content Lifecycle (Create, Detail, Reply, Edit, Delete, Like)
 * ───────────────────────────────────────────────────────────── */

/**
 * Fetch a single post by ID.
 * Contract: GET /posts/:id
 */
export async function fetchPostById(id) {
  const { data, requestId } = await apiFetch(`/posts/${id}`);
  return {
    post: data.item ?? data,
    requestId,
  };
}

/**
 * Create a new post (original, reply, or repost).
 * Contract: POST /posts
 */
export async function createPostRequest({
  kind = 'original',
  text = null,
  replyToId = null,
  repostOfId = null,
}) {
  const body = { kind };
  if (text !== null && text !== undefined) body.text = text;
  if (replyToId) body.replyToId = replyToId;
  if (repostOfId) body.repostOfId = repostOfId;

  const { data, requestId } = await apiFetch('/posts', {
    method: 'POST',
    body,
  });

  const item = data.item ?? data;
  return {
    ...item,
    requestId,
  };
}

/**
 * Edit post text within the 30-minute window with optimistic concurrency.
 * Contract: PATCH /feed/posts/:id
 * Body: { text, expectedVersion }
 */
export async function updatePostRequest(postId, text, expectedVersion) {
  const { data, requestId } = await apiFetch(`/feed/posts/${postId}`, {
    method: 'PATCH',
    body: {
      text,
      expectedVersion: Number(expectedVersion),
    },
  });

  return {
    post: data.item ?? data,
    requestId,
  };
}

/**
 * Soft-delete a post authored by the viewer.
 * Contract: DELETE /feed/posts/:id
 */
export async function deletePostRequest(postId) {
  const { requestId } = await apiFetch(`/feed/posts/${postId}`, {
    method: 'DELETE',
  });

  return {
    deleted: true,
    requestId,
  };
}

/**
 * List replies for a post.
 * Contract: GET /posts/:id/replies
 */
export async function fetchReplies(postId, cursor = null, limit = 10) {
  const params = new URLSearchParams();
  params.set('limit', String(limit));
  if (cursor) {
    params.set('cursor', cursor);
  }

  const { data, requestId } = await apiFetch(`/posts/${postId}/replies?${params.toString()}`);
  const replies = (data.items || []).map((reply) =>
    Tweet.fromAPIPost(reply).toPlainObject()
  );

  return {
    replies,
    nextCursor: data.nextCursor ?? null,
    hasMore: Boolean(data.hasMore),
    requestId,
  };
}

/**
 * Persisted like request (PUT /posts/:id/like).
 */
export async function simulateLikeRequest(tweetId, desiredState = true) {
  const { data, requestId } = await apiFetch(`/posts/${tweetId}/like`, {
    method: 'PUT',
    body: { desiredState },
  });

  return {
    ...data,
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

/* ─────────────────────────────────────────────────────────────
 * P0-02 & P0-03: Profiles, Ownership, and Follows
 * ───────────────────────────────────────────────────────────── */

/**
 * Get user profile by user UUID.
 * Contract: GET /users/:id
 */
export async function fetchUserProfile(userId) {
  const { data, requestId } = await apiFetch(`/users/${userId}`);
  return {
    user: data.item ?? data,
    requestId,
  };
}

/**
 * Update authenticated user's profile.
 * Contract: PATCH /users/me
 * Body: { displayName?, bio?, avatarSmallUrl?, avatarLargeUrl? }
 */
export async function updateMyProfile(profileData) {
  const { data, requestId } = await apiFetch('/users/me', {
    method: 'PATCH',
    body: profileData,
  });

  return {
    user: data.item ?? data,
    requestId,
  };
}

/**
 * Follow a user.
 * Contract: POST /users/:id/follow
 */
export async function followUserRequest(userId) {
  const { data, requestId } = await apiFetch(`/users/${userId}/follow`, {
    method: 'POST',
  });

  return {
    ...data,
    requestId,
  };
}

/**
 * Unfollow a user.
 * Contract: DELETE /users/:id/follow
 */
export async function unfollowUserRequest(userId) {
  const { data, requestId } = await apiFetch(`/users/${userId}/follow`, {
    method: 'DELETE',
  });

  return {
    ...data,
    requestId,
  };
}

/**
 * List followers for a user.
 * Contract: GET /users/:id/followers
 */
export async function fetchFollowers(userId, cursor = null, limit = 10) {
  const params = new URLSearchParams();
  params.set('limit', String(limit));
  if (cursor) {
    params.set('cursor', cursor);
  }

  const { data, requestId } = await apiFetch(`/users/${userId}/followers?${params.toString()}`);
  return {
    items: data.items || [],
    nextCursor: data.nextCursor ?? null,
    hasMore: Boolean(data.hasMore),
    requestId,
  };
}

/**
 * List accounts a user is following.
 * Contract: GET /users/:id/following
 */
export async function fetchFollowing(userId, cursor = null, limit = 10) {
  const params = new URLSearchParams();
  params.set('limit', String(limit));
  if (cursor) {
    params.set('cursor', cursor);
  }

  const { data, requestId } = await apiFetch(`/users/${userId}/following?${params.toString()}`);
  return {
    items: data.items || [],
    nextCursor: data.nextCursor ?? null,
    hasMore: Boolean(data.hasMore),
    requestId,
  };
}

/**
 * List profile media.
 * Contract: GET /users/:id/media
 */
export async function fetchProfileMedia(userId, cursor = null, limit = 10) {
  const params = new URLSearchParams();
  params.set('limit', String(limit));
  if (cursor) {
    params.set('cursor', cursor);
  }

  const { data, requestId } = await apiFetch(`/users/${userId}/media?${params.toString()}`);
  return {
    items: data.items || [],
    nextCursor: data.nextCursor ?? null,
    hasMore: Boolean(data.hasMore),
    requestId,
  };
}

/* ─────────────────────────────────────────────────────────────
 * P0-06: Notifications Inbox
 * ───────────────────────────────────────────────────────────── */

/**
 * List notifications for the authenticated user.
 * Contract: GET /notifications
 */
export async function fetchNotifications(cursor = null, limit = 20) {
  const params = new URLSearchParams();
  params.set('limit', String(limit));
  if (cursor) {
    params.set('cursor', cursor);
  }

  const { data, requestId } = await apiFetch(`/notifications?${params.toString()}`);
  return {
    items: data.items || [],
    nextCursor: data.nextCursor ?? null,
    hasMore: Boolean(data.hasMore),
    requestId,
  };
}

/**
 * Get unread notification count.
 * Contract: GET /notifications/unread-count
 */
export async function fetchUnreadCount() {
  const { data, requestId } = await apiFetch('/notifications/unread-count');
  return {
    unreadCount: data.unreadCount ?? data.count ?? 0,
    count: data.count ?? data.unreadCount ?? 0,
    requestId,
  };
}

/**
 * Mark all notifications as read.
 * Contract: PATCH /notifications/read-all
 */
export async function markAllNotificationsAsRead() {
  const { data, requestId } = await apiFetch('/notifications/read-all', {
    method: 'PATCH',
  });

  return {
    ...data,
    requestId,
  };
}

/**
 * Mark a single notification as read.
 * Contract: PATCH /notifications/:id/read
 */
export async function markNotificationAsRead(notificationId) {
  const { data, requestId } = await apiFetch(`/notifications/${notificationId}/read`, {
    method: 'PATCH',
  });

  return {
    item: data.item ?? data,
    requestId,
  };
}

/* ─────────────────────────────────────────────────────────────
 * Search
 * ───────────────────────────────────────────────────────────── */

let searchAbortController = null;

export async function searchPosts(query, cursor = null, limit = 10) {
  const trimmed = typeof query === 'string' ? query.trim() : '';

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
    {
      signal: searchAbortController.signal,
      credentials: 'include',
    }
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
    error.status = response.status;
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
    nextCursor: data.nextCursor ?? null,
    hasMore: Boolean(data.hasMore),
    requestId,
  };
}
