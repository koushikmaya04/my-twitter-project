import React, { useState, useEffect, useCallback } from 'react';
import {
  fetchSessions,
  revokeSession,
  revokeOtherSessions,
} from '../../services/api.js';
import LoadingSkeleton from '../LoadingSkeleton/LoadingSkeleton.jsx';
import ErrorState from '../ErrorState/ErrorState.jsx';
import './ManageDevices.css';

/**
 * ManageDevices — Active Sessions management view.
 * Displays logged-in sessions/devices and provides individual & bulk revocation.
 */
const ManageDevices = ({ onBack, onLogout }) => {
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [revokingId, setRevokingId] = useState(null);
  const [isRevokingOthers, setIsRevokingOthers] = useState(false);

  const loadSessions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchSessions();
      setSessions(data.items || []);
    } catch (err) {
      setError(err.message || 'Failed to load active sessions');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleRevokeSingle = async (session) => {
    const isCurrent = session.isCurrent;
    const confirmMsg = isCurrent
      ? 'This is your current device. Revoking this session will log you out immediately. Are you sure?'
      : 'Are you sure you want to remove this device?';

    if (!window.confirm(confirmMsg)) {
      return;
    }

    setRevokingId(session.id);
    setActionSuccess(null);
    try {
      const res = await revokeSession(session.id);
      if (res.item?.isCurrent || isCurrent) {
        onLogout?.();
        return;
      }
      setActionSuccess('Device removed successfully.');
      await loadSessions();
    } catch (err) {
      setError(err.message || 'Failed to remove device.');
    } finally {
      setRevokingId(null);
    }
  };

  const handleRevokeOthers = async () => {
    const otherCount = sessions.filter((s) => !s.isCurrent).length;
    if (otherCount === 0) return;

    if (
      !window.confirm(
        `Are you sure you want to log out of all other ${otherCount} device${otherCount > 1 ? 's' : ''}? You will remain logged in on this device.`
      )
    ) {
      return;
    }

    setIsRevokingOthers(true);
    setActionSuccess(null);
    setError(null);
    try {
      const res = await revokeOtherSessions();
      const count = res.item?.revokedCount ?? otherCount;
      setActionSuccess(
        `Logged out of ${count} other device${count === 1 ? '' : 's'} successfully.`
      );
      await loadSessions();
    } catch (err) {
      setError(err.message || 'Failed to log out of other devices.');
    } finally {
      setIsRevokingOthers(false);
    }
  };

  const formatDateTime = (rawDate) => {
    if (!rawDate) return 'Unknown date';
    try {
      const d = new Date(rawDate);
      if (isNaN(d.getTime())) return String(rawDate);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return String(rawDate);
    }
  };

  const renderDeviceIcon = (deviceType) => {
    if (deviceType === 'mobile') {
      return (
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
          <path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14zm-5 1c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" />
        </svg>
      );
    }
    if (deviceType === 'tablet') {
      return (
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
          <path d="M19 2H5c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 18H5V4h14v16zm-7-2c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" />
        </svg>
      );
    }
    // desktop / laptop default
    return (
      <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
        <path d="M20 18c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z" />
      </svg>
    );
  };

  const otherSessionsCount = sessions.filter((s) => !s.isCurrent).length;

  return (
    <div className="manage-devices">
      {/* Header */}
      <div className="manage-devices__header">
        <div className="manage-devices__header-left">
          {onBack && (
            <button
              className="manage-devices__back-btn"
              onClick={onBack}
              aria-label="Back"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M20 11H7.414l4.293-4.293a1 1 0 00-1.414-1.414l-6 6a1 1 0 000 1.414l6 6a1 1 0 001.414-1.414L7.414 13H20a1 1 0 000-2z" />
              </svg>
            </button>
          )}
          <div>
            <h1 className="manage-devices__title">Manage devices</h1>
            <p className="manage-devices__subtitle">
              Manage the devices where your account is currently logged in.
            </p>
          </div>
        </div>
      </div>

      {/* Banner Messages */}
      {actionSuccess && (
        <div className="manage-devices__alert manage-devices__alert--success">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
          <span>{actionSuccess}</span>
        </div>
      )}

      {error && (
        <div className="manage-devices__alert manage-devices__alert--error">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Active Count & Bulk Action Banner */}
      {!isLoading && sessions.length > 0 && (
        <div className="manage-devices__meta-bar">
          <div className="manage-devices__count-wrap">
            <span className="manage-devices__count-badge">{sessions.length}</span>
            <span className="manage-devices__count-text">
              Active session{sessions.length === 1 ? '' : 's'}
            </span>
          </div>

          {otherSessionsCount > 0 && (
            <button
              className="manage-devices__revoke-others-btn"
              onClick={handleRevokeOthers}
              disabled={isRevokingOthers}
            >
              {isRevokingOthers ? 'Logging out...' : 'Log out of all other devices'}
            </button>
          )}
        </div>
      )}

      {/* Sessions List */}
      <div className="manage-devices__content">
        {isLoading ? (
          <div className="manage-devices__loading">
            <LoadingSkeleton count={3} />
          </div>
        ) : sessions.length === 0 ? (
          <div className="manage-devices__empty">
            <p>No active sessions found.</p>
          </div>
        ) : (
          <div className="manage-devices__list">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`manage-devices__item ${
                  session.isCurrent ? 'manage-devices__item--current' : ''
                }`}
              >
                <div className="manage-devices__item-icon">
                  {renderDeviceIcon(session.deviceType)}
                </div>

                <div className="manage-devices__item-details">
                  <div className="manage-devices__item-header">
                    <span className="manage-devices__device-name">
                      {session.browser} on {session.os}
                    </span>
                    {session.isCurrent && (
                      <span className="manage-devices__current-badge">
                        Current device
                      </span>
                    )}
                  </div>

                  <div className="manage-devices__item-sub">
                    <span className="manage-devices__login-time">
                      Logged in: {formatDateTime(session.createdAt)}
                    </span>
                    {session.ipAddress && (
                      <span className="manage-devices__ip">
                        &bull; {session.ipAddress}
                      </span>
                    )}
                  </div>
                </div>

                <div className="manage-devices__item-action">
                  <button
                    className="manage-devices__remove-btn"
                    onClick={() => handleRevokeSingle(session)}
                    disabled={revokingId === session.id}
                    title={
                      session.isCurrent
                        ? 'Revoke current session (will log you out)'
                        : 'Remove device'
                    }
                  >
                    {revokingId === session.id ? 'Removing...' : 'Remove'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && sessions.length > 0 && otherSessionsCount === 0 && (
          <div className="manage-devices__single-session-notice">
            <p>Your account is currently only active on this device.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageDevices;
