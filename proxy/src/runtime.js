// Runs inside every proxied page (served at /__cola/runtime.js and injected first in <head>).
// It keeps URLs that scripts build at runtime going through the proxy, keeps navigation inside
// the Cola OS browser, and tells the browser window which page is showing (for the address bar,
// tab title and history). The worker serves it as `(${colaRuntime})(proxyOrigin)`, so it must be
// self-contained: no imports, no outer variables.
export function colaRuntime(PROXY) {
  if (window.__colaRuntime) return;
  window.__colaRuntime = true;
  const PREFIX = '/p/';
  const SKIP = /^\s*(#|javascript:|data:|blob:|about:|mailto:|tel:)/i;

  // The real address of this page, e.g. https://example.com/docs/.
  const target = () => {
    const path = location.pathname + location.search;
    return path.startsWith(PREFIX) ? path.slice(PREFIX.length).replace(/^(https?):\/+/i, '$1://') + location.hash : null;
  };
  const baseTarget = () => {
    const base = document.querySelector('base[href]');
    if (base) { const real = unproxy(base.href); if (real) return real; }
    return target() ?? location.href;
  };
  function unproxy(url) {
    try {
      const parsed = new URL(url, location.href);
      if (parsed.origin !== PROXY || !parsed.pathname.startsWith(PREFIX)) return null;
      return (parsed.pathname + parsed.search).slice(PREFIX.length).replace(/^(https?):\/+/i, '$1://') + parsed.hash;
    } catch { return null; }
  }
  // Any URL a script uses -> its proxied form.
  function wrap(url) {
    if (url == null) return url;
    const text = String(url);
    if (!text || SKIP.test(text)) return url;
    let absolute;
    try { absolute = new URL(text, baseTarget()); } catch { return url; }
    if (absolute.origin === PROXY) {
      // Built against our own origin (e.g. '/api/x' resolved by the browser): map back to the site.
      if (absolute.pathname.startsWith(PREFIX) || absolute.pathname.startsWith('/__cola/')) return absolute.href;
      try { absolute = new URL(absolute.pathname + absolute.search + absolute.hash, target() ?? undefined); } catch { return url; }
    }
    if (!/^https?:$/.test(absolute.protocol)) return url;
    // A script built this from our own address (location.pathname is '/p/https://site/…'), so it
    // came out as 'https://site/p/https://site/…'. That is already a proxied path: keep it as one.
    if (/^\/p\/https?:\/\/?[^/]/i.test(absolute.pathname)) return PROXY + absolute.pathname.replace(/^(\/p\/https?:)\/?(?!\/)/i, '$1//') + absolute.search + absolute.hash;
    return PROXY + PREFIX + absolute.href;
  }
  const wrapSrcset = value => String(value).split(',').map(part => {
    const [url, ...rest] = part.trim().split(/\s+/);
    return url ? [wrap(url), ...rest].join(' ') : part;
  }).join(', ');
  window.__colaWrap = wrap;

  // ---- Network APIs ----
  const nativeFetch = window.fetch;
  window.fetch = function (input, init) {
    try {
      if (input instanceof Request) input = new Request(wrap(input.url), input);
      else input = wrap(input instanceof URL ? input.href : input);
    } catch { /* leave the request as it was */ }
    return nativeFetch.call(this, input, init);
  };
  const nativeOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) { return nativeOpen.call(this, method, wrap(url), ...rest); };
  if (navigator.sendBeacon) {
    const nativeBeacon = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = (url, data) => nativeBeacon(wrap(url), data);
  }
  if (window.EventSource) {
    const NativeEventSource = window.EventSource;
    window.EventSource = function (url, options) { return new NativeEventSource(wrap(url), options); };
    window.EventSource.prototype = NativeEventSource.prototype;
  }
  // Pages may not install service workers: they'd live on the proxy's origin, shared by every site.
  if (navigator.serviceWorker) {
    try { navigator.serviceWorker.register = () => Promise.reject(new DOMException('Service workers are disabled in Cola OS.', 'SecurityError')); } catch { /* read-only in some browsers */ }
  }

  // ---- DOM attributes and properties that load URLs ----
  const URL_ATTRS = new Set(['src', 'href', 'action', 'formaction', 'poster', 'data', 'background']);
  const nativeSetAttribute = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function (name, value) {
    const key = String(name).toLowerCase();
    if (URL_ATTRS.has(key) && !(this instanceof SVGElement && key === 'href' && String(value).startsWith('#'))) value = wrap(value);
    else if (key === 'srcset' || key === 'imagesrcset') value = wrapSrcset(value);
    else if (key === 'integrity') return undefined;
    else if (key === 'target' && /^_(blank|top|parent)$/i.test(value)) value = '_self';
    return nativeSetAttribute.call(this, name, value);
  };
  const patch = (Type, prop, map = wrap) => {
    const descriptor = Type && Object.getOwnPropertyDescriptor(Type.prototype, prop);
    if (!descriptor?.set) return;
    Object.defineProperty(Type.prototype, prop, { ...descriptor, set(value) { descriptor.set.call(this, map(value)); } });
  };
  patch(window.HTMLImageElement, 'src'); patch(window.HTMLImageElement, 'srcset', wrapSrcset);
  patch(window.HTMLSourceElement, 'src'); patch(window.HTMLSourceElement, 'srcset', wrapSrcset);
  patch(window.HTMLScriptElement, 'src'); patch(window.HTMLLinkElement, 'href');
  patch(window.HTMLMediaElement, 'src'); patch(window.HTMLVideoElement, 'poster');
  patch(window.HTMLIFrameElement, 'src'); patch(window.HTMLFormElement, 'action');
  patch(window.HTMLAnchorElement, 'href'); patch(window.HTMLTrackElement, 'src'); patch(window.HTMLEmbedElement, 'src');
  patch(window.HTMLObjectElement, 'data');

  // ---- Navigation stays inside this frame ----
  window.open = url => { if (url) location.href = wrap(url); return window; };
  document.addEventListener('click', event => {
    const link = event.target instanceof Element && event.target.closest('a[target]');
    if (link && /^_(blank|top|parent)$/i.test(link.target)) link.target = '_self';
  }, true);
  for (const method of ['pushState', 'replaceState']) {
    const native = history[method];
    history[method] = function (state, title, url) {
      const result = native.call(this, state, title, url == null ? url : wrap(url));
      report(method === 'replaceState');
      return result;
    };
  }

  // ---- Tell the Cola OS browser what's showing ----
  // `replace`: the address changed without a new page (replaceState, Back inside the page, a
  // title update), so the browser should update its current history entry, not add one.
  let last = '';
  function report(replace = false) {
    const url = target();
    if (!url || window.parent === window) return;
    const message = { type: 'cola:page', url, title: document.title || '', replace };
    const key = message.url + '\n' + message.title;
    if (key === last) return;
    last = key;
    window.parent.postMessage(message, '*');
  }
  // Leaving the page: lets the browser spin its throbber until the next page reports in.
  addEventListener('pagehide', () => { if (window.parent !== window) window.parent.postMessage({ type: 'cola:loading' }, '*'); });
  addEventListener('popstate', () => report(true));
  addEventListener('hashchange', () => report());
  addEventListener('DOMContentLoaded', () => {
    report();
    const title = document.querySelector('title');
    new MutationObserver(() => report(true)).observe(title ?? document.head ?? document.documentElement, { subtree: true, childList: true, characterData: true });
  });
  addEventListener('load', () => report(true));
  report();
}
