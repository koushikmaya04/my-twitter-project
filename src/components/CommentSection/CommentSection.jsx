import React, { useState, useCallback } from 'react';
import './CommentSection.css';

/**
 * CommentSection — Expandable comment/reply area for a tweet.
 * Supports optimistic comment adding and displays existing comments.
 */
const CommentSection = ({ tweetId, comments = [], onComment }) => {
  const [text, setText] = useState('');

  const handleSubmit = useCallback(() => {
    if (text.trim()) {
      onComment?.(tweetId, text.trim());
      setText('');
    }
  }, [text, tweetId, onComment]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  return (
    <div className="comment-section">
      {/* Existing comments */}
      {comments.length > 0 && (
        <div className="comment-section__list">
          {comments.map((comment) => (
            <div key={comment.id} className="comment-section__comment">
              <img
                className="comment-section__avatar"
                src={comment.avatar || 'https://i.pravatar.cc/32?img=68'}
                alt=""
              />
              <div className="comment-section__comment-body">
                <div className="comment-section__comment-header">
                  <span className="comment-section__comment-author">
                    {comment.author || 'Koushik Mayaaa'}
                  </span>
                  <span className="comment-section__comment-handle">
                    {comment.handle || '@KMayaaa7841'}
                  </span>
                </div>
                <p className="comment-section__comment-text">{comment.text}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Comment input */}
      <div className="comment-section__input-area">
        <img
          className="comment-section__input-avatar"
          src="https://i.pravatar.cc/32?img=68"
          alt="Your avatar"
        />
        <div className="comment-section__input-wrapper">
          <input
            className="comment-section__input"
            type="text"
            placeholder="Post your reply"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            className="comment-section__reply-btn"
            onClick={handleSubmit}
            disabled={!text.trim()}
          >
            Reply
          </button>
        </div>
      </div>
    </div>
  );
};

export default CommentSection;
