import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, RotateCw, House, Globe, Star, ChevronRight, Search, Plus, X, BookOpen, GitFork, Play, ShieldAlert, AtSign } from 'lucide-react';
import PixelIcon from '../components/PixelIcon';
import { useWindows } from '../useWindows';
import { desktopConfig } from '../desktopConfig';
import { classify, resolveInput, homeUrl, searchUrl, titleFor, NEW_TAB_URL } from './browser/router';
import { initialTabs, tabsReducer, currentUrl } from './browser/tabs';
import { TabContext } from './browser/ui';
import PortfolioSite from './browser/PortfolioSite';
import { homePageTitle } from './browser/localSearch';
import { SearchSite, GitHubSite, WikiSite, VideoSite, BlockedSite, FrameSite, ServerError } from './browser/sites';
import { XSite, EmbedSite } from './browser/social';
import './browser.css';
import './browser-sites.css';

// Internet Explorer for Cola OS: tabs, Back/Forward per tab, an address bar that takes addresses or
// searches, and a Fizz Search box. Pages open inside the window; see browser/router.js for what
// draws each site.
export default function RetroBrowser({ windowData }) {
  const { openWindow, closeWindow, retitleWindow } = useWindows();
  const request = windowData?.request;
  // A request from the desktop is a homepage path ({ path: 'resume' }) or any address ({ url }).
  const requestUrl = req => req?.url ?? homeUrl(req?.path ?? 'home');
  const [state, dispatch] = useReducer(tabsReducer, null, () => initialTabs(requestUrl(request)));
  const [busy, setBusy] = useState({});
  const [hover, setHover] = useState(null);
  const addressRef = useRef(null);
  const active = state.tabs.find(tab => tab.id === state.activeId);
  const url = active ? currentUrl(active) : NEW_TAB_URL;
  const title = active ? tabTitle(active) : '';

  // The desktop can ask an already-open browser to show a page (Start menu → Résumé, …).
  const handledRequest = useRef(request?.nonce);
  useEffect(() => {
    if (!request || request.nonce === handledRequest.current) return;
    handledRequest.current = request.nonce;
    dispatch({ type: 'navigate', url: requestUrl(request) });
  });
  // Closing the last tab closes the window, like IE7.
  useEffect(() => { if (!state.tabs.length) closeWindow(windowData.id); }, [state.tabs.length]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (title) retitleWindow(windowData.id, `${title} - Internet Explorer`); }, [title]); // eslint-disable-line react-hooks/exhaustive-deps

  const openApp = useCallback(id => openWindow(desktopConfig.find(app => app.id === id)), [openWindow]);
  const markBusy = useCallback((id, value) => setBusy(prev => (!!prev[id] === value ? prev : { ...prev, [id]: value })), []);
  const newTab = () => { dispatch({ type: 'open' }); requestAnimationFrame(() => addressRef.current?.select()); };
  const go = input => { const next = resolveInput(input); if (next) dispatch({ type: 'navigate', url: next }); };
  const link = (href, label, hint = href) => <LinkButton onClick={() => dispatch({ type: 'navigate', url: href })} hint={hint} setHover={setHover}><Star size={11} />{label}</LinkButton>;

  const loading = !!(active && busy[active.id]);
  const status = loading ? `Opening page ${url}...` : hover || 'Done';

  return <div className="portfolio-browser" data-app="portfolio">
    <div className="xp-toolbar" role="toolbar" aria-label="Browser">
      <button className="xp-tool" disabled={!active || active.index === 0} onClick={() => dispatch({ type: 'step', delta: -1 })}><span className="xp-round back"><ArrowLeft size={15} strokeWidth={3} /></span>Back</button>
      <button className="xp-tool" aria-label="Forward" disabled={!active || active.index === active.entries.length - 1} onClick={() => dispatch({ type: 'step', delta: 1 })}><span className="xp-round fwd"><ArrowRight size={15} strokeWidth={3} /></span></button>
      <span className="xp-sep" />
      <button className="xp-tool" aria-label="Refresh" onClick={() => dispatch({ type: 'reload' })}><RotateCw size={16} /></button>
      <button className="xp-tool" aria-label="Home" onClick={() => dispatch({ type: 'navigate', url: homeUrl() })}><House size={17} /></button>
      <span className="xp-throbber" data-loading={loading} aria-hidden="true"><Globe size={22} strokeWidth={1.5} /></span>
    </div>
    <div className="xp-address-row">
      <form className="xp-address" onSubmit={event => { event.preventDefault(); go(addressRef.current.value); }}>
        <label htmlFor="xp-url">Address</label>
        <div className="xp-url-field"><SiteIcon url={url} size={12} /><input id="xp-url" key={`${active?.id}:${url}`} ref={addressRef} defaultValue={url} spellCheck={false} autoComplete="off" onFocus={event => event.target.select()} placeholder="Type an address or search" /></div>
        <button type="submit" className="xp-go"><ChevronRight size={13} strokeWidth={3} />Go</button>
      </form>
    </div>
    <nav className="xp-links" aria-label="Links">
      <span>Links</span>
      <LinkButton onClick={() => openApp('games')} hint="Open Steam.exe" setHover={setHover}><Star size={11} />My Games</LinkButton>
      {link(homeUrl('work/video'), 'My Edits')}
      {link('https://github.com/HyperColossus', 'GitHub')}
      {link(NEW_TAB_URL, 'Fizz Search')}
      {link('https://en.wikipedia.org/wiki/Main_Page', 'Wikipedia')}
    </nav>

    <div className="xp-tabs" role="tablist" aria-label="Tabs">
      {state.tabs.map(tab => <TabButton key={tab.id} tab={tab} active={tab.id === state.activeId} busy={!!busy[tab.id]}
        onSelect={() => dispatch({ type: 'activate', id: tab.id })} onClose={() => dispatch({ type: 'close', id: tab.id })} />)}
      <button className="xp-newtab" aria-label="Open a new tab" title="New Tab" onClick={newTab}><Plus size={12} strokeWidth={2.5} /></button>
    </div>

    <div className="xp-pages">
      {state.tabs.map(tab => <TabPage key={tab.id} tab={tab} active={tab.id === state.activeId}
        dispatch={dispatch} setHover={setHover} markBusy={markBusy} openApp={openApp} />)}
    </div>

    <div className="xp-status" role="status" aria-live="polite">
      <span className="xp-status-text">{loading ? <span className="xp-progress" aria-hidden="true"><i /></span> : <Globe size={12} aria-hidden="true" />}{status}</span>
      <span className="xp-zone"><Globe size={12} aria-hidden="true" />Internet</span>
    </div>
  </div>;
}

function tabTitle(tab) {
  if (tab.title) return tab.title;
  const url = currentUrl(tab);
  const page = classify(url);
  return page.site === 'home' ? homePageTitle(page.path) : titleFor(url);
}

function LinkButton({ onClick, hint, setHover, children }) {
  return <button onClick={onClick} onMouseEnter={() => setHover(hint)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(hint)} onBlur={() => setHover(null)}>{children}</button>;
}

function SiteIcon({ url, size = 14 }) {
  const site = classify(url).site;
  if (site === 'home') return <PixelIcon name="browser" size={size + 2} />;
  const Icon = { search: Search, github: GitFork, wiki: BookOpen, video: Play, embed: Play, x: AtSign, blocked: ShieldAlert }[site] ?? Globe;
  return <Icon size={size} aria-hidden="true" className={`site-icon is-${site}`} />;
}

function TabButton({ tab, active, busy, onSelect, onClose }) {
  const title = tabTitle(tab);
  return <div className="xp-tab" role="tab" aria-selected={active} data-active={active} title={title}
    tabIndex={active ? 0 : -1} onClick={onSelect} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(); } }}
    onAuxClick={event => { if (event.button === 1) { event.preventDefault(); onClose(); } }}>
    {busy ? <span className="net-spinner is-tab" aria-hidden="true" /> : <SiteIcon url={currentUrl(tab)} size={12} />}
    <span className="xp-tab-title">{title}</span>
    <button className="xp-tab-close" aria-label={`Close ${title}`} onClick={event => { event.stopPropagation(); onClose(); }}><X size={10} strokeWidth={3} /></button>
  </div>;
}

// One tab's page. Every tab stays mounted (hidden when inactive), so switching tabs keeps each
// page's scroll position, loaded data and playing video, like a real browser.
function TabPage({ tab, active, dispatch, setHover, markBusy, openApp }) {
  const url = currentUrl(tab);
  const scrollRef = useRef(null);
  const [fetching, setFetching] = useState(0);
  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0);
  }, [url, tab.reload]);
  useEffect(() => { markBusy(tab.id, fetching > 0); }, [tab.id, fetching, markBusy]);

  const context = useMemo(() => ({
    go: next => dispatch({ type: 'navigate', id: tab.id, url: next }),
    openTab: next => dispatch({ type: 'open', url: next, after: tab.id, background: true }), // Ctrl-click / middle-click: a background tab, like a real browser
    setHover: text => { if (active) setHover(text); },
    setBusy: value => setFetching(count => Math.max(0, count + (value ? 1 : -1))),
    setTitle: title => dispatch({ type: 'title', id: tab.id, url, title }),
    frameNavigated: (next, title, replace) => dispatch({ type: 'frame', id: tab.id, url: next, title, replace }),
    openApp,
  }), [dispatch, tab.id, url, active, setHover, openApp]);

  const page = classify(url);
  return <div className="portfolio-scroll" ref={scrollRef} hidden={!active} role="tabpanel" data-site={page.site}>
    <TabContext.Provider value={context}>
      {/* A proxied page stays mounted while the user browses inside it (it steers itself). */}
      <PageFor key={page.site === 'frame' ? `frame#${tab.reload}` : `${url}#${tab.reload}`} page={page} url={url} />
    </TabContext.Provider>
  </div>;
}

function PageFor({ page, url }) {
  switch (page.site) {
    case 'home': return <PortfolioSite path={page.path} />;
    case 'search': return <SearchSite query={page.query} via={page.via} />;
    case 'github': return <GitHubSite {...page} />;
    case 'wiki': return <WikiSite {...page} />;
    case 'video': return <VideoSite {...page} />;
    case 'x': return <XSite {...page} />;
    case 'embed': return <EmbedSite {...page} />;
    case 'blocked': return <BlockedSite {...page} />;
    case 'frame': return <FrameSite {...page} />;
    default: return <ServerError href={url} />;
  }
}
