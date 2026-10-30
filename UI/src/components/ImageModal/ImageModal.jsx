import React, { useEffect, useCallback, useState } from 'react';
import TweetActions from '../TweetActions/TweetActions.jsx';
import CommentSection from '../CommentSection/CommentSection.jsx';
import { DEFAULT_AVATAR } from '../../utils/constants.js';
import './ImageModal.css';

/**
 * ImageModal / PostDetailModal — Displays a full post details overlay with
 * author header, post text, media, actions bar, and live reply section.
 */
const ImageModal = ({
  tweet,
  onClose,
  onLike,
  onRetweet,
  onComment,
  currentUser,
  onOpenAuth,
  onViewUserProfile,
}) => {
  const [imageError, setImageError] = useState(false);

  // Body scroll lock without page layout shift
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Keyboard accessibility: Escape key closes modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  if (!tweet) return null;

  const authorAvatar = tweet.avatar || DEFAULT_AVATAR;
  const authorHandle = tweet.handle?.startsWith('@')
    ? tweet.handle
    : `@${tweet.handle || 'user'}`;

  const formatFullDate = (timestamp) => {
    if (!timestamp) return '';
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return timestamp;
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
        ' · ' +
        date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return timestamp;
    }
  };

  return (
    <div
      className="image-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Post details"
      onClick={onClose}
    >
      <div
        className="image-modal__card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header bar */}
        <div className="image-modal__header">
          <button
            className="image-modal__close-btn"
            onClick={onClose}
            aria-label="Close"
            title="Close"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M10.59 12L4.54 5.96l1.42-1.42L12 10.59l6.04-6.05 1.42 1.42L13.41 12l6.05 6.04-1.42 1.42L12 13.41l-6.04 6.05-1.42-1.42L10.59 12z" />
            </svg>
          </button>
          <span className="image-modal__header-title">Post</span>
        </div>

        {/* Scrollable post content area */}
        <div className="image-modal__scrollable">
          {/* Author row */}
          <div
            className="image-modal__author-row"
            onClick={() => {
              if (tweet.authorId) {
                onClose?.();
                onViewUserProfile?.(tweet.authorId);
              }
            }}
          >
            <img
              className="image-modal__avatar"
              src={authorAvatar}
              alt=""
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = DEFAULT_AVATAR;
              }}
            />
            <div className="image-modal__author-text">
              <span className="image-modal__author-name">{tweet.author}</span>
              <span className="image-modal__author-handle">{authorHandle}</span>
            </div>
          </div>

          {/* Post text */}
          {tweet.content && (
            <p className="image-modal__text">{tweet.content}</p>
          )}

          {/* Attached image if present */}
          {tweet.imageUrl && !imageError && (
            <div className="image-modal__media-container">
              <img
                className="image-modal__media-img"
                src={tweet.imageUrl}
                alt=""
                onError={() => setImageError(true)}
              />
            </div>
          )}

          {/* Timestamp */}
          <div className="image-modal__timestamp">
            {formatFullDate(tweet.timestamp || tweet.createdAt)}
          </div>

          {/* Metrics count banner if any */}
          <div className="image-modal__metrics-bar">
            <span className="image-modal__metric-item">
              <strong>{tweet.retweetCount || 0}</strong> Reposts
            </span>
            <span className="image-modal__metric-item">
              <strong>{tweet.likeCount ?? tweet.likes ?? 0}</strong> Likes
            </span>
          </div>

          {/* Actions Bar */}
          <div className="image-modal__actions-bar">
            <TweetActions
              tweet={tweet}
              onLike={onLike}
              onRetweet={onRetweet}
              onToggleComments={() => {}}
              commentCount={tweet.commentCount}
            />
          </div>

          {/* Comments / Replies Section */}
          <div className="image-modal__comments-wrapper">
            <CommentSection
              tweetId={tweet.id}
              comments={tweet.comments || []}
              onComment={onComment}
              currentUser={currentUser}
              onOpenAuth={onOpenAuth}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageModal;
