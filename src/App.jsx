import React, {lazy, useEffect} from 'react';
import AppBoundary from './components/AppBoundary';
const IntroScene=lazy(() => import('./components/IntroScene'));
const RiftboundCompanion=lazy(() => import('./apps/RiftboundCompanion'));

function App() {
  const tracker=window.location.pathname.replace(/\/$/,'')==='/riftbound';
  useEffect(() => {document.title=tracker ? 'Riftbound Companion | HyperColossus' : 'Zachary Siegel | Portfolio';},[tracker]);
  if(tracker) return <div className="rb-standalone"><AppBoundary><RiftboundCompanion /></AppBoundary></div>;
  return (
      <div className="w-full h-screen overflow-hidden bg-black">
        <AppBoundary><IntroScene /></AppBoundary>
      </div>
  );
}

export default App;
