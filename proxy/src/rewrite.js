// URL helpers shared by the proxy worker (and unit-tested in scripts/proxyRewrite.test.mjs).
//
// A proxied page lives at   https://<proxy>/p/<full target URL>
// e.g.                      https://<proxy>/p/https://example.com/docs/intro?lang=en
// Keeping the target's own path after /p/ means the browser resolves the page's relative links
// (“../img/a.png”) to the right proxied address by itself. Root-relative links (“/img/a.png”) are
// rewritten in the HTML and CSS; any that slip through (e.g. built by scripts) are caught by the
// worker using the Referer.

export const PREFIX = '/p/';
const SKIP = /^\s*(#|javascript:|data:|blob:|about:|mailto:|tel:|sms:)/i;

// Target URL -> proxied path ('/p/https://…'). Non-web URLs are returned as-is.
export function toProxy(url) {
  return /^https?:\/\//i.test(url) ? PREFIX + url : url;
}

// '/p/https://example.com/a?b' -> 'https://example.com/a?b' (or null if it isn't a proxied path).
// Browsers and servers sometimes squash 'https://' to 'https:/' inside paths; that's repaired.
export function fromProxyPath(pathAndQuery) {
  if (!pathAndQuery.startsWith(PREFIX)) return null;
  let rest = pathAndQuery.slice(PREFIX.length);
  try { rest = rest.replace(/^(https?):\/+/i, '$1://'); } catch { return null; }
  if (!/^https?:\/\/[^/?#]+/i.test(rest)) return null;
  try { return new URL(rest).href; } catch { return null; }
}

// Rewrite one attribute value found on a page at `base`.
export function rewriteUrl(value, base) {
  if (value == null) return value;
  const text = String(value).trim();
  if (!text || SKIP.test(text)) return value;
  try {
    const absolute = new URL(text, base);
    if (!/^https?:$/.test(absolute.protocol)) return value;
    return toProxy(absolute.href);
  } catch {
    return value;
  }
}

export function rewriteSrcset(value, base) {
  return String(value).split(',').map(part => {
    const [url, ...descriptor] = part.trim().split(/\s+/);
    return url ? [rewriteUrl(url, base), ...descriptor].join(' ') : part;
  }).join(', ');
}

// url(...) and @import "..." inside CSS.
export function rewriteCss(css, base) {
  return String(css)
    .replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (match, quote, url) => `url(${quote}${rewriteUrl(url, base)}${quote})`)
    .replace(/@import\s+(['"])([^'"]+)\1/gi, (match, quote, url) => `@import ${quote}${rewriteUrl(url, base)}${quote}`);
}

// <meta http-equiv="refresh" content="5; url=/next">
export function rewriteRefresh(content, base) {
  return String(content).replace(/(url\s*=\s*)(['"]?)([^'";]+)\2/i, (match, lead, quote, url) => `${lead}${quote}${rewriteUrl(url, base)}${quote}`);
}

// Addresses the proxy must never fetch: this machine, private networks, cloud metadata, etc.
export function isPrivateHost(hostname) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal') || host.endsWith('.home.arpa')) return true;
  if (!host.includes('.') && !host.includes(':')) return true; // bare intranet names
  const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 198 && (b === 18 || b === 19)) || a >= 224;
  }
  if (host.includes(':')) return host === '::1' || host === '::' || /^f[cd]/.test(host) || /^fe[89ab]/.test(host) || host.startsWith('::ffff:');
  return false;
}

// Response headers that would stop the page rendering inside Cola OS (or leak between sites).
export const DROP_RESPONSE_HEADERS = [
  'x-frame-options', 'content-security-policy', 'content-security-policy-report-only', 'cross-origin-opener-policy',
  'cross-origin-embedder-policy', 'cross-origin-resource-policy', 'strict-transport-security', 'set-cookie', 'set-cookie2',
  'clear-site-data', 'report-to', 'nel', 'alt-svc', 'permissions-policy', 'content-length', 'content-encoding', 'transfer-encoding', 'referrer-policy',
];
