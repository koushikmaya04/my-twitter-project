import React, { useState, useCallback } from 'react';
import './TweetComposer.css';

/**
 * TweetComposer — "What's happening?" compose area at top of feed.
 * Allows users to compose new tweets and add them to the feed.
 */
const TweetComposer = ({ onPost }) => {
  const [text, setText] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = useCallback(() => {
    if (text.trim()) {
      onPost?.(text.trim());
      setText('');
      setIsFocused(false);
    }
  }, [text, onPost]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const toolbarIcons = [
    { id: 'media', path: 'M3 5.5C3 4.119 4.119 3 5.5 3h13C19.881 3 21 4.119 21 5.5v13c0 1.381-1.119 2.5-2.5 2.5h-13C4.119 21 3 19.881 3 18.5v-13zM5.5 5c-.276 0-.5.224-.5.5v9.086l3-3 3 3 5-5 3 3V5.5c0-.276-.224-.5-.5-.5h-13zM19 15.414l-3-3-5 5-3-3-3 3V18.5c0 .276.224.5.5.5h13c.276 0 .5-.224.5-.5v-3.086zM9.75 7a1.75 1.75 0 100 3.5 1.75 1.75 0 000-3.5z' },
    { id: 'gif', path: 'M3 5.5C3 4.119 4.12 3 5.5 3h13C19.88 3 21 4.119 21 5.5v13c0 1.381-1.12 2.5-2.5 2.5h-13C4.12 21 3 19.881 3 18.5v-13zM5.5 5c-.28 0-.5.224-.5.5v13c0 .276.22.5.5.5h13c.28 0 .5-.224.5-.5v-13c0-.276-.22-.5-.5-.5h-13zM15.5 9.5c0-.28.22-.5.5-.5h1c.28 0 .5.22.5.5v5c0 .28-.22.5-.5.5h-1c-.28 0-.5-.22-.5-.5v-5zm-7.5 0c0-.28.22-.5.5-.5H10c1.1 0 2 .9 2 2v3c0 1.1-.9 2-2 2H8.5c-.28 0-.5-.22-.5-.5v-6zm2 5c.55 0 1-.45 1-1v-3c0-.55-.45-1-1-1H10v5h0zm3-5c0-.28.22-.5.5-.5h2c.28 0 .5.22.5.5s-.22.5-.5.5H14v1.5h1.5c.28 0 .5.22.5.5s-.22.5-.5.5H14v2c0 .28-.22.5-.5.5s-.5-.22-.5-.5v-5z' },
    { id: 'emoji', path: 'M8 9.5C8 8.119 8.672 7 9.5 7S11 8.119 11 9.5 10.328 12 9.5 12 8 10.881 8 9.5zm6.5 2.5c.828 0 1.5-1.119 1.5-2.5S15.328 7 14.5 7 13 8.119 13 9.5s.672 2.5 1.5 2.5zM12 16c-2.224 0-3.021-2.227-3.051-2.316l-1.897.633c.05.15 1.271 3.684 4.949 3.684s4.898-3.533 4.949-3.684l-1.896-.638c-.033.095-.83 2.322-3.054 2.322zm10.25-4.001c0 5.66-4.59 10.25-10.25 10.25S1.75 17.66 1.75 12 6.34 1.75 12 1.75 22.25 6.34 22.25 12zM12 3.75c-4.56 0-8.25 3.69-8.25 8.25s3.69 8.25 8.25 8.25 8.25-3.69 8.25-8.25S16.56 3.75 12 3.75z' },
    { id: 'poll', path: 'M6 5c-1.1 0-2 .895-2 2s.9 2 2 2 2-.895 2-2-.9-2-2-2zM2 7c0-2.209 1.79-4 4-4s4 1.791 4 4-1.79 4-4 4-4-1.791-4-4zm20 1H12V6h10v2zM6 15c-1.1 0-2 .895-2 2s.9 2 2 2 2-.895 2-2-.9-2-2-2zm-4 2c0-2.209 1.79-4 4-4s4 1.791 4 4-1.79 4-4 4-4-1.791-4-4zm20 1H12v-2h10v2z' },
    { id: 'schedule', path: 'M6 3V2h2v1h6V2h2v1h1.5C18.88 3 20 4.119 20 5.5v13c0 1.381-1.12 2.5-2.5 2.5h-11C5.12 21 4 19.881 4 18.5v-13C4 4.119 5.12 3 6.5 3H6zm0 2h-.5c-.28 0-.5.224-.5.5V7h14v-1.5c0-.276-.22-.5-.5-.5H18v1h-2V5H8v1H6V5zM5 9v9.5c0 .276.22.5.5.5h13c.28 0 .5-.224.5-.5V9H5z' },
    { id: 'location', path: 'M12 7c-1.93 0-3.5 1.57-3.5 3.5S10.07 14 12 14s3.5-1.57 3.5-3.5S13.93 7 12 7zm0 5c-.83 0-1.5-.67-1.5-1.5S11.17 9 12 9s1.5.67 1.5 1.5S12.83 12 12 12zm-.01-10c-4.76 0-8.54 3.97-8.24 8.86.25 4.07 3.29 7.5 7.37 8.43.35.08.72.08 1.07 0 4.09-.93 7.12-4.36 7.37-8.43.3-4.89-3.48-8.86-8.24-8.86h-.33zm6.24 8.73c-.2 3.28-2.66 6.05-5.93 6.8-.18.04-.37.04-.55 0-3.27-.75-5.73-3.52-5.93-6.8-.24-3.94 2.8-7.13 6.62-7.13h.27c3.82 0 6.86 3.19 6.62 7.13h-.1z' },
  ];

  return (
    <div className={`tweet-composer ${isFocused ? 'tweet-composer--focused' : ''}`}>
      <div className="tweet-composer__inner">
        <img
          className="tweet-composer__avatar"
          src="https://i.pravatar.cc/40?img=68"
          alt="Your avatar"
        />
        <div className="tweet-composer__input-area">
          <textarea
            className="tweet-composer__textarea"
            placeholder="What's happening?"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onKeyDown={handleKeyDown}
            rows={isFocused ? 3 : 1}
          />
          <div className="tweet-composer__bottom">
            <div className="tweet-composer__toolbar">
              {toolbarIcons.map((icon) => (
                <button key={icon.id} className="tweet-composer__tool-btn" title={icon.id}>
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d={icon.path} />
                  </svg>
                </button>
              ))}
            </div>
            <button
              className="tweet-composer__post-btn"
              onClick={handleSubmit}
              disabled={!text.trim()}
            >
              Post
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TweetComposer;
