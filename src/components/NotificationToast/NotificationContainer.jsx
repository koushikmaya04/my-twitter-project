import React, { useState, useEffect, useCallback } from 'react';
import { eventEmitter } from '../../events/EventEmitter.js';
import NotificationToast from './NotificationToast.jsx';
import './NotificationToast.css';

/**
 * NotificationContainer — Manages the toast notification queue.
 * 
 * DEMONSTRATES: Observer Pattern consumer.
 * This component subscribes to EventEmitter events and displays
 * toast notifications. It is NOT tightly coupled to any specific
 * component — it only knows about events, not who emits them.
 */
const NotificationContainer = () => {
  const [notifications, setNotifications] = useState([]);

  /**
   * Add a notification to the queue.
   * Each notification gets a unique ID and auto-dismisses after 4 seconds.
   */
  const addNotification = useCallback((notification) => {
    const id = Date.now() + Math.random();
    const newNotification = { id, ...notification, exiting: false };
    setNotifications((prev) => [...prev, newNotification]);

    // Auto-remove after 4 seconds
    setTimeout(() => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, exiting: true } : n))
      );
      // Remove from DOM after exit animation
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }, 300);
    }, 4000);
  }, []);

  /**
   * Subscribe to EventEmitter events on mount.
   * Unsubscribe on unmount to prevent memory leaks.
   * 
   * DEMONSTRATES: Observer Pattern — this component reacts to events
   * without knowing which component emitted them.
   */
  useEffect(() => {
    const handleLike = (data) => {
      addNotification({
        type: 'like',
        message: data.message || `${data.username} liked your post`,
        icon: '❤️',
      });
    };

    const handleComment = (data) => {
      addNotification({
        type: 'comment',
        message: data.message || `${data.username} commented on your post`,
        icon: '💬',
      });
    };

    const handleRetweet = (data) => {
      addNotification({
        type: 'retweet',
        message: data.message || `${data.username} reposted your post`,
        icon: '🔁',
      });
    };

    const handleFollow = (data) => {
      addNotification({
        type: 'follow',
        message: data.message || `${data.followerName} followed you`,
        icon: '👤',
      });
    };

    const handleError = (data) => {
      addNotification({
        type: 'error',
        message: data.message || 'Something went wrong',
        icon: '⚠️',
      });
    };

    // Subscribe to all events
    const unsubs = [
      eventEmitter.on('like', handleLike),
      eventEmitter.on('comment', handleComment),
      eventEmitter.on('retweet', handleRetweet),
      eventEmitter.on('newFollower', handleFollow),
      eventEmitter.on('error', handleError),
    ];

    // Cleanup: unsubscribe all on unmount
    return () => unsubs.forEach((unsub) => unsub());
  }, [addNotification]);

  const handleDismiss = useCallback((id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, exiting: true } : n))
    );
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 300);
  }, []);

  return (
    <div className="notification-container">
      {notifications.map((notification) => (
        <NotificationToast
          key={notification.id}
          notification={notification}
          onDismiss={handleDismiss}
        />
      ))}
    </div>
  );
};

export default NotificationContainer;
