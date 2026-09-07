/**
 * Functional Programming Feed Pipeline
 * 
 * DEMONSTRATES:
 * - Pure Functions: Every function returns a new array without mutating the input
 * - Immutability: Original data is never modified
 * - Higher-Order Functions: Functions that take or return other functions
 * - Function Composition: pipe() combines multiple functions into a single pipeline
 * - reduce: Used for deduplication and pipe composition
 * - filter / map: Used for filtering and transforming feed data
 * 
 * WHY FUNCTIONAL PROGRAMMING: The feed processing pipeline must be predictable
 * and testable. Pure functions with no side effects guarantee that the same input
 * always produces the same output, making debugging straightforward.
 */

/**
 * pipe — Composes functions left-to-right using reduce.
 * 
 * DEMONSTRATES: Function Composition + reduce
 * 
 * HOW IT WORKS:
 * Given pipe(f, g, h), it produces a function that computes h(g(f(x))).
 * reduce accumulates the result by passing it through each function in sequence.
 * 
 * @param  {...Function} fns - Functions to compose
 * @returns {Function} Composed function
 */
export const pipe = (...fns) => (input) =>
  fns.reduce((accumulated, fn) => fn(accumulated), input);

/**
 * filterByFollowing — Pure function that filters posts to only show
 * posts from "followed" users.
 * 
 * DEMONSTRATES: Pure Function + filter (Higher-Order Function)
 * - Does NOT mutate the input array
 * - Returns a NEW filtered array
 * 
 * @param {string[]} followedHandles - List of handles the user follows
 * @returns {Function} A filter function that accepts posts array
 */
export const filterByFollowing = (followedHandles) => (posts) => {
  // If no specific following filter is set, return all posts
  if (!followedHandles || followedHandles.length === 0) return [...posts];
  return posts.filter((post) => followedHandles.includes(post.handle));
};

/**
 * sortByRecency — Pure function that sorts posts by timestamp.
 * 
 * DEMONSTRATES: Pure Function + Immutability
 * - Creates a copy with spread operator before sorting
 * - Original array is never mutated
 * 
 * @param {Array} posts - Array of post objects
 * @returns {Array} New sorted array (most recent first)
 */
export const sortByRecency = (posts) => {
  // Spread into a new array to avoid mutating the original
  return [...posts].sort((a, b) => {
    // Parse timestamp strings like "1h", "2h", "1d" into comparable numbers
    const parseTime = (t) => {
      if (t === 'now') return -1; // 'now' is the most recent (smaller number = more recent)
      if (typeof t === 'number') return t;
      const num = parseInt(t);
      if (isNaN(num)) return 0;
      if (typeof t === 'string' && t.includes('d')) return num * 24;
      return num;
    };
    return parseTime(a.timestamp) - parseTime(b.timestamp);
  });
};

/**
 * dedupe — Pure function that removes duplicate posts by ID.
 * 
 * DEMONSTRATES: reduce — the most important demo here.
 * Uses reduce to accumulate unique posts into a new array,
 * tracking seen IDs in a Set.
 * 
 * WHY REDUCE: reduce is the ideal tool for accumulating a filtered result
 * because it gives us both the accumulated array AND the ability to track
 * state (seen IDs) across iterations.
 * 
 * @param {Array} posts - Array of post objects (may contain duplicates)
 * @returns {Array} New array with duplicates removed (first occurrence kept)
 */
export const dedupe = (posts) => {
  const seen = new Set();
  return posts.reduce((uniquePosts, post) => {
    if (!seen.has(post.id)) {
      seen.add(post.id);
      uniquePosts.push(post);
    }
    return uniquePosts;
  }, []);
};

/**
 * filterBySearch — Pure curried function for search filtering.
 * 
 * DEMONSTRATES: Higher-Order Function (returns a function) + Pure Function
 * 
 * @param {string} query - Search query string
 * @returns {Function} Filter function that accepts posts array
 */
export const filterBySearch = (query) => (posts) => {
  if (!query || query.trim() === '') return [...posts];
  const lowerQuery = query.toLowerCase().trim();
  return posts.filter(
    (post) =>
      post.content?.toLowerCase().includes(lowerQuery) ||
      post.author?.toLowerCase().includes(lowerQuery) ||
      post.handle?.toLowerCase().includes(lowerQuery) ||
      post.category?.toLowerCase().includes(lowerQuery)
  );
};

/**
 * filterByTab — Pure function for tab filtering (For you / Following).
 * 
 * @param {string} tab - 'forYou' or 'following'
 * @param {string[]} followedHandles - List of followed handles
 * @returns {Function} Filter function
 */
export const filterByTab = (tab, followedHandles) => (posts) => {
  if (tab === 'following' && followedHandles.length > 0) {
    return posts.filter((post) => followedHandles.includes(post.handle));
  }
  return [...posts];
};

/**
 * createFeedPipeline — Builds the complete feed processing pipeline.
 * 
 * DEMONSTRATES: Composing all the pure functions together using pipe.
 * 
 * Usage:
 *   const processedFeed = createFeedPipeline('forYou', [], 'react')(rawPosts);
 * 
 * @param {string} activeTab - 'forYou' or 'following'
 * @param {string[]} followedHandles - Handles the user follows
 * @param {string} searchQuery - Current search query
 * @returns {Function} Pipeline function that processes an array of posts
 */
export const createFeedPipeline = (activeTab, followedHandles, searchQuery) =>
  pipe(
    filterByTab(activeTab, followedHandles),
    filterBySearch(searchQuery),
    sortByRecency,
    dedupe
  );
