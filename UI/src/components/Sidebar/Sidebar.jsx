import React, { useState, useEffect, useRef } from 'react';
import { resolveImageUrl } from '../../services/api.js';
import { DEFAULT_AVATAR } from '../../utils/constants.js';
import './Sidebar.css';

/**
 * Sidebar — Left navigation panel matching Twitter/X desktop layout.
 * Displays real authenticated user identity, unread notification counter, and nav controls.
 *
 * In mobile view, acts as a slide-in drawer when isMobileOpen is true.
 */
const Sidebar = ({
  onNavigate,
  activeItem = 'home',
  currentUser,
  unreadCount = 0,
  onOpenAuth,
  onLogout,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close popup menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    {
      id: 'home',
      label: 'Home',
      icon: (
        <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
          <path d="M21.591 7.146L12.52 1.157c-.316-.21-.724-.21-1.04 0l-9.071 5.99c-.26.173-.409.456-.409.757v13.183c0 .502.418.913.929.913h5.953a.93.93 0 00.929-.913v-7.075h3.378v7.075c0 .502.418.913.929.913h5.953a.93.93 0 00.929-.913V7.903c0-.301-.158-.584-.409-.757z" />
        </svg>
      ),
    },
    {
      id: 'explore',
      label: 'Explore',
      icon: (
        <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
          <path d="M10.25 3.75c-3.59 0-6.5 2.91-6.5 6.5s2.91 6.5 6.5 6.5c1.795 0 3.419-.726 4.596-1.904 1.178-1.177 1.904-2.801 1.904-4.596 0-3.59-2.91-6.5-6.5-6.5zm-8.5 6.5c0-4.694 3.806-8.5 8.5-8.5s8.5 3.806 8.5 8.5c0 1.986-.682 3.815-1.824 5.262l4.781 4.781-1.414 1.414-4.781-4.781c-1.447 1.142-3.276 1.824-5.262 1.824-4.694 0-8.5-3.806-8.5-8.5z" />
        </svg>
      ),
    },
    {
      id: 'notifications',
      label: 'Notifications',
      badge: unreadCount,
      icon: (
        <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
          <path d="M19.993 9.042C19.48 5.017 16.054 2 11.996 2s-7.49 3.021-7.999 7.051L2.866 18H7.1c.463 2.282 2.481 4 4.9 4s4.437-1.718 4.9-4h4.236l-1.143-8.958zM12 20c-1.306 0-2.417-.835-2.829-2h5.658c-.412 1.165-1.523 2-2.829 2zm-6.866-4l.847-6.698C6.364 6.272 8.941 4 11.996 4s5.627 2.268 6.013 5.295L18.858 16H5.134z" />
        </svg>
      ),
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: (
        <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
          <path d="M5.651 19h12.698c-.337-1.8-1.023-3.21-1.945-4.19C15.318 13.65 13.838 13 12 13s-3.317.65-4.404 1.81c-.922.98-1.608 2.39-1.945 4.19zm.486-5.56C7.627 11.85 9.648 11 12 11s4.373.85 5.863 2.44c1.477 1.58 2.366 3.8 2.632 6.46l.11 1.1H3.395l.11-1.1c.266-2.66 1.155-4.88 2.632-6.46zM12 4c-1.105 0-2 .9-2 2s.895 2 2 2 2-.9 2-2-.895-2-2-2zM8 6c0-2.21 1.791-4 4-4s4 1.79 4 4-1.791 4-4 4-4-1.79-4-4z" />
        </svg>
      ),
    },
  ];

  const avatarUrl = currentUser
    ? resolveImageUrl(currentUser.avatar?.smallUrl || currentUser.avatar) ||
      DEFAULT_AVATAR
    : DEFAULT_AVATAR;

  const userDisplayName = currentUser?.name || currentUser?.displayName || 'User';
  const userHandle = currentUser?.handle?.startsWith('@')
    ? currentUser.handle
    : `@${currentUser?.handle || 'user'}`;

  const handleNavClick = (itemId) => {
    onCloseMobile?.();
    if (itemId === 'profile' && !currentUser) {
      onOpenAuth?.();
    } else if (itemId === 'notifications' && !currentUser) {
      onOpenAuth?.();
    } else {
      onNavigate?.(itemId);
    }
  };

  return (
    <aside className={`sidebar ${isMobileOpen ? 'sidebar--mobile-open' : ''}`}>
      <div className="sidebar__inner">
        {/* Mobile Drawer Header with Close Button */}
        {isMobileOpen && (
          <div className="sidebar__mobile-header">
            <span className="sidebar__mobile-title">Menu</span>
            <button
              className="sidebar__mobile-close-btn"
              onClick={onCloseMobile}
              aria-label="Close navigation menu"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M10.59 12L4.54 5.96l1.42-1.42L12 10.59l6.04-6.05 1.42 1.42L13.41 12l6.05 6.04-1.42 1.42L12 13.41l-6.04 6.05-1.42-1.42L10.59 12z" />
              </svg>
            </button>
          </div>
        )}

        {/* X Logo */}
        <div className="sidebar__logo">
          <button
            className="sidebar__logo-link"
            onClick={() => {
              onCloseMobile?.();
              onNavigate?.('home');
            }}
            aria-label="X Home"
          >
            <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="sidebar__nav" role="navigation" aria-label="Main menu">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`sidebar__nav-item ${activeItem === item.id ? 'sidebar__nav-item--active' : ''}`}
              aria-label={item.label}
              onClick={() => handleNavClick(item.id)}
            >
              <span className="sidebar__nav-icon">
                {item.icon}
                {Boolean(item.badge && item.badge > 0) && (
                  <span className="sidebar__badge">{item.badge > 99 ? '99+' : item.badge}</span>
                )}
              </span>
              <span className="sidebar__nav-label">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Post Button */}
        <button
          className="sidebar__post-btn"
          onClick={() => {
            onCloseMobile?.();
            if (!currentUser) {
              onOpenAuth?.();
            } else {
              onNavigate?.('compose');
            }
          }}
          aria-label="Post"
        >
          <span className="sidebar__post-btn-text">Post</span>
          <span className="sidebar__post-btn-icon">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M23 3c-6.62-.1-10.38 2.421-13.05 6.03C7.29 12.61 6.28 16.5 6.28 16.5l-3.54-2.83c-.23-.18-.55-.16-.75.04-.2.2-.22.53-.04.73l6 7.5c.09.11.22.18.36.2.03 0 .06.01.09.01.12 0 .24-.05.32-.14l1.82-2.06c2.15-2.44 5.04-3.69 7.88-4.71 2.96-1.06 5.99-1.68 8.54-3.32.96-.63 1.86-1.43 2.59-2.5.75-1.1 1.22-2.35 1.22-3.72 0-2.57-1.66-4.5-4-4.5z" />
            </svg>
          </span>
        </button>

        {/* User Profile Section or Login Button */}
        <div className="sidebar__profile-container" ref={menuRef}>
          {currentUser ? (
            <>
              {isMenuOpen && (
                <div className="sidebar__menu-popup" role="menu">
                  <button
                    className="sidebar__menu-popup-item"
                    role="menuitem"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onCloseMobile?.();
                      onNavigate?.('profile');
                    }}
                  >
                    View profile
                  </button>
                  <button
                    className="sidebar__menu-popup-item sidebar__menu-popup-item--danger"
                    role="menuitem"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onCloseMobile?.();
                      onLogout?.();
                    }}
                  >
                    Log out {userHandle}
                  </button>
                </div>
              )}

              <div
                className="sidebar__profile"
                onClick={() => setIsMenuOpen((prev) => !prev)}
                role="button"
                tabIndex={0}
                aria-label="User account menu"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setIsMenuOpen((prev) => !prev);
                  }
                }}
              >
                <div className="sidebar__profile-info">
                  <img
                    className="sidebar__profile-avatar"
                    src={avatarUrl}
                    alt=""
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = DEFAULT_AVATAR;
                    }}
                  />
                  <div className="sidebar__profile-text">
                    <span className="sidebar__profile-name">{userDisplayName}</span>
                    <span className="sidebar__profile-handle">{userHandle}</span>
                  </div>
                </div>
                <button
                  className="sidebar__profile-menu"
                  aria-label="Options"
                  tabIndex={-1}
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M3 12c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm9 2c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm7 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z" />
                  </svg>
                </button>
              </div>
            </>
          ) : (
            <button
              className="sidebar__login-btn"
              onClick={() => {
                onCloseMobile?.();
                onOpenAuth?.();
              }}
            >
              Sign in
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
