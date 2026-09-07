import React from 'react';
import SearchBar from '../SearchBar/SearchBar.jsx';
import Trending from '../Trending/Trending.jsx';
import './RightSidebar.css';

/**
 * RightSidebar — Right column with search, premium card, and trending.
 * Matches the Twitter/X desktop layout.
 */
const RightSidebar = ({ onSearch }) => {
  return (
    <aside className="right-sidebar">
      {/* Sticky search bar */}
      <div className="right-sidebar__search">
        <SearchBar onSearch={onSearch} />
      </div>

      {/* Subscribe to Premium */}
      <div className="right-sidebar__card right-sidebar__premium">
        <h2 className="right-sidebar__card-title">Subscribe to Premium</h2>
        <p className="right-sidebar__card-desc">
          Get rid of ads, see your analytics, boost your replies and unlock 20+ features.
        </p>
        <button className="right-sidebar__subscribe-btn">Subscribe</button>
      </div>

      {/* Today's News / Trending */}
      <Trending />

      {/* Footer links */}
      <div className="right-sidebar__footer">
        <a href="#">Terms of Service</a>
        <a href="#">Privacy Policy</a>
        <a href="#">Cookie Policy</a>
        <a href="#">Accessibility</a>
        <a href="#">Ads info</a>
        <a href="#">More</a>
        <span>© 2024 X Corp.</span>
      </div>
    </aside>
  );
};

export default RightSidebar;
