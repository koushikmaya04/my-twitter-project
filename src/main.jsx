import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles/global.css';

// Entry point: Initialize React 18 Root with Concurrent Mode enabled
// React.StrictMode aids in highlighting potential side-effects and deprecated APIs during development
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
