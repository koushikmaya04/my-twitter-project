import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Sidebar from '../../components/Sidebar/Sidebar.jsx';
import Feed from '../../components/Feed/Feed.jsx';
import Explore from '../../components/Explore/Explore.jsx';
import RightSidebar from '../../components/RightSidebar/RightSidebar.jsx';
import AuthModal from '../../components/AuthModal/AuthModal.jsx';
import Notifications from '../../components/Notifications/Notifications.jsx';
import Profile from '../../components/Profile/Profile.jsx';
import {
  fetchPosts,
  fetchHomeFeed,
  fetchCurrentUser,
  fetchUserProfile,
  logoutUser,
  simulateLikeRequest,
  createPostRequest,
  updatePostRequest,
  deletePostRequest,
  followUserRequest,
  unfollowUserRequest,
  fetchFollowing,
  fetchUnreadCount,
  searchPosts,
  resolveImageUrl,
  DEFAULT_AVATAR,
} from '../../services/api.js';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll.js';
import { createFeedPipeline } from '../../utils/functionalPipeline.js';
import { eventEmitter } from '../../events/EventEmitter.js';
import Retweet from '../../models/Retweet.js';
import Tweet from '../../models/Tweet.js';
import './Home.css';

/**
 * Home — Main page component orchestrating features JS-P0-01 through JS-P0-07.
 */
const Home = () => {
  // ─── Authentication & Session State (P0-01) ───
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authInitialTab, setAuthInitialTab] = useState('login');

  // ─── Navigation State ───
  const [activeNav, setActiveNav] = useState('home'); // 'home' | 'notifications' | 'profile' | 'explore'
  const [viewingProfileId, setViewingProfileId] = useState(null);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const composerRef = useRef(null);

  // ─── Notification Badge State (P0-06) ───
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  // ─── Core Feed State (P0-04) ───
  const [localPosts, setLocalPosts] = useState([]);
  const [apiPosts, setApiPosts] = useState([]);
  const [searchResults, setSearchResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  // ─── Canonical Request ID State (P0-07) ───
  const [displayedRequestId, setDisplayedRequestId] = useState(null);
  const [errorRequestId, setErrorRequestId] = useState(null);

  // Pagination refs
  const cursorRef = useRef(null);
  const isFetchingRef = useRef(false);

  // ─── Tabs & Follow Graph State (P0-03, P0-04) ───
  const [activeTab, setActiveTab] = useState('forYou'); // 'forYou' | 'following'
  const [searchQuery, setSearchQuery] = useState('');
  const [followedHandles, setFollowedHandles] = useState([]);

  const loadedIdsRef = useRef(new Set());
  const likeOpIdRef = useRef(new Map());
  const retweetOpIdRef = useRef(new Map());
  const repostMapRef = useRef(new Map()); // maps targetPostId -> myRepostPostId

  // Fix #6: Mobile drawer accessibility — background scroll lock and Escape to close
  useEffect(() => {
    if (!isMobileDrawerOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsMobileDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobileDrawerOpen]);

  // Helper to load user profile details and update currentUser
  const enrichCurrentUser = useCallback(async (baseUser) => {
    if (!baseUser?.id) return;
    try {
      const { user: profileUser } = await fetchUserProfile(baseUser.id);
      if (profileUser) {
        const avatarUrl =
          resolveImageUrl(profileUser.avatar?.largeUrl) ||
          resolveImageUrl(profileUser.avatar?.smallUrl) ||
          DEFAULT_AVATAR;
        setCurrentUser((prev) => ({
          ...prev,
          name: profileUser.displayName || prev?.name || baseUser.displayName,
          avatar: avatarUrl,
          bio: profileUser.bio || '',
        }));
      }
    } catch {
      // Non-critical enrich
    }
  }, []);

  // ─── Session Restoration on Mount (P0-01) ───
  useEffect(() => {
    let isMounted = true;

    fetchCurrentUser()
      .then(({ user, requestId }) => {
        if (!isMounted) return;
        if (user) {
          const userObj = {
            id: user.id,
            name: user.displayName,
            handle: user.handle?.startsWith('@') ? user.handle : `@${user.handle}`,
            rawHandle: user.handle?.replace(/^@/, ''),
            avatar: resolveImageUrl(user.avatar?.smallUrl) || DEFAULT_AVATAR,
          };
          setCurrentUser(userObj);

          if (requestId) setDisplayedRequestId(requestId);

          // Enrich profile avatar and details
          enrichCurrentUser(user);

          // Fetch unread count for authenticated user (P0-06)
          fetchUnreadCount()
            .then(({ unreadCount }) => {
              if (isMounted) setUnreadNotificationsCount(unreadCount);
            })
            .catch(() => {});

          // Fetch user's following list (P0-03 & Fix #4: max limit is 50)
          fetchFollowing(user.id, null, 50)
            .then(({ items }) => {
              if (!isMounted || !items) return;
              const normalized = [];
              items.forEach((f) => {
                if (f.id) normalized.push(f.id);
                if (f.handle) {
                  const clean = f.handle.replace(/^@/, '');
                  normalized.push(clean);
                  normalized.push(`@${clean}`);
                }
              });
              setFollowedHandles(normalized);
            })
            .catch(() => {});
        }
      })
      .catch((err) => {
        // Unauthenticated session (expected for guest)
        if (isMounted) {
          setCurrentUser(null);
          if (err.requestId) setDisplayedRequestId(err.requestId);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [enrichCurrentUser]);

  const allPosts = useMemo(() => {
    return [...localPosts, ...apiPosts];
  }, [localPosts, apiPosts]);

  // ─── Fetch Feed (P0-04: Public GET /feed vs Personalized GET /feed/home) ───
  const loadPosts = useCallback(
    async (isReset = false) => {
      if (isFetchingRef.current) return;

      if (!isReset && !hasMore) return;

      isFetchingRef.current = true;
      setIsLoading(true);
      setError(null);
      setErrorRequestId(null);

      const cursorToUse = isReset ? null : cursorRef.current;

      try {
        let result;
        if (activeTab === 'following') {
          if (!currentUser) {
            setApiPosts([]);
            setHasMore(false);
            cursorRef.current = null;
            return;
          }
          result = await fetchHomeFeed(cursorToUse, 10);
        } else {
          result = await fetchPosts(cursorToUse, 10);
        }

        const { posts, nextCursor, hasMore: more, requestId } = result;

        if (requestId) {
          setDisplayedRequestId(requestId);
        }

        if (isReset) {
          loadedIdsRef.current.clear();
          const uniqueNewPosts = [];
          for (const post of posts) {
            if (!loadedIdsRef.current.has(post.id)) {
              loadedIdsRef.current.add(post.id);
              uniqueNewPosts.push(post);
            }
          }
          setApiPosts(uniqueNewPosts);
        } else {
          setApiPosts((prevPosts) => {
            const uniqueNewPosts = [];
            for (const post of posts) {
              if (!loadedIdsRef.current.has(post.id)) {
                loadedIdsRef.current.add(post.id);
                uniqueNewPosts.push(post);
              }
            }
            return [...prevPosts, ...uniqueNewPosts];
          });
        }

        cursorRef.current = nextCursor;
        setHasMore(more);
      } catch (err) {
        if (err.name === 'AbortError') return;
        setError(err.message || 'Failed to load posts');
        if (err.requestId) {
          setErrorRequestId(err.requestId);
          setDisplayedRequestId(err.requestId);
        }
      } finally {
        isFetchingRef.current = false;
        setIsLoading(false);
      }
    },
    [activeTab, currentUser, hasMore]
  );

  useEffect(() => {
    if (activeNav === 'home') {
      cursorRef.current = null;
      loadPosts(true);
    }
  }, [activeTab, activeNav, currentUser]);

  const { sentinelRef } = useInfiniteScroll(loadPosts, hasMore, isLoading);

  const handleRetry = useCallback(() => {
    setError(null);
    setErrorRequestId(null);
    if (searchQuery) {
      handleSearch(searchQuery);
    } else {
      loadPosts(false);
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

  // ─── Optimistic Like (P0-05) ───
  const handleLike = useCallback(
    (tweetId) => {
      if (!currentUser) {
        setAuthInitialTab('login');
        setIsAuthModalOpen(true);
        return;
      }

      const previousPost = (
        searchResults !== null ? searchResults : allPosts
      ).find((p) => p.id === tweetId);
      if (!previousPost) return;

      const wasLiked = Boolean(previousPost.isLiked);
      const previousLikeCount = previousPost.likeCount ?? previousPost.likes ?? 0;

      const prevOpId = likeOpIdRef.current.get(tweetId) ?? 0;
      const myOpId = prevOpId + 1;
      likeOpIdRef.current.set(tweetId, myOpId);

      const targetDesiredState = !wasLiked;

      updatePostById(tweetId, (post) => ({
        ...post,
        isLiked: targetDesiredState,
        likes: targetDesiredState
          ? (post.likes || 0) + 1
          : Math.max(0, (post.likes || 1) - 1),
        likeCount: targetDesiredState
          ? (post.likeCount || 0) + 1
          : Math.max(0, (post.likeCount || 1) - 1),
      }));

      simulateLikeRequest(tweetId, targetDesiredState)
        .then((data) => {
          if (data && typeof data.likedByViewer === 'boolean') {
            updatePostById(tweetId, (post) => ({
              ...post,
              isLiked: data.likedByViewer,
              likes: data.likeCount,
              likeCount: data.likeCount,
            }));
          }
          if (data?.requestId) {
            setDisplayedRequestId(data.requestId);
          }
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
            likes: previousLikeCount,
            likeCount: previousLikeCount,
          }));

          eventEmitter.emit('error', {
            message: 'Failed to update like status. Reverted.',
          });
        });
    },
    [currentUser, allPosts, searchResults, updatePostById]
  );

  // ─── Comment / Reply (P0-05) ───
  const handleComment = useCallback(
    (tweetId, commentText) => {
      if (!currentUser) {
        setAuthInitialTab('login');
        setIsAuthModalOpen(true);
        return;
      }

      const tempCommentId = `comment-${Date.now()}-${Math.random()}`;
      const newComment = {
        id: tempCommentId,
        text: commentText,
        content: commentText,
        author: currentUser.name,
        handle: currentUser.handle,
        avatar: currentUser.avatar || DEFAULT_AVATAR,
        timestamp: new Date().toISOString(),
      };

      updatePostById(tweetId, (post) => ({
        ...post,
        comments: [...(post.comments || []), newComment],
        commentCount: (post.commentCount || 0) + 1,
      }));

      createPostRequest({
        kind: 'reply',
        replyToId: tweetId,
        text: commentText,
      })
        .then((data) => {
          if (data?.requestId) {
            setDisplayedRequestId(data.requestId);
          }
          if (data?.post) {
            const serverReply = Tweet.fromAPIPost(data.post).toPlainObject();
            updatePostById(tweetId, (post) => ({
              ...post,
              comments: (post.comments || []).map((c) =>
                c.id === tempCommentId ? serverReply : c
              ),
            }));
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
            commentId: tempCommentId,
            user: currentUser,
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
              (c) => c.id !== tempCommentId
            ),
            commentCount: Math.max(0, (post.commentCount || 1) - 1),
          }));
          eventEmitter.emit('error', {
            message: 'Failed to post reply. Please try again.',
          });
        });
    },
    [currentUser, allPosts, searchResults, updatePostById]
  );

  // ─── Retweet / Repost (P0-05: Toggle between Repost and Undo Repost) ───
  const handleRetweet = useCallback(
    async (tweetId) => {
      if (!currentUser) {
        setAuthInitialTab('login');
        setIsAuthModalOpen(true);
        return;
      }

      const previousPost = (
        searchResults !== null ? searchResults : allPosts
      ).find((p) => p.id === tweetId);
      if (!previousPost) return;

      const wasRetweeted = Boolean(previousPost.isRetweeted);
      const previousRetweetCount = previousPost.retweetCount || 0;

      const prevOpId = retweetOpIdRef.current.get(tweetId) ?? 0;
      const myOpId = prevOpId + 1;
      retweetOpIdRef.current.set(tweetId, myOpId);

      // Optimistic update
      updatePostById(tweetId, (post) => ({
        ...post,
        isRetweeted: !wasRetweeted,
        retweetCount: !wasRetweeted
          ? (post.retweetCount || 0) + 1
          : Math.max(0, (post.retweetCount || 1) - 1),
      }));

      try {
        if (wasRetweeted) {
          // Undo Repost: delete the user's repost post
          let repostId = repostMapRef.current.get(tweetId);
          if (!repostId) {
            const foundRepost = allPosts.find(
              (p) =>
                p.kind === 'repost' &&
                (p.repostOfId === tweetId || p.id === tweetId) &&
                p.authorId === currentUser.id
            );
            repostId = foundRepost?.id;
          }

          if (repostId) {
            await deletePostRequest(repostId);
            repostMapRef.current.delete(tweetId);
            setLocalPosts((prev) => prev.filter((p) => p.id !== repostId));
            setApiPosts((prev) => prev.filter((p) => p.id !== repostId));
          }
        } else {
          // Create Repost
          const result = await createPostRequest({
            kind: 'repost',
            repostOfId: tweetId,
          });

          if (result?.post?.id) {
            repostMapRef.current.set(tweetId, result.post.id);
          }
          if (result?.requestId) {
            setDisplayedRequestId(result.requestId);
          }
        }
      } catch (err) {
        if (err?.requestId) {
          setErrorRequestId(err.requestId);
          setDisplayedRequestId(err.requestId);
        }
        if (retweetOpIdRef.current.get(tweetId) !== myOpId) {
          return;
        }
        // Rollback
        updatePostById(tweetId, (post) => ({
          ...post,
          isRetweeted: wasRetweeted,
          retweetCount: previousRetweetCount,
        }));
        eventEmitter.emit('error', {
          message: 'Failed to update repost state. Action reverted.',
        });
      }
    },
    [currentUser, allPosts, searchResults, updatePostById]
  );

  // ─── Real Follow / Unfollow (P0-03 & Fix #4) ───
  const handleFollow = useCallback(
    async (targetUserIdOrHandle, authorName) => {
      if (!currentUser) {
        setAuthInitialTab('login');
        setIsAuthModalOpen(true);
        return;
      }

      // Check if target is a UUID
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        String(targetUserIdOrHandle)
      );

      let targetUuid = isUuid ? String(targetUserIdOrHandle) : null;
      let cleanHandle = isUuid ? '' : String(targetUserIdOrHandle).replace(/^@/, '');

      if (!targetUuid || !cleanHandle) {
        const matched = allPosts.find(
          (p) =>
            (targetUuid && p.authorId === targetUuid) ||
            (cleanHandle && (p.handle === cleanHandle || p.handle === `@${cleanHandle}`)) ||
            (authorName && p.author === authorName)
        );
        if (matched) {
          if (!targetUuid && matched.authorId) targetUuid = matched.authorId;
          if (!cleanHandle && matched.handle) {
            cleanHandle = matched.handle.replace(/^@/, '');
          }
        }
      }

      if (targetUuid === currentUser.id || cleanHandle === currentUser.rawHandle) {
        console.warn('Cannot follow yourself');
        return;
      }

      const isUnfollowing =
        (targetUuid && followedHandles.includes(targetUuid)) ||
        (cleanHandle && (followedHandles.includes(cleanHandle) || followedHandles.includes(`@${cleanHandle}`)));

      // Optimistic update
      setFollowedHandles((prev) => {
        if (isUnfollowing) {
          return prev.filter(
            (h) =>
              h !== cleanHandle &&
              h !== `@${cleanHandle}` &&
              h !== targetUuid
          );
        }
        const toAdd = [];
        if (cleanHandle) {
          toAdd.push(cleanHandle, `@${cleanHandle}`);
        }
        if (targetUuid) toAdd.push(targetUuid);
        return [...prev, ...toAdd];
      });

      try {
        if (targetUuid) {
          if (isUnfollowing) {
            await unfollowUserRequest(targetUuid);
          } else {
            await followUserRequest(targetUuid);
          }
        }
      } catch (err) {
        // Rollback on failure
        setFollowedHandles((prev) => {
          if (isUnfollowing) {
            const toAdd = [];
            if (cleanHandle) {
              toAdd.push(cleanHandle, `@${cleanHandle}`);
            }
            if (targetUuid) toAdd.push(targetUuid);
            return [...prev, ...toAdd];
          }
          return prev.filter(
            (h) =>
              h !== cleanHandle &&
              h !== `@${cleanHandle}` &&
              h !== targetUuid
          );
        });
        eventEmitter.emit('error', {
          message: `Failed to update follow status: ${err.message}`,
        });
      }
    },
    [currentUser, followedHandles, allPosts]
  );

  // ─── Post Lifecycle: Create (P0-05) ───
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

  // ─── Post Lifecycle: Edit Post (P0-05: 30-min window & expectedVersion) ───
  const handleEditPost = useCallback(
    async (postId, newText, expectedVersion) => {
      const { post: updatedRecord, requestId } = await updatePostRequest(
        postId,
        newText,
        expectedVersion
      );

      if (requestId) {
        setDisplayedRequestId(requestId);
      }

      updatePostById(postId, (post) => ({
        ...post,
        content: newText,
        version: (post.version || 1) + 1,
        isEdited: true,
        editedAt: new Date().toISOString(),
      }));

      eventEmitter.emit('like', {
        message: 'Post updated successfully',
      });
    },
    [updatePostById]
  );

  // ─── Post Lifecycle: Delete Post (P0-05: Soft delete) ───
  const handleDeletePost = useCallback(
    async (postId) => {
      try {
        const { requestId } = await deletePostRequest(postId);
        if (requestId) {
          setDisplayedRequestId(requestId);
        }

        setLocalPosts((prev) => prev.filter((p) => p.id !== postId));
        setApiPosts((prev) => prev.filter((p) => p.id !== postId));
        setSearchResults((prev) =>
          prev ? prev.filter((p) => p.id !== postId) : null
        );

        eventEmitter.emit('like', {
          message: 'Post deleted successfully',
        });
      } catch (err) {
        eventEmitter.emit('error', {
          message: err.message || 'Failed to delete post',
        });
      }
    },
    []
  );

  // ─── Backend Search ───
  const handleSearch = useCallback(async (query) => {
    const trimmed = typeof query === 'string' ? query.trim() : '';
    setSearchQuery(trimmed);

    if (!trimmed) {
      setSearchResults(null);
      setError(null);
      setErrorRequestId(null);
      return;
    }

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

  // ─── Navigation Handlers (Fix #2 & Fix #6) ───
  const handleNavigate = useCallback(
    (navId) => {
      setIsMobileDrawerOpen(false);

      if (navId === 'compose') {
        if (!currentUser) {
          setAuthInitialTab('login');
          setIsAuthModalOpen(true);
          return;
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });

        if (activeNav !== 'home') {
          setActiveNav('home');
          setTimeout(() => {
            composerRef.current?.focusInput();
          }, 50);
        } else {
          composerRef.current?.focusInput();
        }
        return;
      }

      if (navId === 'profile') {
        if (!currentUser) {
          setAuthInitialTab('login');
          setIsAuthModalOpen(true);
          return;
        }
        setViewingProfileId(currentUser.id);
        setActiveNav('profile');
        return;
      }

      if (navId === 'notifications') {
        if (!currentUser) {
          setAuthInitialTab('login');
          setIsAuthModalOpen(true);
          return;
        }
        setActiveNav('notifications');
        return;
      }

      setActiveNav(navId);
      setSearchResults(null);
      setSearchQuery('');
    },
    [currentUser, activeNav]
  );

  const handleViewUserProfile = useCallback((targetUserId) => {
    setViewingProfileId(targetUserId);
    setActiveNav('profile');
  }, []);

  // ─── Auth Handlers (P0-01) ───
  const handleAuthSuccess = useCallback((user) => {
    const userObj = {
      id: user.id,
      name: user.displayName,
      handle: user.handle?.startsWith('@') ? user.handle : `@${user.handle}`,
      rawHandle: user.handle?.replace(/^@/, ''),
      avatar: resolveImageUrl(user.avatar?.smallUrl) || DEFAULT_AVATAR,
    };
    setCurrentUser(userObj);

    enrichCurrentUser(user);

    fetchUnreadCount()
      .then(({ unreadCount }) => setUnreadNotificationsCount(unreadCount))
      .catch(() => {});

    // Fix #4: max limit is 50; store both handles and IDs
    fetchFollowing(user.id, null, 50)
      .then(({ items }) => {
        if (!items) return;
        const normalized = [];
        items.forEach((f) => {
          if (f.id) normalized.push(f.id);
          if (f.handle) {
            const clean = f.handle.replace(/^@/, '');
            normalized.push(clean);
            normalized.push(`@${clean}`);
          }
        });
        setFollowedHandles(normalized);
      })
      .catch(() => {});
  }, [enrichCurrentUser]);

  const handleLogout = useCallback(async () => {
    try {
      await logoutUser();
    } catch {
      // Clear local session state regardless
    }
    setCurrentUser(null);
    setFollowedHandles([]);
    setUnreadNotificationsCount(0);
    setActiveNav('home');
    cursorRef.current = null;
    loadPosts(true);
  }, [loadPosts]);

  const handleUpdateCurrentUser = useCallback((updates) => {
    setCurrentUser((prev) => ({
      ...prev,
      ...updates,
    }));
  }, []);

  return (
    <div className="home-layout home">
      {/* Mobile Top Navigation Header (Fix #6) */}
      <header className="mobile-header">
        <button
          className="mobile-header__hamburger"
          onClick={() => setIsMobileDrawerOpen(true)}
          aria-label="Open navigation menu"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
            <path d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z" />
          </svg>
        </button>
        <div className="mobile-header__logo">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </div>
        <div className="mobile-header__spacer" />
      </header>

      {/* Mobile Drawer Dark Backdrop Overlay (Fix #6) */}
      {isMobileDrawerOpen && (
        <div
          className="sidebar-mobile-overlay"
          onClick={() => setIsMobileDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar: Navigation & Identity (P0-01, P0-06, Fix #2, Fix #6) */}
      <Sidebar
        onNavigate={handleNavigate}
        activeItem={activeNav}
        currentUser={currentUser}
        unreadCount={unreadNotificationsCount}
        onOpenAuth={() => {
          setAuthInitialTab('login');
          setIsAuthModalOpen(true);
        }}
        onLogout={handleLogout}
        isMobileOpen={isMobileDrawerOpen}
        onCloseMobile={() => setIsMobileDrawerOpen(false)}
      />

      {/* Main Content Router */}
      {activeNav === 'home' && (
        <Feed
          posts={displayedPosts}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onPost={handleNewPost}
          onLike={handleLike}
          onRetweet={handleRetweet}
          onComment={handleComment}
          onFollow={handleFollow}
          onEdit={handleEditPost}
          onDelete={handleDeletePost}
          onViewUserProfile={handleViewUserProfile}
          followedHandles={followedHandles}
          currentUser={currentUser}
          isLoading={isLoading}
          error={error}
          errorRequestId={errorRequestId}
          displayedRequestId={displayedRequestId}
          onRequestIdUpdate={setDisplayedRequestId}
          onRetry={handleRetry}
          hasMore={searchResults !== null ? false : hasMore}
          sentinelRef={sentinelRef}
          searchQuery={searchQuery}
          onOpenAuth={() => {
            setAuthInitialTab('login');
            setIsAuthModalOpen(true);
          }}
          composerRef={composerRef}
        />
      )}

      {activeNav === 'explore' && (
        <Explore
          posts={allPosts}
          onLike={handleLike}
          onRetweet={handleRetweet}
          onComment={handleComment}
          onFollow={handleFollow}
          onEdit={handleEditPost}
          onDelete={handleDeletePost}
          onViewUserProfile={handleViewUserProfile}
          followedHandles={followedHandles}
          currentUser={currentUser}
          onOpenAuth={() => {
            setAuthInitialTab('login');
            setIsAuthModalOpen(true);
          }}
        />
      )}

      {activeNav === 'notifications' && (
        <Notifications
          currentUser={currentUser}
          onUnreadCountChange={setUnreadNotificationsCount}
        />
      )}

      {activeNav === 'profile' && (
        <Profile
          userId={viewingProfileId || currentUser?.id}
          currentUser={currentUser}
          posts={allPosts}
          onLike={handleLike}
          onRetweet={handleRetweet}
          onComment={handleComment}
          onFollow={handleFollow}
          onEdit={handleEditPost}
          onDelete={handleDeletePost}
          followedHandles={followedHandles}
          onOpenAuth={() => {
            setAuthInitialTab('login');
            setIsAuthModalOpen(true);
          }}
          onBack={() => setActiveNav('home')}
          onLogout={handleLogout}
          onUpdateCurrentUser={handleUpdateCurrentUser}
          onViewUserProfile={handleViewUserProfile}
        />
      )}

      {/* Right Column: Search, Premium Card, and Trending */}
      <RightSidebar onSearch={handleSearch} />

      {/* Authentication Modal Dialog (P0-01) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
        initialTab={authInitialTab}
      />
    </div>
  );
};

export default Home;
