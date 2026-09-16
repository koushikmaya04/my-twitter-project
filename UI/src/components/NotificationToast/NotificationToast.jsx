import React from 'react';

/**
 * NotificationToast — Individual toast notification component.
 * Supports auto-dismiss and manual close.
 */
const NotificationToast = ({ notification, onDismiss }) => {
  return (
    <div
      className={`notification-toast notification-toast--${notification.type} ${
        notification.exiting ? 'notification-toast--exiting' : ''
      }`}
    >
      <span className="notification-toast__icon">{notification.icon}</span>
      <span className="notification-toast__message">{notification.message}</span>
      <button
        className="notification-toast__close"
        onClick={() => onDismiss(notification.id)}
      >
        <svg viewBox="0 0 15 15" width="14" height="14" fill="currentColor">
          <path d="M6.09 7.5L.04 1.46 1.46.04 7.5 6.09 13.54.04l1.42 1.42L8.91 7.5l6.05 6.04-1.42 1.42L7.5 8.91l-6.04 6.05-1.42-1.42L6.09 7.5z" />
        </svg>
      </button>
    </div>
  );
};

export default NotificationToast;
