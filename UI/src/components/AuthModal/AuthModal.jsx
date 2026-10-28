import React, { useState, useCallback, useEffect } from 'react';
import { loginUser, registerUser } from '../../services/api.js';
import './AuthModal.css';

/**
 * AuthModal — Supports registration and login with cookie-based session handling.
 * Enforces backend validation constraints (handle, displayName, password lengths).
 */
const AuthModal = ({ isOpen, onClose, onAuthSuccess, initialTab = 'login' }) => {
  const [activeTab, setActiveTab] = useState(initialTab); // 'login' | 'register'
  const [handle, setHandle] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    setActiveTab(initialTab);
    setErrorMessage(null);
  }, [initialTab, isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setErrorMessage(null);

      const cleanHandle = handle.trim().replace(/^@/, '');
      if (!cleanHandle) {
        setErrorMessage('Handle is required');
        return;
      }

      if (cleanHandle.length < 3 || cleanHandle.length > 30) {
        setErrorMessage('Handle must be between 3 and 30 characters');
        return;
      }

      if (!/^[a-zA-Z0-9_]+$/.test(cleanHandle)) {
        setErrorMessage('Handle may contain only letters, numbers, and underscores');
        return;
      }

      if (password.length < 8 || password.length > 128) {
        setErrorMessage('Password must be between 8 and 128 characters');
        return;
      }

      setIsLoading(true);

      try {
        if (activeTab === 'register') {
          const cleanDisplayName = displayName.trim();
          if (!cleanDisplayName || cleanDisplayName.length > 80) {
            setErrorMessage('Display name must be between 1 and 80 characters');
            setIsLoading(false);
            return;
          }

          // Register account
          await registerUser({
            handle: cleanHandle,
            displayName: cleanDisplayName,
            password,
          });

          // Automatically log in after registration to establish session cookie
          const { user } = await loginUser({
            handle: cleanHandle,
            password,
          });

          onAuthSuccess(user);
          onClose();
        } else {
          // Log in
          const { user } = await loginUser({
            handle: cleanHandle,
            password,
          });

          onAuthSuccess(user);
          onClose();
        }
      } catch (err) {
        setErrorMessage(err.message || 'Authentication failed. Please check your details.');
      } finally {
        setIsLoading(false);
      }
    },
    [activeTab, handle, displayName, password, onAuthSuccess, onClose]
  );

  if (!isOpen) return null;

  return (
    <div
      className="auth-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      onClick={onClose}
    >
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="auth-modal__header">
          <button
            className="auth-modal__close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M10.59 12L4.54 5.96l1.42-1.42L12 10.59l6.04-6.05 1.42 1.42L13.41 12l6.05 6.04-1.42 1.42L12 13.41l-6.04 6.05-1.42-1.42L10.59 12z" />
            </svg>
          </button>
          <div className="auth-modal__logo" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </div>
          <div style={{ width: 36 }} />
        </div>

        {/* Tabs */}
        <div className="auth-modal__tabs" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === 'login'}
            className={`auth-modal__tab ${activeTab === 'login' ? 'auth-modal__tab--active' : ''}`}
            onClick={() => {
              setActiveTab('login');
              setErrorMessage(null);
            }}
          >
            Sign in
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'register'}
            className={`auth-modal__tab ${activeTab === 'register' ? 'auth-modal__tab--active' : ''}`}
            onClick={() => {
              setActiveTab('register');
              setErrorMessage(null);
            }}
          >
            Create account
          </button>
        </div>

        {/* Body */}
        <div className="auth-modal__body">
          <h2 id="auth-modal-title" className="auth-modal__title">
            {activeTab === 'login' ? 'Sign in to X' : 'Create your account'}
          </h2>

          {errorMessage && (
            <div className="auth-modal__error" role="alert">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
              </svg>
              <span>{errorMessage}</span>
            </div>
          )}

          <form className="auth-modal__form" onSubmit={handleSubmit}>
            <div className="auth-modal__field">
              <label className="auth-modal__label" htmlFor="auth-handle">
                Handle / Username
              </label>
              <input
                id="auth-handle"
                className="auth-modal__input"
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="e.g. asha or rahul"
                required
                autoComplete="username"
                disabled={isLoading}
              />
              <span className="auth-modal__hint">3-30 letters, numbers, or underscores</span>
            </div>

            {activeTab === 'register' && (
              <div className="auth-modal__field">
                <label className="auth-modal__label" htmlFor="auth-display-name">
                  Display Name
                </label>
                <input
                  id="auth-display-name"
                  className="auth-modal__input"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your Name"
                  required
                  maxLength={80}
                  disabled={isLoading}
                />
                <span className="auth-modal__hint">1-80 characters</span>
              </div>
            )}

            <div className="auth-modal__field">
              <label className="auth-modal__label" htmlFor="auth-password">
                Password
              </label>
              <input
                id="auth-password"
                className="auth-modal__input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
                maxLength={128}
                autoComplete={activeTab === 'login' ? 'current-password' : 'new-password'}
                disabled={isLoading}
              />
              <span className="auth-modal__hint">8-128 characters</span>
            </div>

            <button
              type="submit"
              className="auth-modal__submit-btn"
              disabled={isLoading}
            >
              {isLoading ? (
                <span>Loading...</span>
              ) : activeTab === 'login' ? (
                'Sign in'
              ) : (
                'Create account'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
