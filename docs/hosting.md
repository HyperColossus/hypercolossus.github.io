# Hosting plan: hypercoloss.us on Cloudflare

Zack owns **hypercoloss.us**. The site is static (a Vite build), so it needs no server of its own.
The existing hosting setup targets Cloudflare's free tier. The planned Riftbound backend adds managed PostgreSQL and Hyperdrive; verify their costs and limits before release.

## Planned Riftbound integration

The [Riftbound implementation plan](riftbound-plan.md) keeps React/Vite and stages a move of the site from Pages to a Worker serving `dist/`, same-origin API endpoints, and daily scheduled sync. The existing `proxy/` Worker remains separate. The local site Worker foundation is implemented in `server/` and `wrangler.site.jsonc`; no hosted database, scheduled sync, or domain cutover is active. The table and deployment steps below still describe the current deployment. See [backend setup](riftbound-backend.md) for local commands and validation.

| Piece | Where | Address |
|---|---|---|
| Site | Cloudflare Pages | https://hypercoloss.us (and www) |
| Web proxy | Cloudflare Worker (`proxy/`) | https://proxy.hypercoloss.us |

## Steps (about 15 minutes, any time)

1. **Move DNS to Cloudflare.**
   - In the Cloudflare dashboard, go to **Add a domain** → `hypercoloss.us` → Free plan.
   - At your domain registrar, replace the nameservers with the two that Cloudflare shows.
   - Wait for Cloudflare to say the domain is active. It usually takes minutes, but can take up to a day.
   - Delete any old GitHub Pages A/CNAME records Cloudflare imported.
2. **Upload the site to Pages.** The project isn't on GitHub yet, so upload it directly: `npm run deploy:site` builds it (with `VITE_PROXY_URL` from `.env.production`) and uploads `dist/` to a Pages project called `hypercolossus`. Run it again to publish each update.
3. **Attach the domain.** Under Pages site → Custom domains, add `hypercoloss.us` and `www.hypercoloss.us`.
4. **Put the proxy on the domain.** `proxy/wrangler.toml` already routes it to `proxy.hypercoloss.us`. Run `npm run proxy:deploy` once the domain is active on Cloudflare.
5. **Retire GitHub Pages.** Remove the `CNAME` file and turn Pages off in the old repo's settings, so the two hosts don't fight over the domain.

`ALLOWED_ORIGINS` in `proxy/wrangler.toml` already lists `https://hypercoloss.us` and `https://www.hypercoloss.us`.

## Until then

Deploy the proxy to `workers.dev` (see `proxy/README.md`) and set `VITE_PROXY_URL` to that address. Moving it later only changes that one value.
