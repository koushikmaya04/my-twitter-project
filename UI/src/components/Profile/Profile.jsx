import React, { useState, useEffect, useCallback } from 'react';
import {
  fetchUserProfile,
  updateMyProfile,
  followUserRequest,
  unfollowUserRequest,
  fetchFollowers,
  fetchFollowing,
  fetchProfileMedia,
  deactivateAccount,
  resolveImageUrl,
} from '../../services/api.js';
import TweetCard from '../TweetCard/TweetCard.jsx';
import LoadingSkeleton from '../LoadingSkeleton/LoadingSkeleton.jsx';
import ErrorState from '../ErrorState/ErrorState.jsx';
import { DEFAULT_AVATAR } from '../../utils/constants.js';
import './Profile.css';

/**
 * Profile — View and update user profiles with ownership restrictions (P0-02, P0-03).
 * Shows user information, follower/following counts, and tabs for Posts, Media, Following, Followers.
 */
const Profile = ({
  userId,
  currentUser,
  posts = [],
  onLike,
  onRetweet,
  onComment,
  onFollow,
  onEdit,
  onDelete,
  followedHandles = [],
  onOpenAuth,
  onBack,
  onLogout,
  onUpdateCurrentUser,
  onViewUserProfile,
}) => {
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('posts'); // 'posts' | 'media' | 'following' | 'followers'
  const [tabItems, setTabItems] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isTabLoading, setIsTabLoading] = useState(false);
  const [error, setError] = useState(null);

  // Edit Profile Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [editError, setEditError] = useState(null);

  const isOwnProfile =
    Boolean(currentUser && profile && (currentUser.id === profile.id || currentUser.handle === profile.handle));

  const loadProfile = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      const { user } = await fetchUserProfile(userId);
      setProfile(user);
      setEditDisplayName(user.displayName || '');
      setEditBio(user.bio || '');

      // Check if current user is following this profile
      if (currentUser && currentUser.id !== user.id) {
        try {
          const cleanHandle = user.handle ? user.handle.replace(/^@/, '') : '';
          const alreadyFollowed =
            followedHandles.includes(user.id) ||
            Boolean(cleanHandle && (followedHandles.includes(cleanHandle) || followedHandles.includes('@' + cleanHandle)));

          if (alreadyFollowed) {
            setIsFollowing(true);
          }

          const { items: myFollowing } = await fetchFollowing(currentUser.id, null, 50);
          const followingThisUser = (myFollowing || []).some((f) => f.id === user.id);
          setIsFollowing(followingThisUser);
        } catch {
          // Non-critical check
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load user profile');
    } finally {
      setIsLoading(false);
    }
  }, [userId, currentUser, followedHandles]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Load active tab content
  useEffect(() => {
    if (!profile) return;

    let isMounted = true;
    if (activeTab === 'posts') {
      setIsTabLoading(false);
      return;
    }

    setIsTabLoading(true);

    const fetchTabContent = async () => {
      try {
        if (activeTab === 'media') {
          const { items } = await fetchProfileMedia(profile.id, null, 30);
          if (isMounted) setTabItems(items || []);
        } else if (activeTab === 'followers') {
          const { items } = await fetchFollowers(profile.id, null, 50);
          if (isMounted) setTabItems(items || []);
        } else if (activeTab === 'following') {
          const { items } = await fetchFollowing(profile.id, null, 50);
          if (isMounted) setTabItems(items || []);
        }
      } catch (err) {
        console.warn('Failed to load tab items:', err);
      } finally {
        if (isMounted) setIsTabLoading(false);
      }
    };

    fetchTabContent();

    return () => {
      isMounted = false;
    };
  }, [profile, activeTab]);

  // Handle Follow / Unfollow
  const handleFollowToggle = useCallback(async () => {
    if (!currentUser) {
      onOpenAuth?.();
      return;
    }
    if (isOwnProfile) return;

    const previousState = isFollowing;
    const targetState = !previousState;

    setIsFollowing(targetState);
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            followerCount: targetState
              ? prev.followerCount + 1
              : Math.max(0, prev.followerCount - 1),
          }
        : prev
    );

    try {
      if (targetState) {
        await followUserRequest(profile.id);
      } else {
        await unfollowUserRequest(profile.id);
      }
      onFollow?.(profile.id, profile.displayName);
    } catch (err) {
      // Rollback on error
      setIsFollowing(previousState);
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              followerCount: previousState
                ? prev.followerCount + 1
                : Math.max(0, prev.followerCount - 1),
            }
          : prev
      );
    }
  }, [currentUser, isOwnProfile, isFollowing, profile, onFollow, onOpenAuth]);

  // Handle Save Profile
  const handleSaveProfile = async (e) => {
    e?.preventDefault();
    if (!editDisplayName.trim()) {
      setEditError('Display name cannot be empty');
      return;
    }

    setIsSavingProfile(true);
    setEditError(null);

    try {
      const { user: updated } = await updateMyProfile({
        displayName: editDisplayName.trim(),
        bio: editBio.trim() || null,
      });

      setProfile((prev) => ({
        ...prev,
        displayName: updated.displayName,
        bio: updated.bio,
      }));

      onUpdateCurrentUser?.({
        name: updated.displayName,
        bio: updated.bio,
      });

      setIsEditModalOpen(false);
    } catch (err) {
      setEditError(err.message || 'Failed to update profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Handle Deactivate Account
  const handleDeactivate = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to deactivate your account? You will be logged out and your profile will no longer be visible.'
    );
    if (!confirmed) return;

    try {
      await deactivateAccount();
      onLogout?.();
    } catch (err) {
      alert(`Deactivation failed: ${err.message}`);
    }
  };

  if (isLoading) {
    return (
      <div className="profile-view">
        <div className="profile-view__header">
          <h1 className="profile-view__header-name">Profile</h1>
        </div>
        <LoadingSkeleton count={3} />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="profile-view">
        <div className="profile-view__header">
          {onBack && (
            <button className="profile-view__back-btn" onClick={onBack} aria-label="Back">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M20 11H7.414l4.293-4.293-1.414-1.414L3.586 12l6.707 6.707 1.414-1.414L7.414 13H20v-2z" />
              </svg>
            </button>
          )}
          <h1 className="profile-view__header-name">Profile</h1>
        </div>
        <ErrorState message={error || 'User not found'} onRetry={loadProfile} />
      </div>
    );
  }

  const avatarUrl =
    resolveImageUrl(profile.avatar?.largeUrl) ||
    resolveImageUrl(profile.avatar?.smallUrl) ||
    DEFAULT_AVATAR;

  const handleText = profile.handle?.startsWith('@')
    ? profile.handle
    : `@${profile.handle}`;

  // Filter posts authored by this user
  const userPosts = posts.filter(
    (p) =>
      (p.authorId && p.authorId === profile.id) ||
      p.handle === profile.handle ||
      p.handle === `@${profile.handle}`
  );

  return (
    <div className="profile-view" role="region" aria-label={`Profile of ${profile.displayName}`}>
      {/* Header */}
      <div className="profile-view__header">
        {onBack && (
          <button className="profile-view__back-btn" onClick={onBack} aria-label="Back">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M20 11H7.414l4.293-4.293-1.414-1.414L3.586 12l6.707 6.707 1.414-1.414L7.414 13H20v-2z" />
            </svg>
          </button>
        )}
        <div className="profile-view__header-text">
          <h1 className="profile-view__header-name">{profile.displayName}</h1>
          <span className="profile-view__header-post-count">
            {profile.postCount || userPosts.length} posts
          </span>
        </div>
      </div>

      {/* Banner */}
      <div className="profile-view__banner" />

      {/* Profile Info */}
      <div className="profile-view__info-card">
        <div className="profile-view__avatar-row">
          <img
            className="profile-view__avatar"
            src={avatarUrl}
            alt=""
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = DEFAULT_AVATAR;
            }}
          />

          <div className="profile-view__actions">
            {isOwnProfile ? (
              <>
                <button
                  className="profile-view__edit-btn"
                  onClick={() => setIsEditModalOpen(true)}
                >
                  Edit profile
                </button>
                <button
                  className="profile-view__deactivate-btn"
                  onClick={handleDeactivate}
                  title="Permanently deactivate account"
                >
                  Deactivate
                </button>
              </>
            ) : currentUser ? (
              <button
                className={`profile-view__follow-btn ${
                  isFollowing
                    ? 'profile-view__follow-btn--active'
                    : 'profile-view__follow-btn--inactive'
                }`}
                onClick={handleFollowToggle}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </button>
            ) : null}
          </div>
        </div>

        <div className="profile-view__details">
          <div className="profile-view__name-block">
            <h2 className="profile-view__display-name">{profile.displayName}</h2>
            <span className="profile-view__handle">{handleText}</span>
          </div>

          {profile.bio && <p className="profile-view__bio">{profile.bio}</p>}

          <div className="profile-view__stats">
            <button
              className="profile-view__stat-btn"
              onClick={() => setActiveTab('following')}
            >
              <span className="profile-view__stat-number">
                {profile.followingCount || 0}
              </span>
              <span>Following</span>
            </button>
            <button
              className="profile-view__stat-btn"
              onClick={() => setActiveTab('followers')}
            >
              <span className="profile-view__stat-number">
                {profile.followerCount || 0}
              </span>
              <span>Followers</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="profile-view__tabs" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === 'posts'}
          className={`profile-view__tab ${activeTab === 'posts' ? 'profile-view__tab--active' : ''}`}
          onClick={() => setActiveTab('posts')}
        >
          Posts
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'media'}
          className={`profile-view__tab ${activeTab === 'media' ? 'profile-view__tab--active' : ''}`}
          onClick={() => setActiveTab('media')}
        >
          Media
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'following'}
          className={`profile-view__tab ${activeTab === 'following' ? 'profile-view__tab--active' : ''}`}
          onClick={() => setActiveTab('following')}
        >
          Following
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'followers'}
          className={`profile-view__tab ${activeTab === 'followers' ? 'profile-view__tab--active' : ''}`}
          onClick={() => setActiveTab('followers')}
        >
          Followers
        </button>
      </div>

      {/* Tab Content */}
      <div className="profile-view__tab-content">
        {isTabLoading ? (
          <LoadingSkeleton count={2} />
        ) : activeTab === 'posts' ? (
          userPosts.length > 0 ? (
            <div className="profile-view__posts-list">
              {userPosts.map((tweet) => {
                const isFollowingThis =
                  followedHandles.includes(tweet.handle) ||
                  followedHandles.includes(tweet.handle?.replace(/^@/, '')) ||
                  (tweet.authorId && followedHandles.includes(tweet.authorId));

                return (
                  <TweetCard
                    key={tweet.id}
                    tweet={tweet}
                    onLike={onLike}
                    onRetweet={onRetweet}
                    onComment={onComment}
                    onFollow={onFollow}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onViewUserProfile={onViewUserProfile}
                    isFollowing={isFollowingThis}
                    currentUser={currentUser}
                    onOpenAuth={onOpenAuth}
                  />
                );
              })}
            </div>
          ) : (
            <div className="notifications-view__empty" style={{ padding: '40px 20px', textAlign: 'center' }}>
              <h3 className="notifications-view__empty-title">No posts yet</h3>
              <p style={{ color: 'var(--text-secondary)' }}>
                When this user posts, they will show up here.
              </p>
            </div>
          )
        ) : activeTab === 'media' ? (
          tabItems.length > 0 ? (
            <div className="profile-view__media-grid">
              {tabItems.map((media) => (
                <div key={media.id} className="profile-view__media-item">
                  <img
                    className="profile-view__media-img"
                    src={resolveImageUrl(media.largeUrl || media.smallUrl)}
                    alt={media.altText || 'Media'}
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="notifications-view__empty" style={{ padding: '40px 20px', textAlign: 'center' }}>
              <h3 className="notifications-view__empty-title">No media yet</h3>
              <p style={{ color: 'var(--text-secondary)' }}>
                Photos and videos posted by this account will appear here.
              </p>
            </div>
          )
        ) : (
          tabItems.length > 0 ? (
            <div className="profile-view__users-list">
              {tabItems.map((u) => {
                const uAvatar =
                  resolveImageUrl(u.avatar?.smallUrl) ||
                  DEFAULT_AVATAR;
                const uHandle = u.handle?.startsWith('@')
                  ? u.handle
                  : `@${u.handle}`;
                return (
                  <div
                    key={u.id}
                    className="profile-view__user-card"
                    onClick={() => onViewUserProfile?.(u.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="profile-view__user-info">
                      <img
                        className="profile-view__user-avatar"
                        src={uAvatar}
                        alt=""
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = DEFAULT_AVATAR;
                        }}
                      />
                      <div className="profile-view__user-text">
                        <span className="profile-view__user-name">
                          {u.displayName}
                        </span>
                        <span className="profile-view__user-handle">
                          {uHandle}
                        </span>
                        {u.bio && (
                          <p className="profile-view__user-bio">{u.bio}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="notifications-view__empty" style={{ padding: '40px 20px', textAlign: 'center' }}>
              <h3 className="notifications-view__empty-title">
                {activeTab === 'followers'
                  ? 'No followers yet'
                  : 'Not following anyone yet'}
              </h3>
            </div>
          )
        )}
      </div>

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div
          className="edit-profile-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-profile-title"
          onClick={() => setIsEditModalOpen(false)}
        >
          <div
            className="edit-profile-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="edit-profile-modal__header">
              <button
                className="auth-modal__close-btn"
                onClick={() => setIsEditModalOpen(false)}
                aria-label="Close"
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M10.59 12L4.54 5.96l1.42-1.42L12 10.59l6.04-6.05 1.42 1.42L13.41 12l6.05 6.04-1.42 1.42L12 13.41l-6.04 6.05-1.42-1.42L10.59 12z" />
                </svg>
              </button>
              <h2 id="edit-profile-title" style={{ fontSize: 18, fontWeight: 700 }}>
                Edit profile
              </h2>
              <button
                className="edit-profile-modal__save-btn"
                onClick={handleSaveProfile}
                disabled={isSavingProfile}
              >
                {isSavingProfile ? 'Saving...' : 'Save'}
              </button>
            </div>

            <form className="edit-profile-modal__body" onSubmit={handleSaveProfile}>
              {editError && (
                <div className="auth-modal__error" role="alert">
                  <span>{editError}</span>
                </div>
              )}

              <div className="edit-profile-modal__field">
                <label className="edit-profile-modal__label" htmlFor="edit-name">
                  Name
                </label>
                <input
                  id="edit-name"
                  className="edit-profile-modal__input"
                  type="text"
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  maxLength={80}
                  required
                />
                <span className="edit-profile-modal__char-count">
                  {editDisplayName.length} / 80
                </span>
              </div>

              <div className="edit-profile-modal__field">
                <label className="edit-profile-modal__label" htmlFor="edit-bio">
                  Bio
                </label>
                <textarea
                  id="edit-bio"
                  className="edit-profile-modal__textarea"
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  maxLength={160}
                  placeholder="Tell the world about yourself"
                />
                <span className="edit-profile-modal__char-count">
                  {editBio.length} / 160
                </span>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
