# Cola OS web proxy

This proxy lets the Internet Explorer window in HyperColossus show **real web pages**. It runs as a
Cloudflare Worker, which is free for this use (100,000 requests a day).

## How it works

A page is requested as `https://<proxy>/p/https://example.com/page`. For each request, the Worker:

1. Fetches the page for the visitor.
2. Removes the headers that stop sites being shown inside other pages (`X-Frame-Options`, CSP, and the cross-origin isolation headers).
3. Rewrites every link, image, script, stylesheet and form in the HTML and CSS so they also go through the proxy.
4. Injects `/__cola/runtime.js` into the page. The runtime:
   - keeps URLs that scripts build (`fetch`, XHR, `pushState`, new images, `window.open`…) inside the proxy;
   - tells the Cola OS browser the page's address and title, so the address bar, tab and Back/Forward follow along.

Any request that still slips out to the proxy's own root (for example `/api/x` built by a script)
is sent back to the right site using the Referer header.

## Safeguards

These stop the proxy being used as a general-purpose unblocker or to reach private networks:

- **Embedding is restricted.** Proxied pages only render inside the sites listed in `ALLOWED_ORIGINS` (in `wrangler.toml`). Opening a proxied page directly in a browser tab returns 403.
- **Private addresses are refused.** It never fetches localhost, private IP ranges, cloud metadata addresses or `.local`/`.internal` names.
- **No cookies, no logins.** Cookies are never passed in either direction. Nobody can log in to anything through it, and sites can't track visitors across it.
- **Service workers are disabled** for proxied pages.

## What works and what doesn't

**Works well:** most content sites. That includes news, blogs, docs, wikis, shops' product pages, portfolios, and many single-page apps.

**Hit or miss:** heavy web apps that check their own address with `location.hostname`, use WebSockets, or require logging in. Sites that only work logged in (X, Instagram, Facebook, LinkedIn, TikTok, Discord, Netflix) show an explanation page in Cola OS instead.

**Handled natively:** GitHub, Wikipedia and YouTube are drawn by the browser itself from their public APIs and players, so they're fast and reliable.

## Deploy (one time, about 5 minutes)

1. Create a free account at <https://dash.cloudflare.com/sign-up>.
2. In this folder, run:
   ```
   npm install
   npx wrangler login     # opens the browser to authorize
   npx wrangler deploy
   ```
   Wrangler prints the proxy's address, e.g. `https://cola-proxy.<your-subdomain>.workers.dev`.
3. Tell the site where the proxy is. In the project root, create `.env.production` containing:
   ```
   VITE_PROXY_URL=https://cola-proxy.<your-subdomain>.workers.dev
   ```
   Add the same line to `.env.local` to use the proxy in `npm run dev`. Then rebuild and redeploy the site.
4. If the site is served from another domain, add it to `ALLOWED_ORIGINS` in `wrangler.toml` and run `npx wrangler deploy` again.

### Optional: real web results in Fizz Search

Fizz Search can show live web results. Two providers are supported; the Worker uses whichever key it finds (Tavily first):

- **Tavily (recommended, free).** 1,000 searches a month, reset on the 1st, no credit card. Sign up at <https://app.tavily.com>, copy the `tvly-…` key, then run:
  ```
  npx wrangler secret put TAVILY_API_KEY
  ```
- **Brave Search.** Needs a card on file and shows a "Results by Brave Search" credit, which Fizz handles. Its monthly credit covers roughly 1,000 searches. Run `npx wrangler secret put BRAVE_API_KEY`.

Results are cached for a day, so repeated searches don't use up credits. Without a key, Fizz shows results from Zack's site, Wikipedia and GitHub.

## Local development

```
npm run dev          # http://127.0.0.1:8787, allows localhost test pages
```

Then set `VITE_PROXY_URL=http://127.0.0.1:8787` in the site's `.env.local`.

The unit tests for the URL rewriting are in `../scripts/proxyRewrite.test.mjs`, and `npm test` in the project root runs them.
