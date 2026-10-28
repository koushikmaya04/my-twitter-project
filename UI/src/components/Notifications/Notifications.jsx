import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  resolveImageUrl,
} from '../../services/api.js';
import { DEFAULT_AVATAR } from '../../utils/constants.js';
import LoadingSkeleton from '../LoadingSkeleton/LoadingSkeleton.jsx';
import ErrorState from '../ErrorState/ErrorState.jsx';
import './Notifications.css';

/**
 * Notifications — Inbox view for JS-P0-06.
 * Supports cursor pagination, unread badge, and mark one/all as read.
 */
const Notifications = ({ currentUser, onUnreadCountChange }) => {
  const [notifications, setNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'unread'
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const cursorRef = useRef(null);
  const isFetchingRef = useRef(false);

  const loadNotifications = useCallback(async (isReset = false) => {
    if (isFetchingRef.current) return;

    isFetchingRef.current = true;
    setIsLoading(true);
    setError(null);

    const cursorToUse = isReset ? null : cursorRef.current;

    try {
      const { items, nextCursor, hasMore: more } = await fetchNotifications(
        cursorToUse,
        20
      );

      setNotifications((prev) => (isReset ? items : [...prev, ...items]));
      setHasMore(more);
      cursorRef.current = nextCursor;
    } catch (err) {
      setError(err.message || 'Failed to load notifications');
    } finally {
      isFetchingRef.current = false;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications(true);
  }, [loadNotifications]);

  const handleMarkAllRead = useCallback(async () => {
    if (isMarkingAll) return;
    setIsMarkingAll(true);

    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          isRead: true,
          readAt: n.readAt || new Date().toISOString(),
        }))
      );
      onUnreadCountChange?.(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    } finally {
      setIsMarkingAll(false);
    }
  }, [isMarkingAll, onUnreadCountChange]);

  const handleMarkOneRead = useCallback(
    async (notificationId) => {
      try {
        await markNotificationAsRead(notificationId);
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId
              ? { ...n, isRead: true, readAt: new Date().toISOString() }
              : n
          )
        );
        onUnreadCountChange?.((prev) => Math.max(0, prev - 1));
      } catch (err) {
        console.error('Failed to mark notification as read:', err);
      }
    },
    [onUnreadCountChange]
  );

  const formatTime = (isoString) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'now';
      if (diffMins < 60) return `${diffMins}m`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d`;
    } catch {
      return '';
    }
  };

  const displayedNotifications =
    activeTab === 'unread'
      ? notifications.filter((n) => !n.isRead)
      : notifications;

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="notifications-view" role="region" aria-label="Notifications inbox">
      {/* Header */}
      <div className="notifications-view__header">
        <div className="notifications-view__title-area">
          <h1 className="notifications-view__title">Notifications</h1>
          {unreadCount > 0 && (
            <span className="notifications-view__unread-badge">
              {unreadCount} unread
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            className="notifications-view__mark-all-btn"
            onClick={handleMarkAllRead}
            disabled={isMarkingAll}
            aria-label="Mark all notifications as read"
          >
            {isMarkingAll ? 'Marking...' : 'Mark all as read'}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="notifications-view__tabs" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === 'all'}
          className={`notifications-view__tab ${activeTab === 'all' ? 'notifications-view__tab--active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          All
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'unread'}
          className={`notifications-view__tab ${activeTab === 'unread' ? 'notifications-view__tab--active' : ''}`}
          onClick={() => setActiveTab('unread')}
        >
          Unread {unreadCount > 0 ? `(${unreadCount})` : ''}
        </button>
      </div>

      {/* Notifications List */}
      <div className="notifications-view__list" role="feed">
        {displayedNotifications.map((n) => {
          const actorAvatar =
            resolveImageUrl(n.actor?.avatar?.smallUrl) ||
            DEFAULT_AVATAR;
          const actorHandle = n.actor?.handle?.startsWith('@')
            ? n.actor.handle
            : `@${n.actor?.handle || 'user'}`;

          return (
            <article
              key={n.id}
              className={`notification-item ${!n.isRead ? 'notification-item--unread' : ''}`}
              onClick={() => {
                if (!n.isRead) handleMarkOneRead(n.id);
              }}
            >
              {/* Type Icon */}
              <div className="notification-item__icon-col">
                {n.type === 'like' && (
                  <div className="notification-item__icon notification-item__icon--like">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                      <path d="M20.884 13.19c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.36-2.5-1.45-4.55-.782-6.14.657-1.57 2.007-2.68 3.795-2.93 1.418-.2 2.988.26 4.371 1.54 1.383-1.28 2.953-1.74 4.371-1.54 1.788.25 3.138 1.36 3.795 2.93.668 1.59.578 3.64-.782 6.14z" />
                    </svg>
                  </div>
                )}
                {n.type === 'follow' && (
                  <div className="notification-item__icon notification-item__icon--follow">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
                    </svg>
                  </div>
                )}
                {n.type === 'reply' && (
                  <div className="notification-item__icon notification-item__icon--reply">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                      <path d="M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.067c-4.49.1-8.183-3.51-8.183-8.01zm8.005-6c-3.317 0-6.005 2.69-6.005 6 0 3.37 2.77 6.08 6.138 6.01l.351-.01h1.761v2.3l5.087-2.81c1.951-1.08 3.163-3.13 3.163-5.36 0-3.39-2.744-6.13-6.129-6.13H9.756z" />
                    </svg>
                  </div>
                )}
                {n.type === 'repost' && (
                  <div className="notification-item__icon notification-item__icon--repost">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                      <path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="notification-item__content">
                <div className="notification-item__actor-row">
                  <div className="notification-item__actor-info">
                    <img
                      className="notification-item__avatar"
                      src={actorAvatar}
                      alt=""
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = DEFAULT_AVATAR;
                      }}
                    />
                    <div className="notification-item__names">
                      <span className="notification-item__display-name">
                        {n.actor?.displayName || 'User'}
                      </span>
                      <span className="notification-item__handle">{actorHandle}</span>
                    </div>
                  </div>
                  <div className="notification-item__meta">
                    <span className="notification-item__time">
                      {formatTime(n.createdAt)}
                    </span>
                    {!n.isRead && (
                      <span
                        className="notification-item__unread-dot"
                        title="Unread notification"
                      />
                    )}
                  </div>
                </div>

                <p className="notification-item__text">
                  {n.type === 'like' && 'liked your post'}
                  {n.type === 'follow' && 'started following you'}
                  {n.type === 'repost' && 'reposted your post'}
                  {n.type === 'reply' &&
                    `replied: "${n.reply?.text || '...'}"`}
                </p>

                {n.post?.text && (
                  <div className="notification-item__post-preview">
                    "{n.post.text}"
                  </div>
                )}

                {!n.isRead && (
                  <button
                    className="notification-item__mark-read-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkOneRead(n.id);
                    }}
                  >
                    Mark as read
                  </button>
                )}
              </div>
            </article>
          );
        })}

        {displayedNotifications.length === 0 && !isLoading && !error && (
          <div className="notifications-view__empty">
            <h2 className="notifications-view__empty-title">Nothing to see here — yet</h2>
            <p>
              {activeTab === 'unread'
                ? 'You have no unread notifications.'
                : 'When someone likes, reposts, or replies to your posts, you will see it here.'}
            </p>
          </div>
        )}

        {isLoading && <LoadingSkeleton count={3} />}

        {error && !isLoading && (
          <ErrorState
            message={error}
            onRetry={() => loadNotifications(true)}
          />
        )}

        {hasMore && !isLoading && !error && (
          <div className="notifications-view__load-more">
            <button
              className="notifications-view__load-more-btn"
              onClick={() => loadNotifications(false)}
            >
              Load more
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
