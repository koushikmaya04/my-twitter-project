import React, { useState, useCallback, useEffect, useRef } from 'react';
import { debounce } from '../../utils/debounce.js';
import './SearchBar.css';

/**
 * SearchBar — Twitter-style search input with CUSTOM DEBOUNCE.
 * 
 * DEMONSTRATES: Debounce in action.
 * The onSearch callback is debounced so it only fires after the user
 * stops typing for 300ms, NOT on every keystroke.
 */
const SearchBar = ({ onSearch }) => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  // Create a stable debounced search function
  // useMemo/useRef ensures the same debounced function persists across renders
  const debouncedSearch = useRef(
    debounce((searchQuery) => {
      console.log(`Searching for: "${searchQuery}"`);
      onSearch?.(searchQuery);
    }, 300)
  ).current;

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  const handleChange = useCallback(
    (e) => {
      const value = e.target.value;
      setQuery(value);
      // This calls the debounced version — it will wait 300ms
      // after the user stops typing before actually searching
      debouncedSearch(value);
    },
    [debouncedSearch]
  );

  const handleClear = useCallback(() => {
    setQuery('');
    debouncedSearch.cancel();
    onSearch?.('');
  }, [onSearch, debouncedSearch]);

  return (
    <div className={`search-bar ${isFocused ? 'search-bar--focused' : ''}`}>
      <div className="search-bar__icon">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
          <path d="M10.25 3.75c-3.59 0-6.5 2.91-6.5 6.5s2.91 6.5 6.5 6.5c1.795 0 3.419-.726 4.596-1.904 1.178-1.177 1.904-2.801 1.904-4.596 0-3.59-2.91-6.5-6.5-6.5zm-8.5 6.5c0-4.694 3.806-8.5 8.5-8.5s8.5 3.806 8.5 8.5c0 1.986-.682 3.815-1.824 5.262l4.781 4.781-1.414 1.414-4.781-4.781c-1.447 1.142-3.276 1.824-5.262 1.824-4.694 0-8.5-3.806-8.5-8.5z" />
        </svg>
      </div>
      <input
        className="search-bar__input"
        type="text"
        placeholder="Search"
        value={query}
        onChange={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
      {query && (
        <button className="search-bar__clear" onClick={handleClear}>
          <svg viewBox="0 0 15 15" width="14" height="14" fill="currentColor">
            <path d="M6.09 7.5L.04 1.46 1.46.04 7.5 6.09 13.54.04l1.42 1.42L8.91 7.5l6.05 6.04-1.42 1.42L7.5 8.91l-6.04 6.05-1.42-1.42L6.09 7.5z" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default SearchBar;
