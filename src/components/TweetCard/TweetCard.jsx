import React, { useState, useCallback, memo } from 'react';
import TweetActions from '../TweetActions/TweetActions.jsx';
import CommentSection from '../CommentSection/CommentSection.jsx';
import { useLazyImages } from '../../hooks/useLazyImages.js';
import './TweetCard.css';

/**
 * TweetCard — Displays a single tweet in the feed.
 * Uses lazy image loading with concurrency queue (max 3).
 * Memoized with React.memo to prevent unnecessary re-renders.
 *
 * Bug Fix #1: Self-follow prevention — no Follow button if tweet.handle === currentUser.handle
 * Bug Fix #11: Image fallback — shows placeholder on image load failure
 * Bug Fix #21: Accessibility — aria-label on buttons, alt text on images
 */
const TweetCard = memo(({ tweet, onLike, onRetweet, onComment, onFollow, isFollowing, currentUser }) => {
  const [showComments, setShowComments] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const { imgRef, src: imageSrc, isLoaded: imageLoaded, hasError: imageError } = useLazyImages(
    tweet.thumbnailUrl,
    tweet.imageUrl
  );

  const handleToggleComments = useCallback(() => {
    setShowComments((prev) => !prev);
  }, []);

  /**
   * Bug Fix #11: Handle image load failure gracefully.
   * Shows a styled fallback placeholder instead of a broken image.
   */
  const handleImageError = useCallback(() => {
    setImageFailed(true);
  }, []);

  /**
   * Bug Fix #1: Determine if this tweet belongs to the current user.
   * If so, we NEVER show the Follow button, and the user cannot follow themselves.
   */
  const isOwnTweet = currentUser && tweet.handle === currentUser.handle;

  return (
    <article className="tweet-card" aria-label={`Tweet by ${tweet.author}`}>
      {/* Retweet header */}
      {tweet.type === 'retweet' && (
        <div className="tweet-card__retweet-header">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
            <path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z" />
          </svg>
          <span>{tweet.retweetedBy} reposted</span>
        </div>
      )}

      <div className="tweet-card__body">
        {/* Avatar */}
        <div className="tweet-card__avatar-col">
          <img
            className="tweet-card__avatar"
            src={tweet.avatar}
            alt=""
            aria-hidden="true"
            loading="lazy"
          />
        </div>

        {/* Content */}
        <div className="tweet-card__content">
          {/* Header: name, handle, timestamp */}
          <div className="tweet-card__header">
            <div className="tweet-card__author-info">
              <span className="tweet-card__author-name">{tweet.author}</span>
              {tweet.verified && (
                <svg className="tweet-card__verified" viewBox="0 0 22 22" width="18" height="18" fill="#1d9bf0" aria-label="Verified account">
                  <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.855-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.69-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.636.433 1.221.878 1.69.47.446 1.055.752 1.69.883.635.13 1.294.083 1.902-.143.271.586.702 1.084 1.24 1.438.54.354 1.167.551 1.813.569.646-.019 1.273-.216 1.813-.57.543-.355.975-.853 1.245-1.44.608.226 1.267.276 1.9.143.636-.13 1.22-.436 1.69-.88.445-.47.749-1.055.878-1.69.131-.634.084-1.292-.139-1.9.587-.272 1.084-.703 1.438-1.242.354-.54.551-1.168.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" />
                </svg>
              )}
              <span className="tweet-card__handle">{tweet.handle}</span>
              <span className="tweet-card__separator" aria-hidden="true">·</span>
              <time className="tweet-card__timestamp">{tweet.timestamp}</time>
            </div>
            <div className="tweet-card__header-actions">
              {/*
                Bug Fix #1: SELF-FOLLOW PREVENTION
                - If this is the current user's tweet, do NOT render Follow button
                - If already following, do NOT render Follow button
                - The underlying handler also has a guard, but hiding the button
                  prevents screen readers from encountering a misleading control
              */}
              {!isOwnTweet && !isFollowing && (
                <button
                  className="tweet-card__follow-btn"
                  onClick={() => onFollow?.(tweet.handle, tweet.author)}
                  aria-label={`Follow ${tweet.author}`}
                >
                  Follow
                </button>
              )}
              {isFollowing && !isOwnTweet && (
                <button
                  className="tweet-card__follow-btn tweet-card__follow-btn--following"
                  onClick={() => onFollow?.(tweet.handle, tweet.author)}
                  aria-label={`Unfollow ${tweet.author}`}
                >
                  Following
                </button>
              )}
              <button className="tweet-card__more-btn" aria-label="More options">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                  <path d="M3 12c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm9 2c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm7 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Tweet text */}
          <p className="tweet-card__text">{tweet.content}</p>

          {/* Tweet image (lazy loaded) — Bug Fix #11: graceful fallback */}
          {tweet.imageUrl && !imageFailed && (
            <div className="tweet-card__image-container" ref={imgRef}>
              <img
                className={`tweet-card__image ${imageLoaded ? 'tweet-card__image--loaded' : ''}`}
                src={imageSrc}
                alt={tweet.content}
                loading="lazy"
                onError={handleImageError}
              />
              {!imageLoaded && <div className="tweet-card__image-skeleton" />}
            </div>
          )}

          {/* Bug Fix #11: Fallback placeholder when image fails */}
          {tweet.imageUrl && imageFailed && (
            <div className="tweet-card__image-fallback" aria-label="Image could not be loaded">
              <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor" aria-hidden="true">
                <path d="M3 5.5C3 4.119 4.119 3 5.5 3h13C19.881 3 21 4.119 21 5.5v13c0 1.381-1.119 2.5-2.5 2.5h-13C4.119 21 3 19.881 3 18.5v-13zM5.5 5c-.276 0-.5.224-.5.5v9.086l3-3 3 3 5-5 3 3V5.5c0-.276-.224-.5-.5-.5h-13z" />
              </svg>
              <span>Image unavailable</span>
            </div>
          )}

          {/* Category tag */}
          {tweet.category && (
            <span className="tweet-card__category">#{tweet.category}</span>
          )}

          {/* Actions (like, comment, retweet, share) */}
          <TweetActions
            tweet={tweet}
            onLike={onLike}
            onRetweet={onRetweet}
            onToggleComments={handleToggleComments}
            commentCount={tweet.commentCount}
          />

          {/* Comment Section */}
          {showComments && (
            <CommentSection
              tweetId={tweet.id}
              comments={tweet.comments || []}
              onComment={onComment}
            />
          )}
        </div>
      </div>
    </article>
  );
});

TweetCard.displayName = 'TweetCard';
export default TweetCard;
