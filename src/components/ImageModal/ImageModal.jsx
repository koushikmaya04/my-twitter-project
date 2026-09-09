import React, { useEffect, useCallback } from 'react';
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
 *
 * @param {Object} props
 * @param {Object} props.tweet - Current tweet domain object from parent state
 * @param {Function} props.onClose - Callback to close the modal
 * @param {Function} props.onLike - Parent like handler
 * @param {Function} props.onRetweet - Parent retweet handler
 * @param {Function} props.onComment - Parent comment handler
 * @param {Function} props.onToggleComments - Handler to toggle comments visibility
 * @param {boolean} [props.showComments] - Whether comments section is expanded
 * @param {number} [props.commentCount] - Current comment count
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

  if (!tweet || !tweet.imageUrl) return null;

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

      {/* Main image content */}
      <div className="image-modal__content" onClick={(e) => e.stopPropagation()}>
        <img
          className="image-modal__image"
          src={tweet.imageUrl}
          alt={tweet.content || `Image posted by ${tweet.author}`}
        />
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
