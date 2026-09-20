import React from 'react';
import { createRoot } from 'react-dom/client';
import { GamesSite } from './sites/StandaloneSites.jsx';
import './sites/standalone.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GamesSite />
  </React.StrictMode>,
);
