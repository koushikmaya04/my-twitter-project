import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Sidebar from '../../components/Sidebar/Sidebar.jsx';
import Feed from '../../components/Feed/Feed.jsx';
import RightSidebar from '../../components/RightSidebar/RightSidebar.jsx';
import {
  fetchPosts,
  simulateLikeRequest,
  simulateCommentRequest,
  simulateRetweetRequest,
  createPostRequest,
  searchPosts,
} from '../../services/api.js';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll.js';
import { createFeedPipeline } from '../../utils/functionalPipeline.js';
import { eventEmitter } from '../../events/EventEmitter.js';
import Retweet from '../../models/Retweet.js';
import Tweet from '../../models/Tweet.js';
import './Home.css';

/**
 * CURRENT USER — Single source of truth for the authenticated/local user identity.
 */
export const CURRENT_USER = {
  id: 'current-user',
  name: 'Koushik Maya',
  handle: '@KMayaaa7841',
  avatar: 'https://i.pravatar.cc/40?img=68',
};

/**
 * Home — Main page component that orchestrates the entire application.
 */
const Home = () => {
  // ─── Core State ───
  const [localPosts, setLocalPosts] = useState([]);
  const [apiPosts, setApiPosts] = useState([]);
  const [searchResults, setSearchResults] = useState(null); // null when not in search mode
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  // ─── Canonical Request ID State ───
  const [displayedRequestId, setDisplayedRequestId] = useState(null);
  const [errorRequestId, setErrorRequestId] = useState(null);

  // Pagination refs
  const cursorRef = useRef(null);
  const isFetchingRef = useRef(false);

  // ─── UI State ───
  const [activeTab, setActiveTab] = useState('forYou');
  const [searchQuery, setSearchQuery] = useState('');
  const [followedHandles, setFollowedHandles] = useState([
    '@alexthompson',
    '@sarahchen',
    '@emilypark',
  ]);
  const [activeNav, setActiveNav] = useState('home');

  const loadedIdsRef = useRef(new Set());
  const likeOpIdRef = useRef(new Map());
  const retweetOpIdRef = useRef(new Map());

  const allPosts = useMemo(() => {
    return [...localPosts, ...apiPosts];
  }, [localPosts, apiPosts]);

  // ─── Fetch Posts ───
  const loadPosts = useCallback(async () => {
    if (isFetchingRef.current) return;

    isFetchingRef.current = true;
    setIsLoading(true);
    setError(null);
    setErrorRequestId(null);

    try {
      const {
        posts: newPosts,
        nextCursor,
        hasMore: more,
        requestId,
      } = await fetchPosts(cursorRef.current, 10);

      if (requestId) {
        setDisplayedRequestId(requestId);
      }

      const uniqueNewPosts = newPosts.filter((post) => {
        if (loadedIdsRef.current.has(post.id)) return false;
        loadedIdsRef.current.add(post.id);
        return true;
      });

      if (uniqueNewPosts.length > 0) {
        setApiPosts((prev) => [...prev, ...uniqueNewPosts]);
      }
      setHasMore(more);
      cursorRef.current = nextCursor;
    } catch (err) {
      setError(err.message || 'Failed to load posts');
      if (err.requestId) {
        setErrorRequestId(err.requestId);
        setDisplayedRequestId(err.requestId);
      }
    } finally {
      isFetchingRef.current = false;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const { sentinelRef } = useInfiniteScroll(loadPosts, hasMore, isLoading);

  const handleRetry = useCallback(() => {
    setError(null);
    setErrorRequestId(null);
    if (searchQuery) {
      handleSearch(searchQuery);
    } else {
      loadPosts();
    }
  }, [loadPosts, searchQuery]);

  const processedPosts = useMemo(() => {
    const pipeline = createFeedPipeline(
      activeTab,
      followedHandles,
      searchResults !== null ? '' : searchQuery
    );
    return pipeline(allPosts);
  }, [allPosts, activeTab, followedHandles, searchQuery, searchResults]);

  const displayedPosts =
    searchResults !== null ? searchResults : processedPosts;

  const updatePostById = useCallback((tweetId, updater) => {
    setLocalPosts((prev) =>
      prev.map((post) => (post.id === tweetId ? updater(post) : post))
    );
    setApiPosts((prev) =>
      prev.map((post) => (post.id === tweetId ? updater(post) : post))
    );
    setSearchResults((prev) =>
      prev
        ? prev.map((post) => (post.id === tweetId ? updater(post) : post))
        : null
    );
  }, []);

  // ─── Optimistic Like ───
  const handleLike = useCallback(
    (tweetId) => {
      const previousPost = (
        searchResults !== null ? searchResults : allPosts
      ).find((p) => p.id === tweetId);
      if (!previousPost) return;

      const wasLiked = previousPost.isLiked;
      const previousLikeCount = previousPost.likeCount;

      const prevOpId = likeOpIdRef.current.get(tweetId) ?? 0;
      const myOpId = prevOpId + 1;
      likeOpIdRef.current.set(tweetId, myOpId);

      const targetDesiredState = !wasLiked;

      updatePostById(tweetId, (post) => ({
        ...post,
        isLiked: targetDesiredState,
        likeCount: targetDesiredState
          ? post.likeCount + 1
          : Math.max(0, post.likeCount - 1),
      }));

      simulateLikeRequest(tweetId, targetDesiredState)
        .then((data) => {
          if (data && typeof data.likedByViewer === 'boolean') {
            updatePostById(tweetId, (post) => ({
              ...post,
              isLiked: data.likedByViewer,
              likeCount: data.likeCount,
            }));
          }
          if (data?.requestId) {
            setDisplayedRequestId(data.requestId);
          }

          eventEmitter.emit('like', {
            username: previousPost.author,
            tweetId: tweetId,
            tweetContent: previousPost.content,
            message: wasLiked
              ? `You unliked ${previousPost.author}'s post`
              : `You liked ${previousPost.author}'s post`,
          });
        })
        .catch((err) => {
          if (err?.requestId) {
            setErrorRequestId(err.requestId);
            setDisplayedRequestId(err.requestId);
          }
          if (likeOpIdRef.current.get(tweetId) !== myOpId) {
            return;
          }
          updatePostById(tweetId, (post) => ({
            ...post,
            isLiked: wasLiked,
            likeCount: previousLikeCount,
          }));

          eventEmitter.emit('error', {
            message: 'Failed to like post. Action has been reverted.',
          });
        });
    },
    [allPosts, searchResults, updatePostById]
  );

  // ─── Comment ───
  const handleComment = useCallback(
    (tweetId, commentText) => {
      const newComment = {
        id: `comment-${Date.now()}-${Math.random()}`,
        text: commentText,
        author: CURRENT_USER.name,
        handle: CURRENT_USER.handle,
        avatar: CURRENT_USER.avatar,
        timestamp: new Date().toISOString(),
      };

      updatePostById(tweetId, (post) => ({
        ...post,
        comments: [...(post.comments || []), newComment],
        commentCount: (post.commentCount || 0) + 1,
      }));

      simulateCommentRequest(tweetId, commentText)
        .then((data) => {
          if (data?.requestId) {
            setDisplayedRequestId(data.requestId);
          }
          const commentedPost = (
            searchResults !== null ? searchResults : allPosts
          ).find((p) => p.id === tweetId);
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
        .catch((err) => {
          if (err?.requestId) {
            setErrorRequestId(err.requestId);
            setDisplayedRequestId(err.requestId);
          }
          updatePostById(tweetId, (post) => ({
            ...post,
            comments: (post.comments || []).filter(
              (c) => c.id !== newComment.id
            ),
            commentCount: Math.max(0, (post.commentCount || 1) - 1),
          }));
          eventEmitter.emit('error', {
            message: 'Failed to post comment. Please try again.',
          });
        });
    },
    [allPosts, searchResults, updatePostById]
  );

  // ─── Retweet ───
  const handleRetweet = useCallback(
    (tweetId) => {
      const previousPost = (
        searchResults !== null ? searchResults : allPosts
      ).find((p) => p.id === tweetId);
      if (!previousPost) return;

      const wasRetweeted = previousPost.isRetweeted;
      const previousRetweetCount = previousPost.retweetCount;

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
        .then((data) => {
          if (data?.requestId) {
            setDisplayedRequestId(data.requestId);
          }
          if (!wasRetweeted && previousPost) {
            const retweet = Retweet.fromTweet(
              previousPost,
              CURRENT_USER.name,
              CURRENT_USER.handle
            );
            console.log('Retweet model instance:', retweet.toPlainObject());
          }

          eventEmitter.emit('retweet', {
            username: previousPost.author,
            tweetId,
            tweetContent: previousPost.content,
            message: wasRetweeted
              ? `You removed your repost of ${previousPost.author}'s post`
              : `You reposted ${previousPost.author}'s post`,
          });
        })
        .catch((err) => {
          if (err?.requestId) {
            setErrorRequestId(err.requestId);
            setDisplayedRequestId(err.requestId);
          }
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
    },
    [allPosts, searchResults, updatePostById]
  );

  // ─── Follow ───
  const handleFollow = useCallback(
    (handle, authorName) => {
      if (handle === CURRENT_USER.handle) {
        console.warn('Cannot follow yourself');
        return;
      }

      const isUnfollowing = followedHandles.includes(handle);

      eventEmitter.emit('newFollower', {
        message: isUnfollowing
          ? `You unfollowed ${authorName}`
          : `You followed ${authorName}`,
      });

      setFollowedHandles((prev) => {
        if (prev.includes(handle)) {
          return prev.filter((h) => h !== handle);
        }
        return [...prev, handle];
      });
    },
    [followedHandles]
  );

  // ─── New Tweet ───
  const handleNewPost = useCallback(async (text) => {
    try {
      const createdPost = await createPostRequest({
        kind: 'original',
        text,
      });

      if (createdPost?.requestId) {
        setDisplayedRequestId(createdPost.requestId);
      }

      const newTweet = Tweet.fromAPIPost(createdPost);
      setLocalPosts((prev) => [newTweet.toPlainObject(), ...prev]);
    } catch (error) {
      console.error('Failed to post tweet:', error);
      if (error?.requestId) {
        setErrorRequestId(error.requestId);
        setDisplayedRequestId(error.requestId);
      }
      eventEmitter.emit('error', {
        message: error.message || 'Failed to post tweet.',
      });
    }
  }, []);

  // ─── Backend Search ───
  const handleSearch = useCallback(async (query) => {
    const trimmed = typeof query === 'string' ? query.trim() : '';
    setSearchQuery(trimmed);

    // Empty or cleared query restores original feed
    if (!trimmed) {
      setSearchResults(null);
      setError(null);
      setErrorRequestId(null);
      return;
    }

    // Backend validates query between 2 and 80 characters.
    // Do not send malformed queries (< 2 chars).
    if (trimmed.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    setErrorRequestId(null);

    try {
      const { posts, requestId } = await searchPosts(trimmed, null, 10);
      setSearchResults(posts);
      if (requestId) {
        setDisplayedRequestId(requestId);
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError(err.message || 'Search failed');
      if (err.requestId) {
        setErrorRequestId(err.requestId);
        setDisplayedRequestId(err.requestId);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ─── Tab Change ───
  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
  }, []);

  return (
    <div className="home">
      <Sidebar onNavigate={setActiveNav} activeItem={activeNav} />
      <Feed
        posts={displayedPosts}
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
        errorRequestId={errorRequestId}
        displayedRequestId={displayedRequestId}
        onRequestIdUpdate={setDisplayedRequestId}
        onRetry={handleRetry}
        hasMore={searchResults !== null ? false : hasMore}
        sentinelRef={sentinelRef}
        searchQuery={searchQuery}
      />
      <RightSidebar onSearch={handleSearch} />
    </div>
  );
};

export default Home;
