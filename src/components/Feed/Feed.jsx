import React from 'react';
import TweetCard from '../TweetCard/TweetCard.jsx';
import TweetComposer from '../TweetComposer/TweetComposer.jsx';
import LoadingSkeleton from '../LoadingSkeleton/LoadingSkeleton.jsx';
import ErrorState from '../ErrorState/ErrorState.jsx';
import './Feed.css';

/**
 * Feed — Center column containing tabs, tweet composer, and the tweet list.
 *
 * Receives already-processed (piped) posts from Home.
 * Renders TweetCards, loading skeletons, error state, and the
 * infinite-scroll sentinel element.
 *
 * Bug Fix #4: Uses post.id as React key (never array index).
 * Bug Fix #21: Adds aria-live for loading/error, aria-label for tabs.
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

      {/* Tweet Composer */}
      <TweetComposer onPost={onPost} />

      {/* Search "No Results" state */}
      {searchQuery && posts.length === 0 && !isLoading && !error && (
        <div className="feed__no-results" role="status">
          <h2>No results found</h2>
          <p>Try searching for something else, or check your spelling.</p>
        </div>
      )}

      {/* Tweet List — Bug Fix #4: key={tweet.id}, never key={index} */}
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
          />
        ))}
      </div>

      {/* Loading Skeleton — Bug Fix #21: aria-live announces loading */}
      <div aria-live="polite" aria-atomic="true">
        {isLoading && (
          <div role="status" aria-label="Loading more tweets">
            <LoadingSkeleton count={3} />
            <span className="sr-only">Loading more tweets...</span>
          </div>
        )}
      </div>

      {/* Error State — Bug Fix #21: role="alert" for screen readers */}
      {error && !isLoading && (
        <div role="alert">
          <ErrorState message={error} onRetry={onRetry} />
        </div>
      )}

      {/* Infinite Scroll Sentinel — observed by IntersectionObserver */}
      {hasMore && !error && (
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
