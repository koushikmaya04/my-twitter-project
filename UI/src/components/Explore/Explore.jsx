import React, { useState, useEffect, useCallback } from 'react';
import TweetCard from '../TweetCard/TweetCard.jsx';
import LoadingSkeleton from '../LoadingSkeleton/LoadingSkeleton.jsx';
import { searchPosts } from '../../services/api.js';
import Tweet from '../../models/Tweet.js';
import './Explore.css';

/**
 * Explore — Center column view for Explore/Search.
 * Maintains the standard X three-column layout, dark theme, and rich search/trends experience.
 */
const Explore = ({
  posts = [],
  onLike,
  onRetweet,
  onComment,
  onFollow,
  onEdit,
  onDelete,
  onViewUserProfile,
  followedHandles = [],
  currentUser,
  onOpenAuth,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('forYou');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  const trendingTopics = [
    { id: 1, category: 'Technology · Trending', title: '#ArtificialIntelligence', posts: '42.8K posts' },
    { id: 2, category: 'Sports · Trending', title: '#ChampionsLeague', posts: '128K posts' },
    { id: 3, category: 'Entertainment · Trending', title: '#NewMusicFriday', posts: '31.2K posts' },
    { id: 4, category: 'Technology · Trending', title: '#WebDevelopment', posts: '19.5K posts' },
    { id: 5, category: 'Business · Trending', title: '#GlobalMarkets', posts: '87.4K posts' },
  ];

  const handleSearchSubmit = useCallback(async (e) => {
    if (e) e.preventDefault();
    const query = searchTerm.trim();
    if (!query || query.length < 2) {
      setSearchResults(null);
      return;
    }

    setIsSearching(true);
    try {
      const { posts: resultPosts } = await searchPosts(query, null, 20);
      setSearchResults(resultPosts || []);
    } catch (err) {
      console.warn('Explore search failed, filtering local posts:', err);
      const filtered = posts.filter((p) =>
        (p.content || '').toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(filtered);
    } finally {
      setIsSearching(false);
    }
  }, [searchTerm, posts]);

  const handleTrendClick = (trendTitle) => {
    setSearchTerm(trendTitle);
    setIsSearching(true);
    searchPosts(trendTitle.replace(/^#/, ''), null, 20)
      .then(({ posts: resultPosts }) => {
        setSearchResults(resultPosts || []);
      })
      .catch(() => {
        const filtered = posts.filter((p) =>
          (p.content || '').toLowerCase().includes(trendTitle.toLowerCase())
        );
        setSearchResults(filtered);
      })
      .finally(() => {
        setIsSearching(false);
      });
  };

  const displayedPosts = searchResults !== null ? searchResults : posts;

  return (
    <main className="explore-view" role="main" aria-label="Explore timeline">
      {/* Search Header */}
      <div className="explore-view__header">
        <form className="explore-view__search-bar" onSubmit={handleSearchSubmit}>
          <div className="explore-view__search-input-wrapper">
            <svg
              className="explore-view__search-icon"
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="currentColor"
            >
              <path d="M10.25 3.75c-3.59 0-6.5 2.91-6.5 6.5s2.91 6.5 6.5 6.5c1.795 0 3.419-.726 4.596-1.904 1.178-1.177 1.904-2.801 1.904-4.596 0-3.59-2.91-6.5-6.5-6.5zm-8.5 6.5c0-4.694 3.806-8.5 8.5-8.5s8.5 3.806 8.5 8.5c0 1.986-.682 3.815-1.824 5.262l4.781 4.781-1.414 1.414-4.781-4.781c-1.447 1.142-3.276 1.824-5.262 1.824-4.694 0-8.5-3.806-8.5-8.5z" />
            </svg>
            <input
              className="explore-view__search-input"
              type="text"
              placeholder="Search posts, topics, or keywords"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                if (!e.target.value.trim()) setSearchResults(null);
              }}
            />
          </div>
        </form>

        {/* Categories */}
        <div className="explore-view__tabs" role="tablist">
          {['forYou', 'trending', 'news', 'sports', 'entertainment'].map((tab) => {
            const labels = {
              forYou: 'For you',
              trending: 'Trending',
              news: 'News',
              sports: 'Sports',
              entertainment: 'Entertainment',
            };
            return (
              <button
                key={tab}
                role="tab"
                aria-selected={activeTab === tab}
                className={`explore-view__tab ${activeTab === tab ? 'explore-view__tab--active' : ''}`}
                onClick={() => {
                  setActiveTab(tab);
                  if (tab !== 'forYou') {
                    setSearchResults(null);
                  }
                }}
              >
                {labels[tab]}
                {activeTab === tab && <div className="explore-view__tab-indicator" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Trends List (when not in custom search mode) */}
      {!searchResults && (
        <div className="explore-view__trends-list">
          <h2 className="explore-view__section-title">Trends for you</h2>
          {trendingTopics.map((trend) => (
            <div
              key={trend.id}
              className="explore-view__trend-item"
              onClick={() => handleTrendClick(trend.title)}
            >
              <div>
                <div className="explore-view__trend-category">{trend.category}</div>
                <div className="explore-view__trend-title">{trend.title}</div>
                <div className="explore-view__trend-posts">{trend.posts}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Posts Section */}
      <div className="explore-view__results">
        <h2 className="explore-view__section-title">
          {searchResults !== null ? `Search Results for "${searchTerm}"` : 'Popular Posts'}
        </h2>

        {isSearching ? (
          <LoadingSkeleton count={3} />
        ) : displayedPosts.length > 0 ? (
          displayedPosts.map((tweet) => {
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
          })
        ) : (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#71767b' }}>
            <h3>No results found</h3>
            <p>Try searching for other keywords, users, or topics.</p>
          </div>
        )}
      </div>
    </main>
  );
};

export default Explore;
