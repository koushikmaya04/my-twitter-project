import React, { useCallback } from 'react';
import './TweetActions.css';

/**
 * TweetActions — Like, Comment, Retweet, Share action bar.
 * 
 * DEMONSTRATES: Optimistic UI pattern.
 * When the user clicks Like:
 * 1. UI updates IMMEDIATELY (optimistic)
 * 2. Simulated API call runs in background
 * 3. On success: keep the change
 * 4. On failure: ROLLBACK to previous state + show error toast
 * 
 * The UI feels instant because we don't wait for the API.
 */
const TweetActions = ({ tweet, onLike, onRetweet, onToggleComments, commentCount }) => {
  const handleLike = useCallback(
    (e) => {
      e.stopPropagation();
      onLike?.(tweet.id);
    },
    [onLike, tweet.id]
  );

  const handleRetweet = useCallback(
    (e) => {
      e.stopPropagation();
      onRetweet?.(tweet.id);
    },
    [onRetweet, tweet.id]
  );

  const handleComment = useCallback(
    (e) => {
      e.stopPropagation();
      onToggleComments?.();
    },
    [onToggleComments]
  );

  const handleShare = useCallback((e) => {
    e.stopPropagation();
  }, []);

  /**
   * Format numbers for display (e.g., 1200 -> "1.2K")
   */
  const formatCount = (count) => {
    if (!count || count === 0) return '';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <div className="tweet-actions">
      {/* Comment */}
      <button
        className="tweet-actions__btn tweet-actions__btn--comment"
        onClick={handleComment}
        title="Reply"
      >
        <div className="tweet-actions__icon-wrapper">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.067c-4.49.1-8.183-3.51-8.183-8.01zm8.005-6c-3.317 0-6.005 2.69-6.005 6 0 3.37 2.77 6.08 6.138 6.01l.351-.01h1.761v2.3l5.087-2.81c1.951-1.08 3.163-3.13 3.163-5.36 0-3.39-2.744-6.13-6.129-6.13H9.756z" />
          </svg>
        </div>
        <span className="tweet-actions__count">{formatCount(commentCount || tweet.commentCount)}</span>
      </button>

      {/* Retweet */}
      <button
        className={`tweet-actions__btn tweet-actions__btn--retweet ${tweet.isRetweeted ? 'tweet-actions__btn--retweeted' : ''}`}
        onClick={handleRetweet}
        title="Repost"
      >
        <div className="tweet-actions__icon-wrapper">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z" />
          </svg>
        </div>
        <span className="tweet-actions__count">{formatCount(tweet.retweetCount)}</span>
      </button>

      {/* Like - OPTIMISTIC UI */}
      <button
        className={`tweet-actions__btn tweet-actions__btn--like ${tweet.isLiked ? 'tweet-actions__btn--liked' : ''}`}
        onClick={handleLike}
        title="Like"
      >
        <div className="tweet-actions__icon-wrapper">
          {tweet.isLiked ? (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M20.884 13.19c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.36-2.5-1.45-4.55-.782-6.14.657-1.57 2.007-2.68 3.795-2.93 1.418-.2 2.988.26 4.371 1.54 1.383-1.28 2.953-1.74 4.371-1.54 1.788.25 3.138 1.36 3.795 2.93.668 1.59.578 3.64-.782 6.14z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.257 4.27 7.129 6.61 3.87-2.34 6.052-4.64 7.126-6.61 1.111-2.04 1.03-3.7.477-4.82-.561-1.13-1.666-1.84-2.908-1.91zm4.187 7.69c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.36-2.5-1.45-4.55-.782-6.14.657-1.57 2.007-2.68 3.795-2.93 1.137-.16 2.362.13 3.49.93 1.128-.8 2.353-1.09 3.49-.93 1.788.25 3.138 1.36 3.795 2.93.668 1.59.578 3.64-.782 6.14z" />
            </svg>
          )}
        </div>
        <span className="tweet-actions__count">{formatCount(tweet.likeCount)}</span>
      </button>

      {/* Share */}
      <button
        className="tweet-actions__btn tweet-actions__btn--share"
        onClick={handleShare}
        title="Share"
      >
        <div className="tweet-actions__icon-wrapper">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M12 2.59l5.7 5.7-1.41 1.42L13 6.41V16h-2V6.41l-3.3 3.3-1.41-1.42L12 2.59zM21 15l-.02 3.51c0 1.38-1.12 2.49-2.5 2.49H5.5C4.11 21 3 19.88 3 18.5V15h2v3.5c0 .28.22.5.5.5h12.98c.28 0 .5-.22.5-.5L19 15h2z" />
          </svg>
        </div>
      </button>
    </div>
  );
};

export default TweetActions;
