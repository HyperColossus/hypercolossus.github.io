import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

// What a page inside a tab can ask of the browser: go(url) in this tab, openTab(url) in a new
// background one, show a link in the status bar, report that it's busy loading, or name itself for the tab.
export const TabContext = createContext(null);
export const useTab = () => useContext(TabContext);

const wantsNewTab = event => event.ctrlKey || event.metaKey || event.shiftKey;

// A link that opens inside the browser. Ctrl/⌘-click or middle-click opens it in a new tab.
export function WebLink({ href, className, children, as = 'a', title }) {
  const tab = useTab();
  const mail = href.startsWith('mailto:');
  const hint = { onMouseEnter: () => tab.setHover(href), onMouseLeave: () => tab.setHover(null), onFocus: () => tab.setHover(href), onBlur: () => tab.setHover(null) };
  if (mail) return <a className={className} href={href} title={title} {...hint}>{children}</a>;
  const open = event => {
    event.preventDefault();
    tab.setHover(null);
    if (wantsNewTab(event)) tab.openTab(href); else tab.go(href);
  };
  const aux = event => { if (event.button === 1) { event.preventDefault(); tab.openTab(href); } };
  if (as === 'button') return <button className={className} title={title} onClick={open} onAuxClick={aux} {...hint}>{children}</button>;
  return <a className={className} href={href} title={title} onClick={open} onAuxClick={aux} {...hint}>{children}</a>;
}

// Scrolls the tab (only) so `element` is at the top. (scrollIntoView would also nudge the
// desktop and window containers, which are clipped rather than scrollable.) Offsets are used
// instead of screen rectangles, which the 3D screen transform distorts.
export function scrollToElement(element) {
  const scroller = element?.closest('.portfolio-scroll');
  if (!scroller) return;
  let top = 0;
  for (let node = element; node && node !== scroller; node = node.offsetParent) top += node.offsetTop;
  scroller.scrollTo({ top: Math.max(0, top - 8) });
}

// HTML from another site (already passed through cleanHtml). Its links open in the browser.
export function HtmlContent({ html, className }) {
  const tab = useTab();
  // Same object while the HTML is unchanged: React re-sets innerHTML whenever this object changes,
  // which would swap out the link under the pointer mid-click.
  const inner = useMemo(() => ({ __html: html }), [html]);
  const target = event => event.target.closest?.('[data-href], [data-anchor]');
  const onClick = event => {
    const link = target(event);
    if (!link) return;
    event.preventDefault();
    if (link.dataset.anchor) {
      const scope = event.currentTarget;
      const id = link.dataset.anchor;
      const spot = scope.querySelector(`[id="${CSS.escape(id)}"], [id="user-content-${CSS.escape(id)}"], [name="${CSS.escape(id)}"]`);
      scrollToElement(spot);
      return;
    }
    tab.setHover(null);
    if (wantsNewTab(event)) tab.openTab(link.dataset.href); else tab.go(link.dataset.href);
  };
  const onAuxClick = event => { const link = target(event); if (event.button === 1 && link?.dataset.href) { event.preventDefault(); tab.openTab(link.dataset.href); } };
  const onMouseOver = event => { const link = target(event); tab.setHover(link?.dataset.href ?? null); };
  return <div className={className} onClick={onClick} onAuxClick={onAuxClick} onMouseOver={onMouseOver} onMouseLeave={() => tab.setHover(null)} dangerouslySetInnerHTML={inner} />;
}

// Loads something for a page and tells the browser it's busy (spinning throbber) meanwhile.
export function useResource(load, deps) {
  const tab = useTab();
  const [state, setState] = useState({ loading: true, data: null, error: null });
  useEffect(() => {
    let live = true;
    let busy = true;
    const idle = () => { if (busy) { busy = false; tab.setBusy(false); } };
    setState({ loading: true, data: null, error: null });
    tab.setBusy(true);
    Promise.resolve().then(load).then(
      data => { if (live) setState({ loading: false, data, error: null }); },
      error => { if (live) setState({ loading: false, data: null, error }); },
    ).finally(idle);
    return () => { live = false; idle(); };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  return state;
}

// Names the tab (and the window) once a page knows its real title.
export function usePageTitle(title) {
  const tab = useTab();
  useEffect(() => { if (title) tab.setTitle(title); }, [title]); // eslint-disable-line react-hooks/exhaustive-deps
}

export function Loading({ what = 'page' }) {
  return <p className="net-loading"><span className="net-spinner" aria-hidden="true" />Loading {what}…</p>;
}
