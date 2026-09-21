import React from 'react';
import TweetCard from '../TweetCard/TweetCard.jsx';
import TweetComposer from '../TweetComposer/TweetComposer.jsx';
import LoadingSkeleton from '../LoadingSkeleton/LoadingSkeleton.jsx';
import ErrorState from '../ErrorState/ErrorState.jsx';
import './Feed.css';

/**
 * Feed — Center column containing tabs, tweet composer, and the tweet list.
 *
 * Receives already-processed (piped) posts from Home or search results.
 * Renders TweetCards, loading skeletons, error state, and the
 * infinite-scroll sentinel element.
 *
 * Displays the canonical Request ID in the header and in error states
 * to guarantee 1:1 match with response headers.
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
  followedHandles,
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

      {/* Canonical Request ID Display Badge */}
      {displayedRequestId && (
        <div
          className="feed__request-id-badge"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '6px 16px',
            fontSize: '12px',
            color: 'var(--text-secondary)',
            backgroundColor: 'rgba(29, 155, 240, 0.05)',
            borderBottom: '1px solid var(--border-color)',
            fontFamily: 'monospace',
          }}
        >
          <span>X-Request-ID:</span>
          <span
            data-testid="displayed-request-id"
            style={{ fontWeight: 600, color: 'var(--text-primary)' }}
          >
            {displayedRequestId}
          </span>
        </div>
      )}

      {/* Tweet Composer */}
      <TweetComposer onPost={onPost} />

      {/* Search "No Results" state */}
      {searchQuery && posts.length === 0 && !isLoading && !error && (
        <div className="feed__no-results" role="status">
          <h2>No results found</h2>
          <p>Try searching for something else, or check your spelling.</p>
        </div>
      )}

      {/* Tweet List */}
      <div className="feed__list" role="feed" aria-label="Tweets">
        {posts.map((tweet) => (
          <TweetCard
            key={tweet.id}
            tweet={tweet}
            onLike={onLike}
            onRetweet={onRetweet}
            onComment={onComment}
            onFollow={onFollow}
            isFollowing={followedHandles.includes(tweet.handle)}
            currentUser={currentUser}
            onRequestIdUpdate={onRequestIdUpdate}
          />
        ))}
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
