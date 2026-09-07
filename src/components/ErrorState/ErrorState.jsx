import React from 'react';
import './ErrorState.css';

/**
 * ErrorState — Friendly error message with Retry button.
 * Shown when an API request fails.
 */
const ErrorState = ({ message, onRetry }) => {
  return (
    <div className="error-state">
      <div className="error-state__icon">
        <svg viewBox="0 0 24 24" width="36" height="36" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-2h2v2h-2zm0-4V7h2v6h-2z" />
        </svg>
      </div>
      <h3 className="error-state__title">Something went wrong</h3>
      <p className="error-state__message">{message || 'Failed to load tweets. Please try again.'}</p>
      <button className="error-state__retry-btn" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
};

export default ErrorState;
