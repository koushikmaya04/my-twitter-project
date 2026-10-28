import React, { useState, useCallback, useEffect } from 'react';
import { fetchReplies, resolveImageUrl } from '../../services/api.js';
import { DEFAULT_AVATAR } from '../../utils/constants.js';
import './CommentSection.css';

/**
 * CommentSection — Expandable comment/reply area for a tweet.
 * Fetches real persisted replies from GET /posts/:id/replies and supports optimistic replies.
 */
const CommentSection = ({
  tweetId,
  comments = [],
  onComment,
  currentUser,
  onOpenAuth,
}) => {
  const [text, setText] = useState('');
  const [serverReplies, setServerReplies] = useState([]);
  const [isLoadingReplies, setIsLoadingReplies] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (tweetId) {
      setIsLoadingReplies(true);
      fetchReplies(tweetId)
        .then(({ replies }) => {
          if (isMounted) {
            setServerReplies(replies);
          }
        })
        .catch((err) => {
          console.warn('Failed to load replies:', err);
        })
        .finally(() => {
          if (isMounted) setIsLoadingReplies(false);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [tweetId]);

  const handleSubmit = useCallback(() => {
    if (!currentUser) {
      onOpenAuth?.();
      return;
    }
    if (text.trim()) {
      onComment?.(tweetId, text.trim());
      setText('');
    }
  }, [text, tweetId, onComment, currentUser, onOpenAuth]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const userAvatar = currentUser
    ? resolveImageUrl(currentUser.avatar?.smallUrl || currentUser.avatar) ||
      DEFAULT_AVATAR
    : DEFAULT_AVATAR;

  // Combine server replies and local optimistic comments without duplicates
  const allComments = [...serverReplies, ...comments];
  const uniqueComments = allComments.filter(
    (c, index, self) => index === self.findIndex((item) => item.id === c.id)
  );

  return (
    <div className="comment-section">
      {/* Existing comments */}
      {uniqueComments.length > 0 && (
        <div className="comment-section__list">
          {uniqueComments.map((comment) => {
            const avatar =
              resolveImageUrl(comment.avatar?.smallUrl || comment.avatar) ||
              DEFAULT_AVATAR;
            const authorName = comment.author || 'User';
            const handleText = comment.handle?.startsWith('@')
              ? comment.handle
              : `@${comment.handle || 'user'}`;

            return (
              <div key={comment.id} className="comment-section__comment">
                <img
                  className="comment-section__avatar"
                  src={avatar}
                  alt=""
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = DEFAULT_AVATAR;
                  }}
                />
                <div className="comment-section__comment-body">
                  <div className="comment-section__comment-header">
                    <span className="comment-section__comment-author">
                      {authorName}
                    </span>
                    <span className="comment-section__comment-handle">
                      {handleText}
                    </span>
                  </div>
                  <p className="comment-section__comment-text">
                    {comment.content || comment.text}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isLoadingReplies && (
        <div
          style={{
            padding: '8px 16px',
            fontSize: '13px',
            color: 'var(--text-secondary)',
          }}
        >
          Loading replies...
        </div>
      )}

      {/* Comment input */}
      <div className="comment-section__input-area">
        <img
          className="comment-section__input-avatar"
          src={userAvatar}
          alt=""
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = DEFAULT_AVATAR;
          }}
        />
        <div
          className="comment-section__input-wrapper"
          onClick={() => {
            if (!currentUser) onOpenAuth?.();
          }}
        >
          <input
            className="comment-section__input"
            type="text"
            placeholder={currentUser ? 'Post your reply' : 'Sign in to reply'}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            readOnly={!currentUser}
          />
          <button
            className="comment-section__reply-btn"
            onClick={handleSubmit}
            disabled={!text.trim() && Boolean(currentUser)}
          >
            Reply
          </button>
        </div>
      </div>
    </div>
  );
};

export default CommentSection;
