import React from 'react';
import { createRoot } from 'react-dom/client';
import { LabSite } from './sites/StandaloneSites.jsx';
import './sites/standalone.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LabSite />
  </React.StrictMode>,
);
