import React from 'react';
import { ChartNoAxesCombined, Folder, ArrowUpRight } from 'lucide-react';
import { desktopConfig } from '../desktopConfig';
import { useWindows } from '../useWindows';

export default function SideProjects() {
  const { openWindow } = useWindows();
  const projects = desktopConfig.filter(app => app.folder === 'side-projects');

  return <div className="side-projects-folder">
    <div className="folder-path"><Folder size={15} strokeWidth={1.5} /><span>Desktop / <strong>Side projects</strong></span></div>
    <div className="folder-contents">
      <p className="eyebrow">Small tools & experiments</p>
      {projects.map(app => <button key={app.id} className="folder-item" onClick={() => openWindow(app)}>
        <span className="folder-item-icon"><ChartNoAxesCombined size={26} strokeWidth={1.4} aria-hidden="true" /></span>
        <span><strong>{app.label}</strong><small>{app.description}</small></span>
        <ArrowUpRight size={16} aria-hidden="true" />
      </button>)}
    </div>
    <footer className="folder-status">{projects.length} {projects.length === 1 ? 'item' : 'items'}</footer>
  </div>;
}
