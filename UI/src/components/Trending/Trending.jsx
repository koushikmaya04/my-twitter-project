import React, { useState } from 'react';
import './Trending.css';

/**
 * Trending — Today's News and What's Happening section.
 * Matches the Twitter/X right sidebar cards.
 */
const Trending = () => {
  const [showNews, setShowNews] = useState(true);

  const newsItems = [
    {
      category: 'Technology',
      title: 'React 19 Released with Groundbreaking Performance Updates',
      time: '23 hours ago',
      source: 'News',
      posts: '124 posts',
      avatars: ['https://i.pravatar.cc/24?img=1', 'https://i.pravatar.cc/24?img=2'],
    },
    {
      category: 'Science',
      title: 'SpaceX Successfully Launches New Satellite Constellation',
      time: '1 day ago',
      source: 'News',
      posts: '4,981 posts',
      avatars: ['https://i.pravatar.cc/24?img=3', 'https://i.pravatar.cc/24?img=4', 'https://i.pravatar.cc/24?img=5'],
    },
    {
      category: 'Business',
      title: 'AI Startups See Record Funding in 2024 Q4',
      time: '6 hours ago',
      source: 'News',
      posts: '1,024 posts',
      avatars: ['https://i.pravatar.cc/24?img=6', 'https://i.pravatar.cc/24?img=7', 'https://i.pravatar.cc/24?img=8'],
    },
  ];

  const trendingTopics = [
    { category: 'Technology · Trending', title: '#ReactJS', posts: '28.4K posts' },
    { category: 'Sports · Trending', title: '#WorldCup2026', posts: '142K posts' },
    { category: 'Entertainment · Trending', title: '#Oscars', posts: '95.2K posts' },
    { category: 'Technology · Trending', title: '#JavaScript', posts: '18.7K posts' },
    { category: 'Politics · Trending', title: '#Election2024', posts: '230K posts' },
  ];

  return (
    <>
      {/* Today's News Card */}
      {showNews && (
        <div className="trending__card">
          <div className="trending__card-header">
            <h2 className="trending__card-title">Today's News</h2>
            <button className="trending__close-btn" onClick={() => setShowNews(false)}>
              <svg viewBox="0 0 15 15" width="16" height="16" fill="currentColor">
                <path d="M6.09 7.5L.04 1.46 1.46.04 7.5 6.09 13.54.04l1.42 1.42L8.91 7.5l6.05 6.04-1.42 1.42L7.5 8.91l-6.04 6.05-1.42-1.42L6.09 7.5z" />
              </svg>
            </button>
          </div>
          {newsItems.map((item, index) => (
            <div key={index} className="trending__news-item">
              <h3 className="trending__news-title">{item.title}</h3>
              <div className="trending__news-meta">
                <div className="trending__news-avatars">
                  {item.avatars.map((avatar, i) => (
                    <img key={i} className="trending__news-avatar" src={avatar} alt="" />
                  ))}
                </div>
                <span>{item.time} · {item.source} · {item.posts}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* What's Happening */}
      <div className="trending__card">
        <h2 className="trending__card-title">What's happening</h2>
        {trendingTopics.map((topic, index) => (
          <div key={index} className="trending__topic">
            <div className="trending__topic-info">
              <span className="trending__topic-category">{topic.category}</span>
              <span className="trending__topic-title">{topic.title}</span>
              <span className="trending__topic-posts">{topic.posts}</span>
            </div>
            <button className="trending__topic-more">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M3 12c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm9 2c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm7 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z" />
              </svg>
            </button>
          </div>
        ))}
        <a href="#" className="trending__show-more">Show more</a>
      </div>
    </>
  );
};

export default Trending;
