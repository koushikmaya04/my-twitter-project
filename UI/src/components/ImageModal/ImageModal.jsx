import React, { useEffect, useCallback, useState } from 'react';
import TweetActions from '../TweetActions/TweetActions.jsx';
import CommentSection from '../CommentSection/CommentSection.jsx';
import './ImageModal.css';

/**
 * ImageModal — Full-screen lightbox / image viewer modal for tweets.
 *
 * DEMONSTRATES:
 * - Single source of truth: All interaction states (likes, retweets, comments)
 *   are read directly from the current `tweet` prop owned by parent `posts` state.
 * - Event delegation & propagation control: Backdrop clicks close the modal,
 *   while image and action clicks are preserved.
 * - Accessible modal dialog pattern with `role="dialog"`, `aria-modal="true"`,
 *   accessible close button, keyboard Escape handling, and body scroll locking.
 * - Controlled image error UI: Shows a styled placeholder if image fails to load.
 */
const ImageModal = ({
  tweet,
  onClose,
  onLike,
  onRetweet,
  onComment,
  onToggleComments,
  showComments = false,
  commentCount,
}) => {
  const [imageError, setImageError] = useState(false);

  // Body scroll lock while modal is open
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

  // Close only if clicking the backdrop itself
  const handleBackdropClick = useCallback(
    (e) => {
      if (e.target === e.currentTarget) {
        onClose?.();
      }
    },
    [onClose]
  );

  if (!tweet) return null;

  return (
    <div
      className="image-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
      onClick={handleBackdropClick}
    >
      {/* Close button in top-left */}
      <button
        className="image-modal__close"
        onClick={(e) => {
          e.stopPropagation();
          onClose?.();
        }}
        aria-label="Close image viewer"
        title="Close"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
          <path d="M10.59 12L4.54 5.96l1.42-1.42L12 10.59l6.04-6.05 1.42 1.42L13.41 12l6.05 6.04-1.42 1.42L12 13.41l-6.04 6.05-1.42-1.42L10.59 12z" />
        </svg>
      </button>

      {/* Main content: image or text */}
      <div className="image-modal__content" onClick={(e) => e.stopPropagation()}>
        {tweet.imageUrl ? (
          !imageError ? (
            <img
              className="image-modal__image"
              src={tweet.imageUrl}
              alt={tweet.content || `Image posted by ${tweet.author}`}
              onError={() => setImageError(true)}
            />
          ) : (
            <div
              className="image-modal__error"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                color: '#71767b',
                gap: '12px',
                padding: '40px',
              }}
            >
              <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor">
                <path d="M3 5.5C3 4.119 4.119 3 5.5 3h13C19.881 3 21 4.119 21 5.5v13c0 1.381-1.119 2.5-2.5 2.5h-13C4.119 21 3 19.881 3 18.5v-13zM5.5 5c-.276 0-.5.224-.5.5v9.086l3-3 3 3 5-5 3 3V5.5c0-.276-.224-.5-.5-.5h-13z" />
              </svg>
              <span style={{ fontSize: '15px' }}>Image unavailable</span>
            </div>
          )
        ) : (
          <div
            className="image-modal__text-card"
            style={{
              maxWidth: '600px',
              padding: '24px',
              backgroundColor: '#16181c',
              borderRadius: '16px',
              color: '#fff',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <img
                src={tweet.avatar}
                alt=""
                style={{ width: '40px', height: '40px', borderRadius: '50%' }}
              />
              <div>
                <div style={{ fontWeight: 700 }}>{tweet.author}</div>
                <div style={{ color: '#71767b', fontSize: '14px' }}>{tweet.handle}</div>
              </div>
            </div>
            <p style={{ fontSize: '18px', lineHeight: '1.4' }}>{tweet.content}</p>
          </div>
        )}
      </div>

      {/* Action bar and expandable comments reusing existing components */}
      <div
        className="image-modal__actions-container"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="image-modal__actions">
          <TweetActions
            tweet={tweet}
            onLike={onLike}
            onRetweet={onRetweet}
            onToggleComments={onToggleComments}
            commentCount={commentCount ?? tweet.commentCount}
          />
        </div>

        {showComments && (
          <div className="image-modal__comments">
            <CommentSection
              tweetId={tweet.id}
              comments={tweet.comments || []}
              onComment={onComment}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageModal;
