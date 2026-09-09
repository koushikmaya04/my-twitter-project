import React from 'react';
import './Sidebar.css';

/**
 * Sidebar — Left navigation panel matching Twitter/X desktop layout.
 * Contains navigation links, Post button, and user profile section.
 */
const Sidebar = ({ onNavigate, activeItem = 'home' }) => {
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
      icon: (
        <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
          <path d="M19.993 9.042C19.48 5.017 16.054 2 11.996 2s-7.49 3.021-7.999 7.051L2.866 18H7.1c.463 2.282 2.481 4 4.9 4s4.437-1.718 4.9-4h4.236l-1.143-8.958zM12 20c-1.306 0-2.417-.835-2.829-2h5.658c-.412 1.165-1.523 2-2.829 2zm-6.866-4l.847-6.698C6.364 6.272 8.941 4 11.996 4s5.627 2.268 6.013 5.295L18.858 16H5.134z" />
        </svg>
      ),
    },
    {
      id: 'follow',
      label: 'Follow',
      icon: (
        <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
          <path d="M7.501 4.001c-1.979 0-3.7 1.104-4.576 2.73-.18.334-.36.737-.464 1.197A5.97 5.97 0 002.2 9.501c0 1.595.536 3.278 1.56 4.655C4.809 15.579 6.149 16.7 7.78 17.375l.5.208.5-.208c1.63-.675 2.971-1.796 4.019-3.219C13.823 12.779 14.36 11.096 14.36 9.501c0-.551-.085-1.09-.261-1.573-.104-.46-.284-.863-.464-1.197C12.76 5.105 11.039 4.001 9.06 4.001H7.501zM12 21.35l-1.556-.644c-2.173-.899-3.952-2.373-5.267-4.188C3.826 14.718 3.2 12.72 3.2 10.501c0-.783.119-1.537.36-2.25.14-.52.35-1.007.59-1.44C5.27 4.753 7.27 3.001 9.56 3.001h-2.06c2.29 0 4.29 1.752 5.41 3.81.24.433.45.92.59 1.44.241.713.36 1.467.36 2.25 0 2.219-.626 4.217-1.977 6.017-1.315 1.815-3.094 3.289-5.267 4.188L12 21.35z" />
        </svg>
      ),
    },
    {
      id: 'chat',
      label: 'Chat',
      icon: (
        <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
          <path d="M1.998 5.5c0-1.381 1.119-2.5 2.5-2.5h15c1.381 0 2.5 1.119 2.5 2.5v13c0 1.381-1.119 2.5-2.5 2.5h-15c-1.381 0-2.5-1.119-2.5-2.5v-13zm2.5-.5c-.276 0-.5.224-.5.5v2.764l8 3.638 8-3.636V5.5c0-.276-.224-.5-.5-.5h-15zm15.5 5.463l-8 3.636-8-3.638V18.5c0 .276.224.5.5.5h15c.276 0 .5-.224.5-.5v-8.037z" />
        </svg>
      ),
    },
    {
      id: 'grok',
      label: 'Grok',
      icon: (
        <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
          <path d="M2.205 7.423L11.745 21h4.241L6.446 7.423H2.205zm4.237 0L11.745 15.07 17.003 7.423H12.76L11.745 9.18l-1.014-1.757H6.442zM13.758 3L9.519 9.423h4.239l4.239-6.423H13.758zm4.239 0l-4.239 6.423L17.998 3h-0.001z" />
        </svg>
      ),
    },
    {
      id: 'history',
      label: 'History',
      icon: (
        <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
          <path d="M4 4.5C4 3.12 5.119 2 6.5 2h11C18.881 2 20 3.12 20 4.5v18.44l-8-5.71-8 5.71V4.5zM6.5 4c-.276 0-.5.22-.5.5v14.56l6-4.29 6 4.29V4.5c0-.28-.224-.5-.5-.5h-11z" />
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
    {
      id: 'more',
      label: 'More',
      icon: (
        <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
          <path d="M3.75 12c0-4.56 3.69-8.25 8.25-8.25s8.25 3.69 8.25 8.25-3.69 8.25-8.25 8.25S3.75 16.56 3.75 12zM12 1.75C6.34 1.75 1.75 6.34 1.75 12S6.34 22.25 12 22.25 22.25 17.66 22.25 12 17.66 1.75 12 1.75zM8.25 12a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm4.5 0a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm3 1.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
        </svg>
      ),
    },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar__inner">
        {/* X Logo */}
        <div className="sidebar__logo">
          <a href="#" className="sidebar__logo-link" aria-label="X">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>
        </div>

        {/* Navigation Items */}
        <nav className="sidebar__nav">
          {navItems.map((item) => (
            <a
              key={item.id}
              href="#"
              className={`sidebar__nav-item ${activeItem === item.id ? 'sidebar__nav-item--active' : ''}`}
              aria-label={item.label}
              onClick={(e) => {
                e.preventDefault();
                onNavigate?.(item.id);
              }}
            >
              <span className="sidebar__nav-icon">{item.icon}</span>
              <span className="sidebar__nav-label">{item.label}</span>
            </a>
          ))}
        </nav>

        {/* Post Button */}
        <button className="sidebar__post-btn" onClick={() => onNavigate?.('compose')} aria-label="Post">
          <span className="sidebar__post-btn-text">Post</span>
          <span className="sidebar__post-btn-icon">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M23 3c-6.62-.1-10.38 2.421-13.05 6.03C7.29 12.61 6.28 16.5 6.28 16.5l-3.54-2.83c-.23-.18-.55-.16-.75.04-.2.2-.22.53-.04.73l6 7.5c.09.11.22.18.36.2.03 0 .06.01.09.01.12 0 .24-.05.32-.14l1.82-2.06c2.15-2.44 5.04-3.69 7.88-4.71 2.96-1.06 5.99-1.68 8.54-3.32.96-.63 1.86-1.43 2.59-2.5.75-1.1 1.22-2.35 1.22-3.72 0-2.57-1.66-4.5-4-4.5z" />
            </svg>
          </span>
        </button>

        {/* User Profile Section */}
        <div className="sidebar__profile">
          <div className="sidebar__profile-info">
            <img
              className="sidebar__profile-avatar"
              src="https://i.pravatar.cc/40?img=68"
              alt="Profile"
            />
            <div className="sidebar__profile-text">
              <span className="sidebar__profile-name">Koushik Maya</span>
              <span className="sidebar__profile-handle">@KMayaaa7841</span>
            </div>
          </div>
          <button className="sidebar__profile-menu">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M3 12c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm9 2c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm7 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
