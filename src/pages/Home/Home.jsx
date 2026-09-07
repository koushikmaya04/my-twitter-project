import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Sidebar from '../../components/Sidebar/Sidebar.jsx';
import Feed from '../../components/Feed/Feed.jsx';
import RightSidebar from '../../components/RightSidebar/RightSidebar.jsx';
import { fetchPosts, simulateLikeRequest, simulateCommentRequest, simulateRetweetRequest } from '../../services/api.js';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll.js';
import { createFeedPipeline } from '../../utils/functionalPipeline.js';
import { eventEmitter } from '../../events/EventEmitter.js';
import Retweet from '../../models/Retweet.js';
import Tweet from '../../models/Tweet.js';
import './Home.css';

/**
 * CURRENT USER — Single source of truth for the authenticated/local user identity.
 *
 * Every post, comment, and follow action references this object.
 * This prevents the self-follow bug and ensures consistent author identity.
 */
export const CURRENT_USER = {
  id: 'current-user',
  name: 'Koushik Maya',
  handle: '@KMayaaa7841',
  avatar: 'https://i.pravatar.cc/40?img=68',
};

/**
 * Home — Main page component that orchestrates the entire application.
 *
 * STATE ARCHITECTURE (Bug Fix #22):
 * - localPosts: user-created posts (always at top, never affected by pagination)
 * - apiPosts: posts from JSONPlaceholder (managed by infinite scroll)
 * - followedHandles: Set of followed user handles (not a global boolean)
 * - processedPosts: derived from localPosts + apiPosts via functional pipeline
 *
 * All state updates use immutable patterns (map/filter returning new arrays).
 * No global isLiked/isFollowing booleans — each post owns its own state.
 */
const Home = () => {
  // ─── Core State: Separate local posts from API posts (Bug Fix #16) ───
  const [localPosts, setLocalPosts] = useState([]);
  const [apiPosts, setApiPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  // Use refs for pagination state to prevent IntersectionObserver from reconnecting
  const pageRef = useRef(1);
  const isFetchingRef = useRef(false);

  // ─── UI State ────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('forYou');
  const [searchQuery, setSearchQuery] = useState('');
  const [followedHandles, setFollowedHandles] = useState([
    '@alexthompson', '@sarahchen', '@emilypark'
  ]);
  const [activeNav, setActiveNav] = useState('home');

  // Ref to track loaded post IDs for deduplication (Bug Fix #15)
  const loadedIdsRef = useRef(new Set());

  /**
   * Per-tweet operation ID maps for like and retweet.
   *
   * RACE CONDITION FIX: If the user clicks Like → Unlike rapidly, two async
   * requests run concurrently. When the FIRST request eventually fails and tries
   * to rollback, it must not overwrite the result of the SECOND (newer) click.
   *
   * HOW IT WORKS:
   * - On each click, we increment a counter for that tweetId and capture the ID.
   * - In the .catch handler, we compare the captured ID to the current latest.
   * - If they differ, a newer action has occurred → we skip the stale rollback.
   */
  const likeOpIdRef = useRef(new Map());     // tweetId → latest like operation ID
  const retweetOpIdRef = useRef(new Map()); // tweetId → latest retweet operation ID

  /**
   * Combined posts: local posts first, then API posts.
   * This ensures user-created posts always appear at the top and
   * are never displaced by API pagination (Bug Fix #16).
   */
  const allPosts = useMemo(() => {
    return [...localPosts, ...apiPosts];
  }, [localPosts, apiPosts]);

  // ─── Fetch Posts ────────────────────────────────────────────
  const loadPosts = useCallback(async () => {
    if (isFetchingRef.current) return;
    
    isFetchingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const { posts: newPosts, hasMore: more } = await fetchPosts(pageRef.current, 10);

      /**
       * DE-DUPLICATION (Bug Fix #15): Filter out any posts whose IDs
       * we've already loaded. IntersectionObserver may fire multiple times,
       * causing the same page to be fetched twice.
       */
      const uniqueNewPosts = newPosts.filter((post) => {
        if (loadedIdsRef.current.has(post.id)) return false;
        loadedIdsRef.current.add(post.id);
        return true;
      });

      if (uniqueNewPosts.length > 0) {
        // Append to apiPosts only — local posts are separate (Bug Fix #16)
        setApiPosts((prev) => [...prev, ...uniqueNewPosts]);
      }
      setHasMore(more);
      if (more) {
        pageRef.current += 1;
      }
    } catch (err) {
      setError(err.message || 'Failed to load posts');
    } finally {
      isFetchingRef.current = false;
      setIsLoading(false);
    }
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    loadPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Infinite Scroll ────────────────────────────────────────
  const { sentinelRef } = useInfiniteScroll(loadPosts, hasMore, isLoading);

  // ─── Retry Failed Fetch ─────────────────────────────────────
  const handleRetry = useCallback(() => {
    setError(null);
    loadPosts();
  }, [loadPosts]);

  // ─── Functional Pipeline (Bug Fix #3, #18, #19) ─────────────
  /**
   * DEMONSTRATES: Functional programming pipeline.
   *
   * The feed is processed through pipe(filterByTab, filterBySearch, sortByRecency, dedupe)
   * before rendering. All functions are pure — the original posts array is never mutated.
   *
   * Bug Fix #19: Search produces DERIVED results — it does NOT delete posts from state.
   * Bug Fix #18: All pipeline functions return new arrays, never mutate input.
   * Bug Fix #3: Post order is preserved — sortByRecency only reorders, never drops.
   */
  const processedPosts = useMemo(() => {
    const pipeline = createFeedPipeline(activeTab, followedHandles, searchQuery);
    return pipeline(allPosts);
  }, [allPosts, activeTab, followedHandles, searchQuery]);

  // ─── Helper to update a post in BOTH local and API arrays ───
  /**
   * Bug Fix #3, #5, #7, #10: Updates a specific post IN PLACE without
   * reordering the feed. Uses .map() to produce a new array where only
   * the target post is changed.
   */
  const updatePostById = useCallback((tweetId, updater) => {
    setLocalPosts((prev) =>
      prev.map((post) => (post.id === tweetId ? updater(post) : post))
    );
    setApiPosts((prev) =>
      prev.map((post) => (post.id === tweetId ? updater(post) : post))
    );
  }, []);

  // ─── Optimistic Like (Bug Fix #7, #8) ──────────────────────
  /**
   * DEMONSTRATES: Optimistic UI with Rollback.
   *
   * Bug Fix #7: Like state belongs to the INDIVIDUAL post, not a global variable.
   * Bug Fix #8: On failure, only the SPECIFIC tweet is rolled back, not the entire feed.
   *
   * 1. Save previous state of THAT specific tweet
   * 2. IMMEDIATELY update THAT tweet (optimistic)
   * 3. Send simulated API request in background
   * 4. On success → keep the change + emit notification
   * 5. On failure → ROLLBACK only that tweet + emit error
   */
  const handleLike = useCallback((tweetId) => {
    // Step 1: Capture previous state for rollback
    const previousPost = allPosts.find((p) => p.id === tweetId);
    if (!previousPost) return;

    const wasLiked = previousPost.isLiked;
    const previousLikeCount = previousPost.likeCount;

    // RACE CONDITION FIX: Assign a unique operation ID to THIS click.
    // If the user clicks again before this request finishes, the Map entry
    // for this tweetId is overwritten with a higher ID. In .catch we compare
    // and skip the rollback if a newer operation has since taken over.
    const prevOpId = likeOpIdRef.current.get(tweetId) ?? 0;
    const myOpId = prevOpId + 1;
    likeOpIdRef.current.set(tweetId, myOpId);

    // Step 2: OPTIMISTIC UPDATE — immediately toggle like on ONLY this tweet
    updatePostById(tweetId, (post) => ({
      ...post,
      isLiked: !post.isLiked,
      likeCount: !post.isLiked
        ? post.likeCount + 1
        : Math.max(0, post.likeCount - 1),
    }));

    // Step 3: Simulate API request in background
    simulateLikeRequest(tweetId)
      .then(() => {
        // Step 4: SUCCESS — optimistic update stands, emit notification
        eventEmitter.emit('like', {
          username: previousPost.author,
          tweetId: tweetId,
          tweetContent: previousPost.content,
          message: wasLiked ? `You unliked ${previousPost.author}'s post` : `You liked ${previousPost.author}'s post`,
        });
      })
      .catch(() => {
        // Step 5: FAILURE — only rollback if NO newer click has occurred
        if (likeOpIdRef.current.get(tweetId) !== myOpId) {
          // A newer like/unlike action has since fired — skip stale rollback
          return;
        }
        updatePostById(tweetId, (post) => ({
          ...post,
          isLiked: wasLiked,
          likeCount: previousLikeCount,
        }));

        // Emit error event → triggers accessible error toast
        eventEmitter.emit('error', {
          message: 'Failed to like post. Action has been reverted.',
        });
      });
  }, [allPosts, updatePostById]);

  // ─── Comment (Bug Fix #5, #6) ──────────────────────────────
  /**
   * Bug Fix #5: Comments belong to a SPECIFIC tweet. Only that tweet's
   * comments array and commentCount are updated via updatePostById.
   *
   * Bug Fix #6: Comment author is ALWAYS currentUser, never the parent tweet's author.
   */
  const handleComment = useCallback((tweetId, commentText) => {
    const newComment = {
      id: `comment-${Date.now()}-${Math.random()}`,
      text: commentText,
      // Bug Fix #6: Comment author is the CURRENT USER, not the tweet author
      author: CURRENT_USER.name,
      handle: CURRENT_USER.handle,
      avatar: CURRENT_USER.avatar,
      timestamp: new Date().toISOString(),
    };

    // Bug Fix #5: Optimistic — update ONLY the target tweet's comments
    updatePostById(tweetId, (post) => ({
      ...post,
      comments: [...(post.comments || []), newComment],
      commentCount: (post.commentCount || 0) + 1,
    }));

    // Simulate API + emit event
    simulateCommentRequest(tweetId, commentText)
      .then(() => {
        const commentedPost = allPosts.find((p) => p.id === tweetId);
        const authorName = commentedPost?.author || 'Someone';
        eventEmitter.emit('comment', {
          username: authorName,
          tweetId,
          commentText,
          postId: tweetId,
          commentId: newComment.id,
          user: CURRENT_USER,
          message: `You commented on ${authorName}'s post`,
        });
      })
      .catch(() => {
        // Rollback: remove the optimistically added comment from ONLY that tweet
        updatePostById(tweetId, (post) => ({
          ...post,
          comments: (post.comments || []).filter((c) => c.id !== newComment.id),
          commentCount: Math.max(0, (post.commentCount || 1) - 1),
        }));
        eventEmitter.emit('error', {
          message: 'Failed to post comment. Please try again.',
        });
      });
  }, [allPosts, updatePostById]);

  // ─── Retweet (Bug Fix #10) ─────────────────────────────────
  /**
   * Bug Fix #10: Retweet state belongs to the SPECIFIC original tweet.
   * Only that tweet's retweetCount and isRetweeted are changed.
   */
  const handleRetweet = useCallback((tweetId) => {
    const previousPost = allPosts.find((p) => p.id === tweetId);
    if (!previousPost) return;

    const wasRetweeted = previousPost.isRetweeted;
    const previousRetweetCount = previousPost.retweetCount;

    // RACE CONDITION FIX: Assign an operation ID to this click.
    // If the user clicks retweet again before this request resolves,
    // the Map entry is overwritten with a newer ID. The .catch checks
    // the ID and skips rollback if a newer action has taken over.
    const prevOpId = retweetOpIdRef.current.get(tweetId) ?? 0;
    const myOpId = prevOpId + 1;
    retweetOpIdRef.current.set(tweetId, myOpId);

    updatePostById(tweetId, (post) => ({
      ...post,
      isRetweeted: !post.isRetweeted,
      retweetCount: !post.isRetweeted
        ? post.retweetCount + 1
        : Math.max(0, post.retweetCount - 1),
    }));

    simulateRetweetRequest(tweetId)
      .then(() => {
        if (!wasRetweeted && previousPost) {
          // Create a Retweet model instance — demonstrates multi-level inheritance
          const retweet = Retweet.fromTweet(
            previousPost,
            CURRENT_USER.name,
            CURRENT_USER.handle
          );
          // Log the retweet model for demonstration purposes
          console.log('Retweet model instance:', retweet.toPlainObject());
        }

        eventEmitter.emit('retweet', {
          username: previousPost.author,
          tweetId,
          tweetContent: previousPost.content,
          message: wasRetweeted ? `You removed your repost of ${previousPost.author}'s post` : `You reposted ${previousPost.author}'s post`,
        });
      })
      .catch(() => {
        // Only rollback if no newer retweet action has since fired for this tweet
        if (retweetOpIdRef.current.get(tweetId) !== myOpId) {
          return;
        }
        updatePostById(tweetId, (post) => ({
          ...post,
          isRetweeted: wasRetweeted,
          retweetCount: previousRetweetCount,
        }));
        eventEmitter.emit('error', {
          message: 'Failed to repost. Action has been reverted.',
        });
      });
  }, [allPosts, updatePostById]);

  // ─── Follow (Bug Fix #1, #9) ──────────────────────────────
  /**
   * Bug Fix #1: SELF-FOLLOW PREVENTION.
   * The handler contains a guard that rejects following the current user.
   * This is the defensive backend — UI also hides the button, but the
   * handler itself must also prevent the action.
   *
   * Bug Fix #9: Follow state is a SET of followed handles, not a global boolean.
   * Each user has their own followed/unfollowed state.
   */
  const handleFollow = useCallback((handle, authorName) => {
    // Bug Fix #1: SELF-FOLLOW GUARD — never allow following yourself
    if (handle === CURRENT_USER.handle) {
      console.warn('Cannot follow yourself');
      return;
    }

    const isUnfollowing = followedHandles.includes(handle);
    
    // Emit newFollower event → triggers toast notification
    // BUG 2 FIX: Emitting outside the state updater prevents duplicate 
    // events in React Strict Mode.
    eventEmitter.emit('newFollower', {
      message: isUnfollowing ? `You unfollowed ${authorName}` : `You followed ${authorName}`,
    });

    setFollowedHandles((prev) => {
      if (prev.includes(handle)) {
        return prev.filter((h) => h !== handle);
      }
      return [...prev, handle];
    });
  }, [followedHandles]);

  // ─── New Tweet (Bug Fix #2, #16) ──────────────────────────
  /**
   * Bug Fix #2: New posts are PREPENDED to localPosts (not apiPosts).
   * They always appear at the top, directly below the composer.
   *
   * Bug Fix #16: Local posts are stored separately from API posts.
   * Infinite scrolling never displaces user-created posts.
   *
   * Bug Fix #4: Each post has a stable unique ID (user-{timestamp}),
   * never uses array indexes.
   */
  const handleNewPost = useCallback((text) => {
    const newTweet = new Tweet({
      id: `user-${Date.now()}`,
      content: text,
      // Bug Fix #6: Author is always CURRENT_USER
      author: CURRENT_USER.name,
      handle: CURRENT_USER.handle,
      avatar: CURRENT_USER.avatar,
      timestamp: 'now',
      likes: 0,
      imageUrl: null,
      thumbnailUrl: null,
      albumId: 0,
      category: null,
      verified: false,
    });

    // Bug Fix #2: Prepend to localPosts — newest first, existing posts unchanged
    setLocalPosts((prev) => [newTweet.toPlainObject(), ...prev]);
  }, []);

  // ─── Search (Bug Fix #19) ─────────────────────────────────
  /**
   * Bug Fix #19: Search only sets a query string. The functional pipeline
   * produces DERIVED filtered results. The actual posts state is never modified.
   * Clearing the search shows all posts again.
   */
  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
  }, []);

  // ─── Tab Change ──────────────────────────────────────────────
  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
  }, []);

  return (
    <div className="home">
      <Sidebar onNavigate={setActiveNav} activeItem={activeNav} />
      <Feed
        posts={processedPosts}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onPost={handleNewPost}
        onLike={handleLike}
        onRetweet={handleRetweet}
        onComment={handleComment}
        onFollow={handleFollow}
        followedHandles={followedHandles}
        currentUser={CURRENT_USER}
        isLoading={isLoading}
        error={error}
        onRetry={handleRetry}
        hasMore={hasMore}
        sentinelRef={sentinelRef}
        searchQuery={searchQuery}
      />
      <RightSidebar onSearch={handleSearch} />
    </div>
  );
};

export default Home;
