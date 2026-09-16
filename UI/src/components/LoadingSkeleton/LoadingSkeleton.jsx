import React from 'react';
import './LoadingSkeleton.css';

/**
 * LoadingSkeleton — Twitter-style skeleton loading cards.
 * Shown while fetching the next page of tweets.
 * Uses CSS shimmer animation for a polished loading effect.
 */
const LoadingSkeleton = ({ count = 3 }) => {
  return (
    <div className="loading-skeleton">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="skeleton-card">
          <div className="skeleton-card__body">
            {/* Avatar placeholder */}
            <div className="skeleton-card__avatar" />
            <div className="skeleton-card__content">
              {/* Header: name and handle */}
              <div className="skeleton-card__header">
                <div className="skeleton-card__name" />
                <div className="skeleton-card__handle" />
              </div>
              {/* Text lines */}
              <div className="skeleton-card__text-line skeleton-card__text-line--full" />
              <div className="skeleton-card__text-line skeleton-card__text-line--partial" />
              {/* Image placeholder */}
              <div className="skeleton-card__image" />
              {/* Actions placeholder */}
              <div className="skeleton-card__actions">
                <div className="skeleton-card__action" />
                <div className="skeleton-card__action" />
                <div className="skeleton-card__action" />
                <div className="skeleton-card__action" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default LoadingSkeleton;
