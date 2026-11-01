import React, { useEffect, useRef, useState } from 'react';
import { Info, Search } from 'lucide-react';
import { work } from '../../content/work';
import { homeUrl, searchUrl } from './router';
import { WebLink, usePageTitle } from './ui';

// Social links, shown with each service's official embed so they work inside Cola OS.
// Embeds are sandboxed without pop-ups, so their own "open on …" buttons can't leave the site.
const SANDBOX = 'allow-scripts allow-same-origin allow-presentation allow-forms';
const ALLOW = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';

// Zack's own accounts (from src/content/work.js), found by handle.
const accountFor = handle => handle && work.find(item => item.links.some(link => /(x|twitter)\.com\//i.test(link.url) && link.url.toLowerCase().replace(/[?#].*$/, '').endsWith(`/${handle.toLowerCase()}`)));
const postId = url => String(url).match(/status(?:es)?\/(\d+)/)?.[1] ?? (/^\d+$/.test(url) ? url : null);

// ============================== X ==============================
export function XSite({ kind, user, id }) {
  if (kind === 'post') return <XPost user={user} id={id} />;
  if (kind === 'profile') return <XProfile user={user} />;
  return <XHome />;
}

function XFrame({ children }) {
  return <div className="xs"><div className="xs-col">{children}</div></div>;
}

// One post, rendered by X's own embed. It reports its height, and the frame follows.
function PostEmbed({ id }) {
  const frame = useRef(null);
  const [height, setHeight] = useState(420);
  useEffect(() => {
    const onMessage = event => {
      if (event.origin !== 'https://platform.twitter.com' || event.source !== frame.current?.contentWindow) return;
      let data = event.data;
      try { if (typeof data === 'string') data = JSON.parse(data); } catch { return; }
      const params = data?.['twttr.embed']?.params?.[0];
      if (data?.['twttr.embed']?.method === 'twttr.private.resize' && params?.height) setHeight(Math.ceil(params.height) + 4);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);
  return <iframe ref={frame} className="xs-post" style={{ height }} title="Post on X" sandbox={SANDBOX} allow={ALLOW}
    src={`https://platform.twitter.com/embed/Tweet.html?id=${id}&theme=light&dnt=true&lang=en`} />;
}

function AccountNote({ account, handle }) {
  if (!account) return null;
  return <div className="xs-note">
    <b>Zack runs @{handle}.</b> He’s the {account.role} for {account.org} ({account.period}). {account.summary}{' '}
    <WebLink href={homeUrl(`work/${account.id}`)}>Read the case study »</WebLink>
  </div>;
}

function XPost({ user, id }) {
  const account = accountFor(user);
  return <XFrame>
    <p className="xs-head">Post{user && <> by <WebLink href={`https://x.com/${user}`}>@{user}</WebLink></>}</p>
    <PostEmbed id={id} />
    <AccountNote account={account} handle={user} />
  </XFrame>;
}

function XProfile({ user }) {
  const account = accountFor(user);
  usePageTitle(account ? `${account.org} (@${user}) on X` : null);
  const featured = (account?.posts ?? []).map(postId).filter(Boolean);
  return <XFrame>
    <div className="xs-profile">
      <span className="xs-avatar" aria-hidden="true">{user[0].toUpperCase()}</span>
      <div>
        <h1>{account ? account.org : `@${user}`}</h1>
        <p className="xs-handle">@{user}</p>
      </div>
    </div>
    <AccountNote account={account} handle={user} />
    {featured.length > 0 && <>
      <h2 className="xs-sub">Featured posts</h2>
      {featured.map(id => <PostEmbed key={id} id={id} />)}
    </>}
    <p className="xs-info"><Info size={12} /> X only shows full profiles and timelines to people who are signed in, so Cola OS can’t load @{user}’s timeline. Links to individual posts open right here.</p>
    <p className="xs-links"><WebLink href={searchUrl(`@${user} X`)}><Search size={12} /> Search Fizz for @{user}</WebLink></p>
  </XFrame>;
}

function XHome() {
  const accounts = work.flatMap(item => item.links.filter(link => /(x|twitter)\.com\//i.test(link.url)).map(link => ({ item, link })));
  return <XFrame>
    <p className="xs-info"><Info size={12} /> X’s home feed only works for signed-in users. Posts and profiles open here, like these accounts Zack runs:</p>
    <ul className="xs-list">{accounts.map(({ item, link }) => <li key={link.url}><WebLink href={link.url}>{link.label}</WebLink> — {item.role}, {item.period}</li>)}</ul>
  </XFrame>;
}

// ============================== Instagram, TikTok, Twitch, Spotify ==============================
const PROVIDERS = { instagram: 'Instagram', tiktok: 'TikTok', twitch: 'Twitch', spotify: 'Spotify' };

export function EmbedSite({ provider, src, shape, channel, video, clip }) {
  // Twitch only plays inside sites it's told about: `parent` is this site's own hostname.
  const parent = window.location.hostname;
  const url = provider === 'twitch'
    ? clip ? `https://clips.twitch.tv/embed?clip=${encodeURIComponent(clip)}&parent=${parent}&autoplay=false`
      : video ? `https://player.twitch.tv/?video=v${video}&parent=${parent}&autoplay=false`
        : `https://player.twitch.tv/?channel=${encodeURIComponent(channel)}&parent=${parent}&autoplay=false`
    : src;
  usePageTitle(provider === 'twitch' && channel ? `${channel} - Twitch` : null);
  return <div className={`emb is-${provider}`}>
    <p className="emb-head">{PROVIDERS[provider]}{channel ? ` · ${channel}` : ''}</p>
    <div className={`emb-box is-${shape}`}>
      <iframe src={url} title={`${PROVIDERS[provider]} embed`} sandbox={SANDBOX} allow={ALLOW} allowFullScreen />
    </div>
  </div>;
}
