import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Globe, Search, BookOpen, Star, GitFork, Folder, FileText, MapPin, Users, ShieldAlert, Info, Play } from 'lucide-react';
import { work } from '../../content/work';
import { media } from '../../content/media';
import { github, wikipedia, cleanHtml, decodeBase64 } from './net';
import { searchSite } from './localSearch';
import { homeUrl, searchUrl, NEW_TAB_URL } from './router';
import { PROXY_URL, PROXY_ORIGIN, proxied } from './config';
import { WebLink, HtmlContent, Loading, useResource, usePageTitle, useTab, scrollToElement } from './ui';

const plain = html => String(html ?? '').replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#0?39;/g, '\'').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const shortUrl = href => href.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
const ago = iso => {
  const days = Math.round((Date.now() - new Date(iso)) / 864e5);
  if (days < 1) return 'today';
  if (days < 31) return `${days} day${days === 1 ? '' : 's'} ago`;
  return `on ${new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
};

// ============================== Fizz Search ==============================
function FizzLogo({ small }) {
  return <span className={`fizz-logo ${small ? 'is-small' : ''}`} aria-label="Fizz Search">{'Fizz'.split('').map((letter, index) => <b key={index}>{letter}</b>)}<i>!</i></span>;
}

function SearchBox({ query, big }) {
  const tab = useTab();
  const input = useRef(null);
  const submit = event => {
    event.preventDefault();
    const text = input.current.value.trim();
    if (text) tab.go(searchUrl(text));
  };
  return <form className={`fizz-form ${big ? 'is-big' : ''}`} onSubmit={submit} role="search">
    <input ref={input} key={query} defaultValue={query} aria-label="Search the web" autoComplete="off" spellCheck={false} autoFocus={big} />
    <button type="submit" className="fizz-btn">Fizz Search</button>
  </form>;
}

function ViaNote({ via }) {
  if (!via) return null;
  return <p className="fizz-via"><Info size={12} /> {via} doesn’t let its search run inside other websites, so Cola OS searched with Fizz instead.</p>;
}

export function SearchSite({ query, via }) {
  if (!query) {
    return <div className="fizz fizz-home">
      <ViaNote via={via} />
      <FizzLogo />
      <p className="fizz-tag">Search the web. Stay on the computer.</p>
      <SearchBox big />
      <p className="fizz-try">Try: <WebLink href={searchUrl('Zachary Siegel')}>Zachary Siegel</WebLink> · <WebLink href={searchUrl('League of Legends')}>League of Legends</WebLink> · <WebLink href={searchUrl('esports')}>esports</WebLink> · <WebLink href="https://github.com/HyperColossus">github.com/HyperColossus</WebLink></p>
    </div>;
  }
  return <div className="fizz">
    <header className="fizz-head"><WebLink href={NEW_TAB_URL} className="fizz-home-link"><FizzLogo small /></WebLink><SearchBox query={query} /></header>
    <ViaNote via={via} />
    <div className="fizz-results">
      <SiteResults query={query} />
      <WebResults query={query} />
    </div>
  </div>;
}

function Result({ href, title, snippet, extra }) {
  return <li className="fizz-result">
    <WebLink href={href} className="fizz-title">{title}</WebLink>
    {snippet && <p>{snippet}</p>}
    <cite>{shortUrl(href)}{extra ? ` · ${extra}` : ''}</cite>
  </li>;
}

function SiteResults({ query }) {
  const results = searchSite(query);
  if (!results.length) return null;
  return <section className="fizz-section">
    <h2><Star size={12} /> From Zack’s site</h2>
    <ol>{results.map(result => <Result key={result.url + result.title} href={result.url} title={result.title} snippet={result.snippet} extra={result.video ? 'Video' : null} />)}</ol>
  </section>;
}

// Live web results (Tavily or Brave Search, through the proxy): Fizz is a wrapper for web search.
function WebResults({ query }) {
  const { loading, data, error } = useResource(async () => {
    if (!PROXY_URL) throw new Error('offline');
    const response = await fetch(`${PROXY_URL}/__cola/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }, [query]);
  const results = data?.results ?? [];
  return <section className="fizz-section">
    <h2><Globe size={12} /> Web results</h2>
    {loading && <Loading what="results" />}
    {error && <p className="fizz-note">Web search isn’t reachable right now. Try again in a moment.</p>}
    {data && !results.length && <p className="fizz-note">No results for <b>{query}</b>.</p>}
    {results.length > 0 && <>
      <ol>{results.map(hit => <Result key={hit.url} href={hit.url} title={plain(hit.title)} snippet={plain(hit.description)} />)}</ol>
      <p className="fizz-note">Web results by {data.provider === 'brave' ? 'Brave Search' : 'Tavily'}</p>
    </>}
  </section>;
}

// ============================== GitHub ==============================
export function GitHubSite({ owner, repo, kind, ref, path }) {
  if (!owner) return <GitHubHome />;
  if (!repo) return <GitHubProfile owner={owner} />;
  return <GitHubRepo owner={owner} repo={repo} kind={kind} gitRef={ref} path={path} />;
}

function GitHubFrame({ children, crumbs }) {
  return <div className="gh">
    <header className="gh-bar"><WebLink href="https://github.com/" className="gh-brand">github</WebLink>{crumbs}</header>
    <div className="gh-page">{children}</div>
  </div>;
}

function GitHubHome() {
  return <GitHubFrame>
    <div className="gh-empty"><h1>GitHub</h1><p>Browse public code right here. Start with <WebLink href="https://github.com/HyperColossus">HyperColossus</WebLink>.</p></div>
  </GitHubFrame>;
}

function SnapshotNote({ show }) {
  return show ? <p className="gh-note"><Info size={12} /> GitHub isn’t answering right now, so this is a saved copy of the page.</p> : null;
}

function GitHubProfile({ owner }) {
  const { loading, data, error } = useResource(() => Promise.all([github.user(owner), github.repos(owner)]), [owner]);
  usePageTitle(data ? `${data[0].login}${data[0].name ? ` (${data[0].name})` : ''} · GitHub` : null);
  if (loading) return <GitHubFrame><Loading what="profile" /></GitHubFrame>;
  if (error) return <GitHubFrame><GitHubError error={error} what={`the user “${owner}”`} /></GitHubFrame>;
  const [user, { items: repos, fromSnapshot }] = data;
  return <GitHubFrame crumbs={<span className="gh-crumb">/ {user.login}</span>}>
    <SnapshotNote show={fromSnapshot || user.fromSnapshot} />
    <div className="gh-profile">
      <aside className="gh-card">
        <img src={user.avatar_url} alt="" width="180" height="180" onError={event => event.currentTarget.classList.add('is-missing')} />
        <h1>{user.name || user.login}</h1>
        <p className="gh-login">{user.login}</p>
        {user.bio && <p>{user.bio}</p>}
        <p className="gh-meta"><Users size={12} /> <b>{user.followers}</b> followers · <b>{user.following}</b> following</p>
        {user.location && <p className="gh-meta"><MapPin size={12} /> {user.location}</p>}
        {user.blog && <p className="gh-meta"><Globe size={12} /> <WebLink href={/^https?:/.test(user.blog) ? user.blog : `http://${user.blog}`}>{user.blog}</WebLink></p>}
        <p className="gh-meta">Joined {new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
      </aside>
      <section className="gh-repos">
        <h2>Repositories <span className="gh-count">{repos.length}</span></h2>
        {repos.length === 0 && <p>No public repositories yet.</p>}
        <ul>{repos.map(item => <li key={item.id}>
          <WebLink href={item.html_url} className="gh-repo-name">{item.name}</WebLink>{item.fork && <span className="gh-pill">Fork</span>}<span className="gh-pill">Public</span>
          {item.description && <p>{item.description}</p>}
          <p className="gh-meta">{item.language && <><span className="gh-lang" />{item.language} · </>}<Star size={11} /> {item.stargazers_count} · Updated {ago(item.pushed_at || item.updated_at)}</p>
        </li>)}</ul>
      </section>
    </div>
  </GitHubFrame>;
}

function GitHubRepo({ owner, repo, kind, gitRef, path }) {
  const { loading, data, error } = useResource(() => github.repo(owner, repo), [owner, repo]);
  const base = `https://github.com/${owner}/${repo}`;
  const ref = gitRef || data?.default_branch || 'HEAD';
  const parts = path ? path.split('/') : [];
  const crumbs = <span className="gh-crumb">/ <WebLink href={`https://github.com/${owner}`}>{owner}</WebLink> / <WebLink href={base}><b>{repo}</b></WebLink>
    {parts.map((part, index) => <React.Fragment key={index}> / {index === parts.length - 1 ? part : <WebLink href={`${base}/tree/${ref}/${parts.slice(0, index + 1).join('/')}`}>{part}</WebLink>}</React.Fragment>)}</span>;
  if (loading) return <GitHubFrame crumbs={crumbs}><Loading what="repository" /></GitHubFrame>;
  if (error) return <GitHubFrame crumbs={crumbs}><GitHubError error={error} what={`the repository “${owner}/${repo}”`} /></GitHubFrame>;
  return <GitHubFrame crumbs={crumbs}>
    <SnapshotNote show={data.fromSnapshot} />
    {kind === 'repo' && <div className="gh-repo-head">
      {data.description && <p className="gh-desc">{data.description}</p>}
      <p className="gh-meta"><Star size={12} /> {data.stargazers_count} stars · <GitFork size={12} /> {data.forks_count} forks{data.language ? ` · ${data.language}` : ''} · Updated {ago(data.pushed_at || data.updated_at)}</p>
    </div>}
    {kind === 'file'
      ? <GitHubFile owner={owner} repo={repo} gitRef={ref} path={path} />
      : <>
        <GitHubTree owner={owner} repo={repo} gitRef={ref} path={path} base={base} />
        {kind === 'repo' && <GitHubReadme owner={owner} repo={repo} gitRef={ref} />}
      </>}
  </GitHubFrame>;
}

function GitHubTree({ owner, repo, gitRef, path, base }) {
  const { loading, data, error } = useResource(() => github.contents(owner, repo, path, path ? gitRef : undefined), [owner, repo, path, gitRef]);
  if (loading) return <Loading what="files" />;
  if (error) return <GitHubError error={error} what="this folder" />;
  const items = [...data.items].sort((a, b) => (a.type === 'dir' ? 0 : 1) - (b.type === 'dir' ? 0 : 1) || a.name.localeCompare(b.name));
  const parent = path.split('/').slice(0, -1).join('/');
  return <table className="gh-files"><tbody>
    {path && <tr><td><Folder size={14} className="gh-dir" /></td><td><WebLink href={parent ? `${base}/tree/${gitRef}/${parent}` : base}>..</WebLink></td><td /></tr>}
    {items.map(item => <tr key={item.path}>
      <td>{item.type === 'dir' ? <Folder size={14} className="gh-dir" /> : <FileText size={14} />}</td>
      <td><WebLink href={`${base}/${item.type === 'dir' ? 'tree' : 'blob'}/${gitRef}/${item.path}`}>{item.name}</WebLink></td>
      <td className="gh-size">{item.type === 'file' ? `${(item.size / 1024).toFixed(item.size < 10240 ? 1 : 0)} KB` : ''}</td>
    </tr>)}
  </tbody></table>;
}

function GitHubReadme({ owner, repo, gitRef }) {
  const { data } = useResource(() => github.readme(owner, repo), [owner, repo]);
  if (!data?.html) return null;
  return <ReadmeBody html={data.html} owner={owner} repo={repo} gitRef={gitRef} />;
}

function ReadmeBody({ html: source, owner, repo, gitRef }) {
  const raw = `https://raw.githubusercontent.com/${owner}/${repo}/${gitRef}/`;
  const html = useMemo(() => cleanHtml(source, {
    base: `https://github.com/${owner}/${repo}/blob/${gitRef}/`,
    fixSrc: (absolute, original) => /^(https?:)?\/\//.test(original) ? absolute : raw + original.replace(/^\.?\//, ''),
  }), [source, owner, repo, gitRef, raw]);
  return <section className="gh-readme"><h3><BookOpen size={13} /> README</h3><HtmlContent html={html} className="gh-markdown" /></section>;
}

const IMAGE = /\.(png|jpe?g|gif|webp|svg|ico|bmp)$/i;
function GitHubFile({ owner, repo, gitRef, path }) {
  const { loading, data, error } = useResource(() => github.contents(owner, repo, path, gitRef), [owner, repo, path, gitRef]);
  if (loading) return <Loading what="file" />;
  if (error) return <GitHubError error={error} what={`the file “${path}”`} />;
  const size = `${(data.size / 1024).toFixed(1)} KB`;
  if (IMAGE.test(path)) return <div className="gh-file"><p className="gh-file-head">{data.name} · {size}</p><div className="gh-image"><img src={data.download_url} alt={data.name} /></div></div>;
  if (!data.content) return <div className="gh-file"><p className="gh-file-head">{data.name} · {size}</p><p className="gh-empty">This file is too big to show here.</p></div>;
  const lines = decodeBase64(data.content).replace(/\n$/, '').split('\n');
  return <div className="gh-file">
    <p className="gh-file-head">{data.name} · {lines.length} lines · {size}</p>
    <pre className="gh-code"><code>{lines.map((line, index) => <span key={index} className="gh-line"><i>{index + 1}</i>{line || ' '}{'\n'}</span>)}</code></pre>
  </div>;
}

function GitHubError({ error, what }) {
  const limited = error?.status === 403 || error?.status === 429;
  return <div className="gh-empty">
    <h1>{error?.status === 404 ? '404' : 'Hmm…'}</h1>
    <p>{error?.status === 404 ? `We couldn’t find ${what}.` : limited ? 'GitHub is limiting requests from this computer for a little while. Try again later.' : `We couldn’t load ${what}. Check the connection and try again.`}</p>
  </div>;
}

// ============================== Wikipedia ==============================
export function WikiSite({ lang, title, hash }) {
  const tab = useTab();
  const { loading, data, error } = useResource(() => wikipedia.article(lang, title), [lang, title]);
  usePageTitle(data ? `${data.title} - Wikipedia` : null);
  const scroller = useRef(null);
  const html = useMemo(() => data ? cleanHtml(data.html, { base: `https://${lang}.wikipedia.org/wiki/` }) : '', [data, lang]);
  const heading = useMemo(() => data ? { __html: cleanHtml(data.displayTitle) } : null, [data]);
  return <div className="wiki" ref={scroller}>
    <header className="wiki-head">
      <WebLink href={`https://${lang}.wikipedia.org/wiki/Main_Page`} className="wiki-brand">Wikipedia<small>The Free Encyclopedia</small></WebLink>
      <form className="wiki-search" onSubmit={event => { event.preventDefault(); const text = event.currentTarget.elements.q.value.trim(); if (text) tab.go(searchUrl(text)); }}>
        <input name="q" placeholder="Search" aria-label="Search" autoComplete="off" /><button type="submit"><Search size={12} /></button>
      </form>
    </header>
    <article className="wiki-article">
      {loading && <Loading what="article" />}
      {error && <>
        <h1 className="wiki-title">{title}</h1>
        <p>{error.missing ? <>Wikipedia does not have an article with this exact name. <WebLink href={searchUrl(title)}>Search for “{title}”</WebLink> instead.</> : 'Couldn’t reach Wikipedia right now. Try again in a moment.'}</p>
      </>}
      {data && <>
        <h1 className="wiki-title" dangerouslySetInnerHTML={heading} />
        <p className="wiki-from">From Wikipedia, the free encyclopedia</p>
        <WikiBody html={html} hash={hash} />
        <p className="wiki-license">Text is available under the Creative Commons Attribution-ShareAlike License; additional terms may apply. Shown in Cola OS from {lang}.wikipedia.org.</p>
      </>}
    </article>
  </div>;
}

function WikiBody({ html, hash }) {
  const ref = useRef(null);
  React.useEffect(() => {
    if (!hash || !ref.current) return;
    scrollToElement(ref.current.querySelector(`[id="${CSS.escape(decodeURIComponent(hash))}"]`));
  }, [html, hash]);
  return <div ref={ref}><HtmlContent html={html} className="wiki-content" /></div>;
}

// ============================== Video ==============================
// Videos, Shorts, playlists and whole channels, all with YouTube's embeddable player.
const YT_ALLOW = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
function YouTubePlayer({ src, title, vertical }) {
  return <div className={`vid-player ${vertical ? 'is-short' : ''}`}>
    {/* No popups: the player's "watch on YouTube" links can't open a real browser tab. */}
    <iframe src={src} title={title} allow={YT_ALLOW} allowFullScreen sandbox="allow-scripts allow-same-origin allow-presentation" />
  </div>;
}

export function VideoSite({ id, isShort, list, channel }) {
  const clip = media.find(item => item.id === id);
  const more = media.filter(item => item.id !== id);
  usePageTitle(id ? clip?.title ?? 'Video' : list && !channel ? 'YouTube playlist' : null); // channels name themselves
  let main;
  if (id) {
    main = <>
      <YouTubePlayer src={`https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1${list ? `&list=${list}` : ''}`} title={clip?.title ?? 'Video player'} vertical={isShort || clip?.format === 'short'} />
      {clip ? <div className="vid-info">
        <h1>{clip.title}</h1>
        <p className="vid-meta">{clip.channel} · {clip.format === 'short' ? 'Short' : 'Video'}</p>
        <p className="vid-credit"><b>Zack’s role:</b> {clip.role} and thumbnail, cut in {clip.tools.join(', ')}. <WebLink href={homeUrl('work/video')}>More about this work »</WebLink></p>
      </div> : <p className="vid-meta">Playing from YouTube.</p>}
    </>;
  } else if (channel) {
    main = <YouTubeChannel channel={channel} />;
  } else if (list) {
    main = <><YouTubePlayer src={`https://www.youtube-nocookie.com/embed/videoseries?list=${list}&rel=0`} title="YouTube playlist" /><p className="vid-meta">Playlist from YouTube.</p></>;
  } else {
    main = <p className="vid-empty"><Play size={20} /> Pick a video to watch.</p>;
  }
  return <div className="vid">
    <div className="vid-main">{main}</div>
    <aside className="vid-side">
      <h2>{clip ? 'More edits by Zack' : 'Edits by Zack'}</h2>
      <ul>{more.map(item => <li key={item.id}><WebLink href={item.url} className="vid-card">
        <img src={item.thumbnail} alt="" loading="lazy" onError={event => event.currentTarget.classList.add('is-missing')} />
        <span>{item.title}<small>{item.channel}</small></span>
      </WebLink></li>)}</ul>
    </aside>
  </div>;
}

// A channel page: its latest uploads in the embeddable player. A /@handle address is looked up
// by the web proxy (YouTube's uploads playlist is the channel ID with UC swapped for UU).
function YouTubeChannel({ channel }) {
  const { loading, data, error } = useResource(async () => {
    if (channel.id) return { id: channel.id, title: null };
    if (!PROXY_URL) throw new Error('offline');
    const response = await fetch(`${PROXY_URL}/__cola/youtube-channel?path=${encodeURIComponent(channel.path)}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }, [channel.id, channel.path]);
  const name = data?.title || channel.path?.replace(/^\/(c\/|user\/)?/, '') || 'Channel';
  usePageTitle(data ? `${name} - YouTube` : null);
  const edits = media.filter(item => channel.path && item.channel.toLowerCase() === channel.path.replace(/^\/@/, '').toLowerCase());
  if (loading) return <Loading what="channel" />;
  if (error) return <p className="vid-empty"><Play size={20} /> Couldn’t load this channel right now.</p>;
  return <>
    <YouTubePlayer src={`https://www.youtube-nocookie.com/embed/videoseries?list=UU${data.id.slice(2)}&rel=0`} title={`${name} uploads`} />
    <div className="vid-info">
      <h1>{name}</h1>
      <p className="vid-meta">Latest uploads · use the playlist button in the player to browse them</p>
      {edits.length > 0 && <p className="vid-credit"><b>Zack edits for this channel:</b> full editor and thumbnails on {edits.length} videos, cut in Premiere Pro. <WebLink href={homeUrl('work/video')}>See the work »</WebLink></p>}
    </div>
  </>;
}

// ============================== Pages that can't be shown ==============================
const PROFILE_ONLY = ['instagram.com', 'tiktok.com'];
export function BlockedSite({ host, handle }) {
  const account = handle && work.find(item => item.links.some(link => link.url.toLowerCase().endsWith(`/${handle.toLowerCase()}`)));
  return <div className="xp-error">
    <h1><ShieldAlert size={30} strokeWidth={1.4} />{host} can’t be shown in this browser</h1>
    <p>{PROFILE_ONLY.includes(host)
      ? <>{host} only shows profiles to people who are signed in, so Cola OS can’t display this one. Posts and videos from {host} do open here.</>
      : <>{host} only opens in a full browser window, and blocks being shown inside other pages, so Cola OS can’t display it.</>}</p>
    {account && <>
      <hr />
      <p><b>About @{handle}:</b> Zack is the {account.role} for {account.org} ({account.period}). {account.summary}</p>
      <p><WebLink href={homeUrl(`work/${account.id}`)}>Read the {account.org} case study »</WebLink></p>
    </>}
    <hr />
    <p>You can also:</p>
    <ul>
      <li><WebLink href={searchUrl(handle ? `${handle} ${host}` : host)}>Search Fizz for {handle ? `@${handle}` : host}</WebLink></li>
      <li>Go back to <WebLink href={homeUrl()}>Zack’s homepage</WebLink></li>
    </ul>
  </div>;
}

// Any other site. With the Cola OS web proxy (proxy/), the real page renders here: the proxy
// fetches it, lifts the "don't show me in a frame" rules and keeps its links inside the proxy,
// and the page reports every navigation back so the address bar, tab title and Back/Forward
// follow along. Without the proxy it's a plain frame, which many sites refuse.
export function FrameSite({ url, src, host }) {
  const tab = useTab();
  const frame = useRef(null);
  const shown = useRef(url); // the address the frame is on now
  const [firstSrc] = useState(() => proxied(url)); // src is set once; changing it would reload the page
  const busy = useRef(false);
  // True while a page the browser asked for is loading. If it lands somewhere else (a redirect,
  // e.g. http -> https), that replaces the history entry instead of adding one.
  const requested = useRef(true);
  const setBusy = value => { if (busy.current !== value) { busy.current = value; tab.setBusy(value); } };

  // Back/Forward (or typing a new address) while this tab shows a proxied page: point the frame at it.
  useEffect(() => {
    if (!PROXY_URL || url === shown.current) return;
    shown.current = url;
    requested.current = true;
    setBusy(true);
    frame.current?.contentWindow?.location.replace(proxied(url));
  }, [url]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!PROXY_URL) return undefined;
    setBusy(true);
    const onMessage = event => {
      if (event.origin !== PROXY_ORIGIN || event.source !== frame.current?.contentWindow) return;
      if (event.data?.type === 'cola:loading') { requested.current = false; setBusy(true); return; }
      if (event.data?.type !== 'cola:page') return;
      const { url: now, title } = event.data;
      if (typeof now !== 'string' || !/^https?:\/\//.test(now)) return;
      const replace = !!event.data.replace || requested.current;
      requested.current = false;
      shown.current = now;
      tab.frameNavigated(now, typeof title === 'string' ? title.slice(0, 200) : '', replace);
    };
    window.addEventListener('message', onMessage);
    return () => { window.removeEventListener('message', onMessage); setBusy(false); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!PROXY_URL) {
    return <div className="frame-site">
      <p className="frame-bar"><Info size={12} /> Showing {host} inside Cola OS. If the page stays blank, {host} doesn’t allow being shown inside other pages.</p>
      <iframe src={src} title={host} sandbox="allow-scripts allow-same-origin allow-forms" referrerPolicy="no-referrer" />
    </div>;
  }
  return <div className="frame-site">
    <iframe ref={frame} src={firstSrc} title={host} onLoad={() => setBusy(false)}
      sandbox="allow-scripts allow-same-origin allow-forms allow-downloads" allow="fullscreen; autoplay; encrypted-media; picture-in-picture; clipboard-write" />
  </div>;
}

export function ServerError({ href }) {
  return <div className="xp-error">
    <h1><Globe size={30} strokeWidth={1.4} />Cannot find server</h1>
    <p>The page you are looking for is currently unavailable. The Web site might be experiencing technical difficulties, or you may need to adjust your browser settings.</p>
    <hr />
    <ul>
      <li>Make sure the address is spelled correctly: <code>{href}</code></li>
      <li><WebLink href={searchUrl(href.replace(/^[a-z]+:\/\//i, ''))}>Search Fizz for it</WebLink>, or go back to <WebLink href={homeUrl()}>Zack’s homepage</WebLink>.</li>
    </ul>
    <p className="xp-error-code">Cannot find server or DNS Error<br />Internet Explorer</p>
  </div>;
}

