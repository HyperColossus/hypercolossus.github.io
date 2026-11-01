// Cola OS web proxy: a Cloudflare Worker that lets the browser inside HyperColossus show real web
// pages. It fetches the page for the visitor, removes the headers that forbid showing it inside
// another page, rewrites the page's links so everything keeps going through the proxy, and injects
// a small runtime (runtime.js) for URLs that scripts build on the fly.
//
// Safeguards (so this can't be used as a general-purpose unblocker or to reach private networks):
//   - pages only render inside the origins listed in ALLOWED_ORIGINS (CSP frame-ancestors), and
//     opening a proxied page directly in a browser tab is refused;
//   - private / local network addresses are never fetched;
//   - no cookies are passed in either direction, so nobody can log in to anything through it.
import { toProxy, fromProxyPath, rewriteUrl, rewriteSrcset, rewriteCss, rewriteRefresh, isPrivateHost, DROP_RESPONSE_HEADERS } from './rewrite.js';
import { colaRuntime } from './runtime.js';

const RUNTIME_PATH = '/__cola/runtime.js';
const FORWARD_REQUEST_HEADERS = ['accept', 'accept-language', 'content-type', 'range', 'if-none-match', 'if-modified-since', 'cache-control', 'user-agent', 'x-requested-with'];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = url.origin;
    const allowed = (env.ALLOWED_ORIGINS || '').split(/[\s,]+/).filter(Boolean);

    if (request.method === 'OPTIONS') return preflight(request);
    if (url.pathname === '/' || url.pathname === '/favicon.ico') return text('Cola OS web proxy. It only works inside the HyperColossus desktop.', 200);
    if (url.pathname === RUNTIME_PATH) {
      // The bundler wraps functions in __name(...) helpers; give the page a no-op one.
      return new Response(`(function () { var __name = function (fn) { return fn; }; (${colaRuntime.toString()})(${JSON.stringify(origin)}); })();`, { headers: { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'public, max-age=600' } });
    }
    if (url.pathname === '/__cola/search') return search(url, env, request);
    if (url.pathname === '/__cola/youtube-channel') return youtubeChannel(url, request);

    let target = fromProxyPath(url.pathname + url.search);
    if (!target) {
      // A root-relative URL that a script built on our origin ('/api/x'): send it to the site the
      // request came from, which the Referer tells us.
      const from = refererTarget(request, origin);
      if (from) return redirect(origin + toProxy(new URL(url.pathname + url.search, from).href), 307);
      return text('Not found.', 404);
    }
    target = new URL(target);

    if (request.headers.get('sec-fetch-dest') === 'document' && !env.ALLOW_TOP_LEVEL) {
      return html(`<p style="font:14px sans-serif;padding:24px">This page only opens inside the browser on the HyperColossus desktop.</p>`, 403);
    }
    if (!/^https?:$/.test(target.protocol) || (isPrivateHost(target.hostname) && !env.ALLOW_PRIVATE_HOSTS)) {
      return errorPage(target.href, 'This address can’t be opened.', 403, allowed);
    }

    // ---- Ask the real site ----
    const headers = new Headers();
    for (const name of FORWARD_REQUEST_HEADERS) { const value = request.headers.get(name); if (value) headers.set(name, value); }
    const from = refererTarget(request, origin);
    if (from) headers.set('referer', from);
    if (request.headers.has('origin')) headers.set('origin', from ? new URL(from).origin : target.origin);
    let upstream;
    try {
      upstream = await fetch(target.href, {
        method: request.method,
        headers,
        body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
        redirect: 'manual',
      });
    } catch {
      return errorPage(target.href, 'The site didn’t answer. It may be down, or the address may be wrong.', 502, allowed);
    }

    // Redirects stay inside the proxy.
    const location = upstream.headers.get('location');
    if (upstream.status >= 300 && upstream.status < 400 && location) {
      return redirect(origin + toProxy(new URL(location, target).href), upstream.status === 301 || upstream.status === 308 ? upstream.status : 302);
    }

    const out = new Headers(upstream.headers);
    for (const name of DROP_RESPONSE_HEADERS) out.delete(name);
    out.set('referrer-policy', 'unsafe-url'); // keeps the Referer we rely on for script-built URLs
    out.set('x-cola-target', target.href);
    cors(out, request);
    const type = (out.get('content-type') || '').toLowerCase();
    const init = { status: upstream.status, statusText: upstream.statusText, headers: out };
    if (!upstream.body || request.method === 'HEAD' || [204, 304].includes(upstream.status)) return new Response(null, init);

    if (type.includes('text/html') || type.includes('application/xhtml')) {
      out.set('content-security-policy', `frame-ancestors 'self' ${allowed.join(' ')}`);
      out.set('cache-control', 'no-store');
      return rewriteHtml(new Response(upstream.body, init), target);
    }
    // Stylesheets: rewrite url(...) so assets come through the proxy. Very large ones pass through
    // untouched to stay inside the Worker's CPU budget; their root-relative URLs are still caught
    // by the Referer fallback above.
    const size = Number(upstream.headers.get('content-length') || 0);
    if (type.includes('text/css') && size < 300_000) {
      return new Response(rewriteCss(await upstream.text(), target.href), init);
    }
    return new Response(upstream.body, init);
  },
};

// ---------- HTML ----------
function rewriteHtml(response, target) {
  let base = target.href;
  let injected = false;
  const runtimeTag = `<script src="${RUNTIME_PATH}"></script>`;
  const attr = (name, map = rewriteUrl) => ({
    element(element) {
      const value = element.getAttribute(name);
      if (value != null) element.setAttribute(name, map(value, base));
    },
  });
  let styleText = '';
  return new HTMLRewriter()
    .on('head', { element(element) { if (!injected) { element.prepend(runtimeTag, { html: true }); injected = true; } } })
    .on('body', { element(element) { if (!injected) { element.prepend(runtimeTag, { html: true }); injected = true; } } })
    .on('base[href]', {
      element(element) {
        try { base = new URL(element.getAttribute('href'), target).href; } catch { /* keep the page URL */ }
        element.setAttribute('href', toProxy(base));
      },
    })
    .on('a[href], area[href], link[href]', attr('href'))
    .on('a[target], area[target], form[target]', {
      element(element) { if (/^_(blank|top|parent)$/i.test(element.getAttribute('target'))) element.setAttribute('target', '_self'); },
    })
    .on('img[src], script[src], iframe[src], frame[src], embed[src], source[src], track[src], audio[src], video[src], input[src]', attr('src'))
    .on('img[srcset], source[srcset]', attr('srcset', rewriteSrcset))
    .on('link[imagesrcset]', attr('imagesrcset', rewriteSrcset))
    .on('video[poster]', attr('poster'))
    .on('object[data]', attr('data'))
    .on('form[action]', attr('action'))
    .on('button[formaction], input[formaction]', attr('formaction'))
    .on('[background]', attr('background'))
    .on('[style]', attr('style', rewriteCss))
    .on('[integrity]', { element(element) { element.removeAttribute('integrity'); } })
    .on('meta[http-equiv]', {
      element(element) {
        const kind = (element.getAttribute('http-equiv') || '').toLowerCase();
        if (kind === 'content-security-policy' || kind === 'x-frame-options') element.remove();
        if (kind === 'refresh') element.setAttribute('content', rewriteRefresh(element.getAttribute('content') || '', base));
      },
    })
    .on('meta[name="referrer"]', { element(element) { element.remove(); } })
    .on('style', {
      text(chunk) {
        styleText += chunk.text;
        if (chunk.lastInTextNode) { chunk.replace(rewriteCss(styleText, base), { html: true }); styleText = ''; }
        else chunk.remove();
      },
    })
    .transform(response);
}

// ---------- Web search for Fizz (optional) ----------
// Uses Tavily (free: 1,000 searches a month, no card; secret TAVILY_API_KEY) or Brave Search
// (secret BRAVE_API_KEY). Answers are cached for a day so repeat searches don't spend credits.
async function search(url, env, request) {
  const headers = cors(new Headers({ 'content-type': 'application/json' }), request);
  const query = (url.searchParams.get('q') || '').trim().replace(/\s+/g, ' ').slice(0, 200);
  const provider = env.TAVILY_API_KEY ? 'tavily' : env.BRAVE_API_KEY ? 'brave' : null;
  if (!provider) return new Response(JSON.stringify({ error: 'search-not-configured' }), { status: 501, headers });
  if (!query) return new Response(JSON.stringify({ results: [], provider }), { headers });

  const cacheKey = new Request(`https://cola-search.cache/${provider}?q=${encodeURIComponent(query.toLowerCase())}`);
  const cache = typeof caches !== 'undefined' ? caches.default : null;
  const hit = cache && await cache.match(cacheKey);
  if (hit) return new Response(hit.body, { headers });

  let results;
  try {
    results = provider === 'tavily' ? await searchTavily(query, env.TAVILY_API_KEY) : await searchBrave(query, env.BRAVE_API_KEY);
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error.message || error) }), { status: 502, headers });
  }
  const body = JSON.stringify({ results, provider });
  if (cache) await cache.put(cacheKey, new Response(body, { headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=86400' } }));
  return new Response(body, { headers });
}

async function searchTavily(query, key) {
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({ query, max_results: 8, search_depth: 'basic', topic: 'general', safe_search: true }),
  });
  if (!response.ok) throw new Error(`search-${response.status}`);
  const data = await response.json();
  return (data.results || []).map(item => ({ title: item.title, url: item.url, description: String(item.content || '').slice(0, 300) }));
}

async function searchBrave(query, key) {
  const api = `https://api.search.brave.com/res/v1/web/search?${new URLSearchParams({ q: query, count: '8', safesearch: 'strict' })}`;
  const response = await fetch(api, { headers: { Accept: 'application/json', 'X-Subscription-Token': key } });
  if (!response.ok) throw new Error(`search-${response.status}`);
  const data = await response.json();
  return (data.web?.results || []).map(item => ({ title: item.title, url: item.url, description: item.description }));
}

// ---------- YouTube channel lookup ----------
// Turns a channel address (/@handle, /c/name, /user/name) into its channel ID and name, so the
// browser can play the channel's uploads with YouTube's embeddable player. Reads only the page's
// <head> tags with HTMLRewriter (cheap on CPU) and caches the answer for a week.
async function youtubeChannel(url, request) {
  const headers = cors(new Headers({ 'content-type': 'application/json' }), request);
  const path = url.searchParams.get('path') || '';
  if (!/^\/(@[\w.-]{1,100}|c\/[\w.-]{1,100}|user\/[\w.-]{1,100})$/.test(path)) return new Response(JSON.stringify({ error: 'bad-path' }), { status: 400, headers });
  const cacheKey = new Request(`https://cola-yt.cache${path.toLowerCase()}`);
  const cache = typeof caches !== 'undefined' ? caches.default : null;
  const hit = cache && await cache.match(cacheKey);
  if (hit) return new Response(hit.body, { headers });

  const page = await fetch(`https://www.youtube.com${path}`, { headers: { 'accept-language': 'en-US,en;q=0.8', accept: 'text/html' } });
  if (!page.ok) return new Response(JSON.stringify({ error: `youtube-${page.status}` }), { status: 502, headers });
  const found = {};
  await new HTMLRewriter()
    .on('meta[itemprop="identifier"]', { element(element) { found.id ||= element.getAttribute('content'); } })
    .on('link[rel="canonical"]', { element(element) { found.canonical ||= element.getAttribute('href'); } })
    .on('meta[property="og:title"]', { element(element) { found.title ||= element.getAttribute('content'); } })
    .on('meta[property="og:image"]', { element(element) { found.image ||= element.getAttribute('content'); } })
    .transform(page).arrayBuffer();
  const id = [found.id, (found.canonical || '').split('/channel/')[1]].find(value => /^UC[\w-]{22}$/.test(value || ''));
  if (!id) return new Response(JSON.stringify({ error: 'not-found' }), { status: 404, headers });
  const body = JSON.stringify({ id, title: found.title || null, image: found.image || null });
  if (cache) await cache.put(cacheKey, new Response(body, { headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=604800' } }));
  return new Response(body, { headers });
}

// ---------- helpers ----------
function refererTarget(request, origin) {
  const referer = request.headers.get('referer');
  if (!referer || !referer.startsWith(origin)) return null;
  const parsed = new URL(referer);
  return fromProxyPath(parsed.pathname + parsed.search);
}
function cors(headers, request) {
  const origin = request.headers.get('origin');
  headers.set('access-control-allow-origin', origin || '*');
  if (origin) { headers.set('access-control-allow-credentials', 'true'); headers.append('vary', 'Origin'); }
  headers.set('access-control-expose-headers', 'x-cola-target');
  return headers;
}
function preflight(request) {
  const headers = cors(new Headers(), request);
  headers.set('access-control-allow-methods', 'GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS');
  headers.set('access-control-allow-headers', request.headers.get('access-control-request-headers') || '*');
  headers.set('access-control-max-age', '86400');
  return new Response(null, { status: 204, headers });
}
function redirect(location, status) {
  return new Response(null, { status, headers: { location, 'cache-control': 'no-store' } });
}
function text(body, status) {
  return new Response(body, { status, headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
function html(body, status, headers = {}) {
  return new Response(`<!doctype html><meta charset="utf-8">${body}`, { status, headers: { 'content-type': 'text/html; charset=utf-8', ...headers } });
}
function errorPage(address, message, status, allowed) {
  const safe = value => String(value).replace(/[&<>"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char]);
  return html(`<title>Cannot display the webpage</title>
<body style="margin:0;padding:26px 30px;font:12px/1.5 Tahoma,'Segoe UI',sans-serif;background:#fff;color:#000">
<h1 style="font:700 17px Tahoma,sans-serif">The page cannot be displayed</h1>
<p>${safe(message)}</p><hr style="border:0;border-top:1px solid #c0c0c0">
<p>Address: <code>${safe(address)}</code></p>
<p style="color:#666;font-size:11px">Cola OS web proxy · HTTP ${status}</p>`, status, { 'content-security-policy': `frame-ancestors 'self' ${allowed.join(' ')}` });
}
