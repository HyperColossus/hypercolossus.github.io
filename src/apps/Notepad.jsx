import React from 'react';
import { readme } from '../content/readme';

export default function Notepad() {
  return <div className="notepad">
    <pre className="notepad-text" tabIndex={0}>{readme}</pre>
  </div>;
}
