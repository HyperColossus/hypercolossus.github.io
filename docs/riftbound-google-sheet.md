# Connect the inventory sheet to the website

The website can now use the private [Riftbound inventory sheet](https://docs.google.com/spreadsheets/d/1pytSoSo9Tu1wfW8RnvIIaIZu5CQyVPYVQM3mk3TfF2g/edit) as its source for collection cards, normal/foil ownership and prices. Google access and deployment are still required to activate it.

## Google access setup

1. Open [Google Cloud Console](https://console.cloud.google.com/), select or create a project, and enable **Google Sheets API** under **APIs & Services → Library**.
2. Under **IAM & Admin → Service Accounts**, create `riftbound-inventory-reader`. It does not need a Google Cloud project role.
3. Open that account → **Keys → Add key → Create new key → JSON**. Save the downloaded credential outside this repository. Do not upload it to the website or paste it into chat.
4. Copy the service account's email. Open the inventory sheet → **Share**, add that email with **Viewer** access. Keep general access **Restricted**.

The server uses Google's [service-account authorization](https://developers.google.com/identity/protocols/oauth2/service-account) with the [read-only Sheets scope](https://developers.google.com/workspace/sheets/api/scopes). It cannot edit the sheet. Visitors see the collection data exposed by the site's existing public API; they do not receive Google credentials or direct sheet access.

## Activate on Cloudflare

Run this from the project folder, replacing the path with the downloaded credential file:

```powershell
Get-Content -Raw -LiteralPath 'C:\path\riftbound-reader.json' | npx wrangler secret put GOOGLE_SERVICE_ACCOUNT_JSON --config wrangler.site.jsonc
```

In `wrangler.site.jsonc`, set the top-level `vars.RIFTBOUND_SHEET_ENABLED` to `"true"`. The inventory sheet ID is already configured. Build and deploy the combined site Worker with `npm run deploy:site`. Confirm the deployed Worker serves your website domain; this configuration does not change domain routing.

Open `/api/riftbound/health`: it should return `{"status":"ready"}`. Open `/api/riftbound/summary`: `source` should be `google-sheet`. Open Riftbound on the site, edit an owned quantity in the sheet, and confirm the collection changes within roughly two minutes. Restore the test quantity afterward.

## Local preview

Copy `.dev.vars.example` to `.dev.vars`, replace its credential placeholder with your downloaded JSON, compacted onto one line. The real `.dev.vars` is ignored. Run `npm run build`, then `npx wrangler dev --config wrangler.site.jsonc --env sheet_preview --local` and `npm run dev` in separate terminals. This preview needs no Docker or database; collection views connect directly to the sheet.

## Current inventory verification (October 11, 2026)

The 13 live set tabs were exported through the connected Sheets account and passed through the production sheet parser and Worker API. The snapshot contained 1,645 catalog printings and 2,142 owned copies (1,766 normal, 376 foil), including 355 owned printings. Binder pagination and ownership totals agreed with the summary. Current priced value was $774.38, with 18 unpriced copies kept separate. Checks covered the newly added showcase Ahri, explicitly marked foils, three tokens, four oversized battlefields, and the manually tracked Vendetta token.

All 81 existing tests, the production build, and the sheet-preview Worker dry run passed. Service-account authorization subsequently passed against Google with the user's Viewer share. A second actual Google Sheets read after advancing the injected cache clock past its one-minute lifetime also passed. Credentials are configured in the ignored `.dev.vars` file and remain outside the browser bundle.

The real Worker preview at `http://127.0.0.1:8787/riftbound` was verified in the browser: Collection showed 355 owned printings in collector order; the overview showed 2,142 copies, 1,766 normal, 376 foil, $774.38 and 18 unpriced copies; Binder showed 418 owned variants and its Foil filter showed 165 variants, including the newly added Energy Conduit and showcase Ahri. Production sheet mode remains disabled, so deployed-site activation and an actual edit appearing through normal polling remain outstanding.

For another authenticated read check, run `node scripts/riftbound-sheet-live-check.mjs <credential-file-path>`. It checks production API routes, ownership totals and a cache refresh using two real Google reads, without changing the sheet. `--configure-local` also writes the ignored local environment file after authorization succeeds. It never prints Google keys or OAuth tokens.

The targeted sheet/Worker lint check passed. Repository-wide lint still reports issues in existing portfolio code, including a conditional hook in `_deploy/portfolio.jsx`; those are outside the inventory connection.

To repeat the inventory API check after exporting fresh bounded cell data, run `node scripts/riftbound-sheet-smoke.mjs outputs/riftbound-sheet-test-live.json`. This command does not edit the sheet. The optional `--serve` flag starts a local snapshot preview on port 8091; it does not sync future sheet edits and cannot provide gameplay database tools.

## Behavior

- The server reads the 13 designated set tabs in one bounded request, caches valid results for one minute and shares simultaneous reads. Open collection views poll every minute; edits typically appear within two minutes. Refreshing sooner may still return the one-minute cache.
- Headers determine column positions. Card IDs must stay unique. Whole owned counts from 0 to 999999 are accepted; blank counts mean zero. Missing prices stay unavailable, not zero. Priced rows require a spreadsheet date in **Price date**. Fix invalid values in the sheet if the site reports unavailable.
- Rows are ordered by set and collector number, including overnumbered cards. Price dates come from the sheet, not the time the site reads it. The site shows when it last checked the sheet.
- This connection syncs edits from the sheet; it does not fetch new market prices into the sheet or write back from the website.
- Current-price details show the sheet's current observation. Past valuation is hidden in sheet mode because the sheet does not contain historical snapshots. Existing database history remains untouched.
- Calculator/simulator gameplay and sealed-product metadata still require the existing database. In sheet mode, their card prices are overlaid from the inventory sheet. The sheet does not include enough gameplay data to replace that database.
- Requests fail with a sanitized unavailable message if Google access fails or the sheet is invalid. An old cache is not silently passed off as a live connection.
- Each tab is limited to rows 2–1000 and columns A–M. A card in row 1000 fails validation rather than silently truncating the collection. Update the server's tab list and range if the inventory grows.

To revert to the database, set `RIFTBOUND_SHEET_ENABLED` to `"false"` and redeploy. No database ownership or price records are changed by this connection.
