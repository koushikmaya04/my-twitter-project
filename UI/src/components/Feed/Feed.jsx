import React from 'react';
import TweetCard from '../TweetCard/TweetCard.jsx';
import TweetComposer from '../TweetComposer/TweetComposer.jsx';
import LoadingSkeleton from '../LoadingSkeleton/LoadingSkeleton.jsx';
import ErrorState from '../ErrorState/ErrorState.jsx';
import './Feed.css';

/**
 * Feed — Center column containing tabs, tweet composer, and the tweet list.
 * Supports:
 * - Public feed ("For you") and Personalized feed ("Following").
 * - Cursor pagination with sentinel element.
 * - Intentional empty feed state for Following feed (P0-04).
 * - Full post lifecycle: create, edit (30-min window), delete, like, reply, repost.
 */
const Feed = ({
  posts,
  activeTab,
  onTabChange,
  onPost,
  onLike,
  onRetweet,
  onComment,
  onFollow,
  onEdit,
  onDelete,
  onViewUserProfile,
  followedHandles = [],
  currentUser,
  isLoading,
  error,
  errorRequestId,
  displayedRequestId,
  onRequestIdUpdate,
  onRetry,
  hasMore,
  sentinelRef,
  searchQuery,
  onOpenAuth,
}) => {
  return (
    <main className="feed" role="main" aria-label="Tweet feed">
      {/* Tab Header: "For you" / "Following" */}
      <div className="feed__header" role="tablist" aria-label="Feed tabs">
        <button
          role="tab"
          aria-selected={activeTab === 'forYou'}
          className={`feed__tab ${activeTab === 'forYou' ? 'feed__tab--active' : ''}`}
          onClick={() => onTabChange('forYou')}
        >
          <span className="feed__tab-text">For you</span>
          {activeTab === 'forYou' && <div className="feed__tab-indicator" />}
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'following'}
          className={`feed__tab ${activeTab === 'following' ? 'feed__tab--active' : ''}`}
          onClick={() => onTabChange('following')}
        >
          <span className="feed__tab-text">Following</span>
          {activeTab === 'following' && <div className="feed__tab-indicator" />}
        </button>
      </div>

      {/* Tweet Composer */}
      <TweetComposer
        onPost={onPost}
        currentUser={currentUser}
        onOpenAuth={onOpenAuth}
      />

      {/* Search "No Results" state */}
      {searchQuery && posts.length === 0 && !isLoading && !error && (
        <div className="feed__no-results" role="status">
          <h2>No results found</h2>
          <p>Try searching for something else, or check your spelling.</p>
        </div>
      )}

      {/* Empty Following Feed State (P0-04 Decision: Intentional empty/onboarding state) */}
      {!searchQuery && activeTab === 'following' && posts.length === 0 && !isLoading && !error && (
        <div
          className="feed__empty-onboarding"
          role="status"
          style={{
            padding: '40px 24px',
            textAlign: 'center',
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
            Welcome to your Following timeline!
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15, maxWidth: 420, margin: '0 auto 16px', lineHeight: 1.5 }}>
            {currentUser
              ? "Follow accounts and authors you are interested in or post your own thoughts to see them here."
              : "Sign in to see tweets from the accounts you follow."}
          </p>
          {!currentUser && (
            <button
              onClick={onOpenAuth}
              style={{
                backgroundColor: 'var(--accent-blue)',
                color: '#fff',
                padding: '8px 20px',
                borderRadius: 9999,
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              Sign in
            </button>
          )}
        </div>
      )}

      {/* Tweet List */}
      <div className="feed__list" role="feed" aria-label="Tweets">
        {posts.map((tweet) => {
          const isFollowingThisTweet =
            followedHandles.includes(tweet.handle) ||
            followedHandles.includes(tweet.handle?.replace(/^@/, '')) ||
            (tweet.authorId && followedHandles.includes(tweet.authorId));

          return (
            <TweetCard
              key={tweet.id}
              tweet={tweet}
              onLike={onLike}
              onRetweet={onRetweet}
              onComment={onComment}
              onFollow={onFollow}
              onEdit={onEdit}
              onDelete={onDelete}
              onViewUserProfile={onViewUserProfile}
              isFollowing={isFollowingThisTweet}
              currentUser={currentUser}
              onRequestIdUpdate={onRequestIdUpdate}
              onOpenAuth={onOpenAuth}
            />
          );
        })}
      </div>

      {/* Loading Skeleton */}
      <div aria-live="polite" aria-atomic="true">
        {isLoading && (
          <div role="status" aria-label="Loading more tweets">
            <LoadingSkeleton count={3} />
            <span className="sr-only">Loading more tweets...</span>
          </div>
        )}
      </div>

      {/* Error State */}
      {error && !isLoading && (
        <div role="alert">
          <ErrorState
            message={error}
            requestId={errorRequestId || displayedRequestId}
            onRetry={onRetry}
          />
        </div>
      )}

      {/* Infinite Scroll Sentinel */}
      {hasMore && !error && !searchQuery && (
        <div ref={sentinelRef} className="feed__sentinel" aria-hidden="true" />
      )}

      {/* End of feed message */}
      {!hasMore && posts.length > 0 && !isLoading && (
        <div className="feed__end" role="status">
          <p>You've reached the end of the feed</p>
        </div>
      )}
    </main>
  );
};

export default Feed;
