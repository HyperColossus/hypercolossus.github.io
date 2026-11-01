# HyperColossus — Roadmap

Last updated: Sep 27, 2026 (Riftbound plan and hosting direction)

## Riftbound Companion

The [codebase-specific implementation plan](riftbound-plan.md) adds Riftbound to Cola OS. Catalog and Binder read views include search, filters, pagination, ownership quantities, and price history, backed by the local Worker and Docker PostgreSQL. RiftHunt supplies the bulk catalog and TCG API provides operator-run daily card-price snapshots. Scheduled price sync, owner-only editing, ROI Calculator, Pack Simulator, and public deployment remain planned. The existing proxy Worker stays separate.

## The dream (north star)

A recruiter opens the site. They land in a black, empty space where an old IBM-style CRT floats in the middle. They click it, the camera dives into the screen, the machine boots, and they're on a desktop. Every app on that desktop covers one discipline, and each one has its **own visual identity**, because the range of styles is part of the pitch:

| App | Discipline it proves | Vibe |
|---|---|---|
| Web browser | Social media, esports, and the portfolio itself | Early-2000s browser showing a late-90s/early-2000s personal homepage |
| Steam-style launcher | Game development | Dark, dense game-store library |
| Media browser | Video editing and motion | Video-editor timeline (NLE) |

The desktop OS, **Cola OS**, is the **shared frame**: a full 90s retro desktop. Each app launched from it has its own era and look, like different software running on one old machine.

## Ground rules

1. **One site, two experiences.** Detect the device when the site loads. Laptops and desktops get the 3D desktop. Phones and tablets are sent to a `#mobile` route in the same app: a traditional, scrolling mobile layout that reads from the same content files.
2. **A recruiter gets to real work in about 10 seconds.** There's always a way to skip the intro, a résumé link that stays visible, and a link to each app.
3. **Honest content.** No fake projects, fake metrics, or dead "Play" buttons. Anything unfinished is labeled as unfinished.
4. **Each app's style lives only in that app.** App styles never leak into the desktop or into other apps.
5. **Content lives in data files, not components.** Adding a video or a game means editing a data file, not JSX.

## Current state (summary)

- Working: the 3D intro with the camera flying into the screen, the desktop inside the screen (800×600), the window manager (open, focus, minimize, maximize, drag), the browser, and the game library.
- Removed (Sep 23, 2026): the Rank Tracker (app, Python API, scraper), the Side projects folder, and the placeholder games Hollow Field and Splice. The game library now reads `src/content/games.js`, which lists the real projects: **Slots And Ladders** and the **Unnamed Zombies Project**, both marked "In development". Details are left empty until there's real info to add.
- Missing or off-vision: the media browser; per-app styling (right now everything uses one warm palette); the void (currently an orange floor); window resizing; deep links; the `#mobile` route.
- Live site `_deploy/` (hypercoloss.us) is a separate static React site. Its content and layout can be reused for the `#mobile` route.

---

## Phase 0 — Decisions & content inventory

- [x] Mobile strategy: one site. Detect the device, then route phones and tablets to `#mobile`.
- [x] OS identity (Sep 23): **Cola OS**. The shell is **full 90s retro** (grey bevels, navy title bars, pixel icons, a Start button and taskbar in place of the dock). The boot screen is **logo only**, about 1s and skippable. Details are in the style guide, Layer 2.
- [ ] Gather content. Tracked in `docs/content-inventory.md`.

## Phase 1 — The shell (foundation for every app)

**Scene / void**
- [x] Screen built into the monitor (Sep 23): occlusion-blended HTML screen fitted to the bezel opening, a glass sheen and vignette, and the model's baked OS screen removed by deleting just its triangles (`removeBakedScreen`; an earlier texture-cutting approach left holes in the case).
- [x] Screen blended in and 3D power button (Sep 23): square HTML screen plus a WebGL glass with rounded corners, inner shadow, vignette and scanlines; a dark tube interior; the bob runs before Html; and a power button with an LED on the base unit's front (moved from the monitor on Sep 23) is the only mouse way to power on. The screen stays fully blank until it's pressed.
- [x] Power button breathing glow (Sep 23): after 5s on the site, a smooth eased pulse on the LED, the button face and a halo (`src/components/powerGlow.js`, `scripts/powerGlow.test.mjs`).
- [x] Void restaged (Sep 23): the orange floor is removed, and a navy night-sky **sphere** with small purple and pink nebula clouds fixed in the world (`VoidBackground.jsx`), with a slow, eased orbit (`rotateSpeed` 0.35, damping) so the camera circles a still computer plus sparkles and lilac lighting replace it; there's no ground shadow. The intro text and button overlay are removed, so the home screen is just the computer. The unused `BackgroundFog.jsx` is deleted.
- [x] Screen built into the monitor (Sep 23): occlusion-blended HTML screen, fitted to the bezel opening, with a glass sheen and vignette; the model's baked OS screen image is removed.
- [x] Vista-era Start menu (Sep 23): search, All Programs, links, a hover picture, and a power button back to the void, plus Restart and Shut Down.
- [ ] Keep `retro_computer_fixed.glb`. Delete the unused `retro_computer.glb`, `extracted.gltf` and `extracted0.png`, and compress the GLB (meshopt or Draco).
- [ ] Idle motion: a slow float plus a gentle turn toward the cursor. Keep the orbit controls but limit them.
- [x] Rebuild the shell in the Cola OS 90s style (Sep 23): teal desktop, original pixel icons (double-click or Enter to open), a beveled taskbar with a Start button and start menu, a default 90s window frame, and READ_ME_FIRST.txt in Notepad (opens automatically after boot). Résumé and Contact shortcuts open the browser on those pages. Shut Down closes everything and glides the camera back to the void.
- [x] Boot screen (Sep 23): before power-on the CRT shows a standby screen; after that comes the Cola OS logo with a loading bar (1.1s, skippable with a click or key; skipped for reduced motion).
- [ ] Add an optional CRT look on the desktop: scanlines, slight edge vignette, phosphor glow. Keep it subtle so text stays readable.
- [ ] Delete the unused `BackgroundFog.jsx`, or reuse it for the void gradient.

**Device detection & `#mobile` route**
- [ ] In `App.jsx`, before anything heavy loads, detect a phone or tablet: `(pointer: coarse)` together with no hover, or a viewport narrower than ~1024px, with a user-agent check as a backup. If it matches, set `location.hash = '#mobile'`.
- [ ] Route on the hash: `#mobile` renders `<MobileSite />`. Anything else renders the 3D desktop experience.
- [ ] Load both experiences with `React.lazy` so phones never download three.js or the GLB, and desktops never download the mobile bundle.
- [ ] A desktop visitor can open `#mobile` on purpose (it's also a plain fallback). The mobile page has a "View desktop experience" link for large screens.
- [ ] `MobileSite` is a traditional scrolling layout: hero, social/esports work, video (timeline content shown as a list), games, résumé, contact. It pulls everything from `src/content/`.

**Screen & windows**
- [x] Virtual screen (Sep 23): **1920×1440** (4:3, matching the CRT) at **175% UI scaling** (raised from 150% on Sep 23 for readability), so the desktop lays out in ~1097×823 (~1097×793 above the taskbar). The monitor keeps the same physical size in the scene. Settings are `SCREEN_PX`/`UI_SCALE` in IntroScene.jsx.
- [x] Window resizing (Sep 23): drag either bottom corner (bottom-left moves the left edge). Each app has a minimum size (`minSize` in desktopConfig), and windows can't be dragged past the screen edge.
- [ ] **Per-app window chrome:** `Window` takes a `chrome` variant from `desktopConfig` (e.g. `xp`, `steam`, `media`). The shell provides behavior; each app provides its look.
- [ ] Keyboard support: Tab through the icons, Enter to open, Esc to close the focused window, and an Alt+Tab-style switcher (optional).
- [ ] Open windows at staggered positions so new windows don't stack exactly on top of each other.

**Recruiter affordances**
- [ ] Deep links: `?app=games` (and `?app=games&item=hollow`) open the site straight to an app and skip the intro. Opening or closing a window updates the URL.
- [ ] Skip intro for repeat visitors (e.g. remembered in localStorage). There's no visible overlay any more (Zack removed all home-screen text), so this would be automatic or via `?app=` deep links.
- [ ] Put `Résumé` and `Contact` in the desktop menubar so they're always visible.
- [ ] Add a `READ_ME_FIRST.txt` desktop icon: a 30-second guide for recruiters ("who I am, where to look").

**Architecture**
- [ ] Extend `desktopConfig` with `chrome`, `theme`, `minSize`, `folder`, and a lazily loaded component (`React.lazy`) so each app loads only when it's opened.
- [ ] Add a `src/content/` folder with `games.js`, `media.js`, `work.js` and `profile.js`, the single source of truth that the mobile site can reuse later.
- [ ] Scope each app's styles under `[data-app="<id>"]` with that app's own CSS tokens (see the style guide).

## Phase 2 — Web browser (portfolio) ✅ built Sep 23, 2026

- [x] XP-style window frame (`chrome: 'xp'` in desktopConfig → `src/components/window-chrome.css`): blue title bar, minimize/maximize/close on the right.
- [x] Browser chrome: Back/Forward/Refresh/Home, spinning globe while loading, an address bar you can type into (unknown pages show a classic "The page cannot be displayed" 404), a Links bar, and a status bar that shows link URLs on hover plus a progress bar.
- [x] Links bar: My Games (opens the Steam app), My Edits, watchNACL, LPL English, GitHub.
- [x] Site pages (restyled Sep 23 as a 90s/00s personal homepage; see the style guide): Home, Work, a case study for each project (watchNACL, LPL English, Wildcat Esports, SamIsDual video with all 9 edits linked to YouTube), Résumé, Contact (email + copy button, GitHub).
- [x] Content moved to `src/content/profile.js` and `src/content/work.js` (from resume.jsx; phone number left off).
- [x] Guestbook and Notes pages removed.
- [x] Styles scoped to the app in `src/apps/browser.css`.
- [x] Real-browser behaviour (Sep 24): IE7-style **tabs** (New Tab button and "+", close ×, middle-click closes; each tab keeps its own Back/Forward history and stays loaded in the background; Ctrl/middle-click on a link opens a background tab; closing the last tab closes the window; the window title follows the page). The address bar takes addresses **or** searches, and there's a **Fizz Search** box.
- [x] Nothing leaves the site. Big sites refuse to be shown inside another page, so the browser draws them itself from public data (`src/apps/browser/router.js` decides which):
  - **Fizz Search** (fizzsearch.com): the built-in engine. Results from Zack's site, live Wikipedia results, and GitHub repos. google.com/bing.com/etc. redirect to it.
  - **GitHub**: profiles, repos, folders, files and READMEs from the GitHub API. Falls back to a saved snapshot of Zack's profile (`src/content/githubSnapshot.json`, refresh with `npm run snapshot:github`) when the API is down or rate-limited (60 requests/hour per visitor).
  - **Wikipedia**: full articles from the Wikipedia API (links, section anchors, license line).
  - **YouTube links**: a video page with YouTube's embeddable player; Zack's edits show his role and "more edits".
  - **X, LinkedIn, Instagram, etc.**: an explanation page (they block embedding); for @watchNACL / @LPL_English it links to the case study instead.
  - Anything else is tried in a frame with a note in case the site blocks it.
- [x] **Real web pages through the Cola OS web proxy** (Sep 24): `proxy/` is a Cloudflare Worker that fetches pages, removes the no-framing headers, rewrites links/assets/forms (HTML + CSS) to stay in the proxy and injects a runtime that keeps script-built URLs in the proxy and reports address/title back to the browser (address bar, tab title and per-tab Back/Forward follow in-page navigation). Safeguards: renders only inside `ALLOWED_ORIGINS`, refuses direct visits, never fetches private addresses, passes no cookies (no logins). Login-only apps (X, Instagram, Facebook, LinkedIn, TikTok, Discord, Netflix) keep the explanation page. Optional live web results in Fizz via Brave Search (`BRAVE_API_KEY` secret).
  - [ ] **Zack:** deploy it (`proxy/README.md`: `cd proxy && npm install && npx wrangler login && npx wrangler deploy`), then put `VITE_PROXY_URL=<the workers.dev address>` in `.env.production` and rebuild. Test real sites and note any that misbehave.
- [x] Tests: `scripts/browserRouter.test.mjs`, `scripts/browserTabs.test.mjs` (23 tests total with the window-state and power-glow tests). The claude.ai preview can't reach outside sites, so there it shows the GitHub snapshot and "couldn't reach Wikipedia"; the real site loads everything live.
- [ ] Add personal social links (LinkedIn, X, etc.) to `profile.links` when ready.
- [ ] Add real results (follower growth, impressions) to the `stats` of the watchNACL and LPL English case studies, plus screenshots or embeds of standout posts.
- [ ] Double-check the account links x.com/watchNACL and x.com/LPL_English.

## Phase 3 — Steam-style launcher (games) 🟡 app built Sep 23, waiting on content

- [x] A standalone client styled after the **original 2003-era Steam** (olive skin), not a web page: its own olive window frame, a (decorative) menu row, and working **My games / Developer** tabs.
- [x] My games: a selectable list (Games / Status / Engine) with arrow-key and Enter support. Double-click or "View details" opens a game page with a banner, a description and properties (Status, Genre, Engine, My role, Developer).
- [x] Play button: shown only as enabled when a game has a `playUrl`. Otherwise it's disabled with "No public build yet".
- [x] Developer tab: game-design degree, track record (three games shipped end-to-end in school), tools, and what's being built now, all from profile.js.
- [ ] Real details for both games in `src/content/games.js` (pitch, genre, engine, role, tags).
- [ ] Real banner/key art and screenshots (the banners are abstract CSS placeholders), plus a screenshot strip on the details page.
- [ ] Optional: a dev log / patch notes view per game.

## Phase 4 — Media browser: editing timeline (video & motion) *(new app)*

The app looks like a video editor (NLE): a preview monitor at the top, a project/media bin on the left, and a multi-track timeline along the bottom.

- [ ] Timeline layout: each clip on the timeline is one of your pieces of work, arranged on tracks by type (V1 long-form, V2 shorts, V3 thumbnails — one thumbnail clip under each video, since Zack designed them all — A1 a decorative audio waveform).
- [ ] Clicking a clip, or scrubbing the playhead onto it, loads that piece in the preview monitor. Space bar plays/pauses; arrow keys jump between clips.
- [ ] A timecode readout and a ruler along the top. Clip labels show the title, client and length.
- [ ] An "Inspector" panel for the selected clip: client, role, tools (Premiere, After Effects, DaVinci), results.
- [x] Content: 9 SamIsDual League of Legends pieces (8 videos + 1 Short) are in `src/content/media.js` (titles from YouTube). Zack was full editor on all of them (Premiere Pro) and made every thumbnail. Durations filled from the YouTube API. Still needed: any results.
- [ ] Grid of your work: long-form edits, shorts, thumbnails. Filter by client (e.g. SamIsDual) and by format.
- [ ] Video playback: YouTube embeds that only load when clicked (lite embed), so the site doesn't load YouTube until needed.
- [ ] Thumbnail gallery with before/after comparisons or A/B results where you have them.
- [ ] Show your reach where you can back it with real numbers: views, retention, clients.

## Phase 5 — Extras

- [ ] Optional easter eggs: a Recycle Bin with old projects, a Terminal app that takes `help`, `whoami` and `open games`, and a screensaver after inactivity.

## Phase 6 — Polish & launch

- [ ] Performance: time to the 3D scene under 3 seconds on a normal laptop, lazily loaded apps, compressed images and videos, preloading the model during the intro.
- [ ] SEO and sharing: title and meta tags, an Open Graph image (a render of the CRT), plus a `<noscript>` or plain-HTML fallback with links.
- [ ] Accessibility: keyboard paths through the desktop, visible focus, a reduced-motion path that skips the 3D scene (already exists).
- [ ] Optional privacy-friendly analytics (Plausible or GoatCounter) to see which apps recruiters open.
- [ ] Deploy: follow the current [Cloudflare hosting setup](hosting.md), then the staged site Worker release in the [Riftbound plan](riftbound-plan.md). Update deployment scripts and verify staging before changing the public domains.
- [ ] Test device detection on real phones, tablets (including an iPad with a trackpad) and a narrow desktop window.

---

## Content needed from Zack

- Social: 3–6 standout posts or campaigns per org (links or screenshots) and any numbers you can share (follower growth, impressions, engagement).
- Games: Slots And Ladders and the Unnamed Zombies Project. For each one: the title, engine, your role, status, screenshots and GIFs, a trailer if you have one, and a build or itch.io link if one exists.
- Video: ✅ 9 SamIsDual pieces (8 videos, 1 Short), full editor on Premiere Pro, all thumbnails made by Zack. Lengths filled in. Still needed: any view or retention numbers.
- Résumé PDF (up to date).
- Contact links: email, LinkedIn, GitHub, X/Twitter, YouTube.

## Open questions

1. For Slots And Ladders and the Zombies project: the one-line pitch, genre, engine, your role, and whether a playable build or dev log exists.
