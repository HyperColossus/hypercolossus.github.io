import React from 'react';
import { Folder, FlaskConical, Sparkles } from 'lucide-react';

export default function SideProjects() {
  return (
    <div className="side-projects-folder">
      <div className="folder-path">
        <Folder size={15} strokeWidth={1.5} />
        <span>Desktop / <strong>Side projects</strong></span>
      </div>

      <div className="folder-contents folder-empty-state">
        <div className="folder-empty-icon" aria-hidden="true">
          <FlaskConical size={30} strokeWidth={1.4} />
        </div>
        <p className="eyebrow">THE LAB</p>
        <h2>Small experiments live here.</h2>
        <p>
          I’m rebuilding this section around projects that are worth opening.
          New tools, prototypes, and one-off experiments will land here as they’re ready.
        </p>
        <span className="folder-empty-status"><Sparkles size={13} /> In progress</span>
      </div>

      <footer className="folder-status">Workspace ready</footer>
    </div>
  );
}
