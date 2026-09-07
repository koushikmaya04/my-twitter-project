import React from 'react';
import Home from './pages/Home/Home.jsx';
import NotificationContainer from './components/NotificationToast/NotificationContainer.jsx';
import './App.css';

/**
 * App — Root component.
 * Renders the Home page and the global NotificationContainer overlay.
 *
 * The NotificationContainer is rendered at the root level so toast
 * notifications appear above all other content regardless of which
 * component emits the event.
 */
const App = () => {
  return (
    <div className="app">
      <Home />
      <NotificationContainer />
    </div>
  );
};

export default App;
