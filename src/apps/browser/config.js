// Where the Cola OS web proxy lives (see proxy/README.md). Set it at build time, e.g. in `.env`:
//   VITE_PROXY_URL=https://cola-proxy.<your-account>.workers.dev
// Without it, the browser still works: other sites are tried in a plain frame, and Fizz Search
// shows Wikipedia for web results.
export const PROXY_URL = String(import.meta.env?.VITE_PROXY_URL ?? '').trim().replace(/\/+$/, '');
export const PROXY_ORIGIN = (() => { try { return PROXY_URL ? new URL(PROXY_URL).origin : ''; } catch { return ''; } })();
export const proxied = url => `${PROXY_URL}/p/${url}`;
