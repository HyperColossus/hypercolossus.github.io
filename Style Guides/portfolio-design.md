# Portfolio design direction (v2)

> v1 (a single unified palette across every app) is archived in `portfolio-design.v1.md`.
> Plan and phases: `docs/roadmap.md`.

## Core idea

**One OS, many worlds.** The void and Cola OS, a 90s-retro desktop, form the consistent frame. Each app inside it has its own identity, so recruiters see range across disciplines. The shell is nostalgic but simple, grey and structured, so the apps' colors stand out against it.

The desktop experience is for laptops and desktops (≥1024px, mouse or trackpad). Device detection sends phones and tablets to the `#mobile` route, a traditional scrolling layout built from the same content (see "Mobile" below).

## Layer 1 — The void (intro)

- **A night sky with little nebula clouds (Sep 23):** deep navy (`#04071c` → `#0a1033`, slightly lighter at the top) scattered with small, soft **purple (`#5a2d9c`) and pink (`#d4508f`) nebula clouds**, which are domain-warped noise with wispy edges and bright pink hearts. It's a **sky sphere that follows the camera** (`VoidBackground.jsx`, 3D noise by view direction), so dragging turns the sky and it feels like orbiting the computer in space. The sky sphere is **fixed in the world** (it only follows the camera's position), so dragging moves the camera around a still computer through a still sky, like real space. Comfort comes from a **slow, eased orbit** instead (OrbitControls `rotateSpeed` 0.35, damping 0.06). A partially-rotating sky was tried and dropped on Sep 23 because it made the computer look like it was spinning. The clouds drift very slowly. Sparkle stars sit on top, and the CRT floats in the middle with lilac lighting. No floor and no ground shadow (a shadow implied a floor and showed a hard edge against the sky).
- **The screen is part of the monitor (Sep 23):**
  - The HTML desktop uses drei `<Html occlude="blending">`: it's drawn behind the WebGL canvas, which cuts a window for it, so the real bezel covers the screen's edges from every angle.
  - The screen is sized to the bezel opening (`SCREEN_FIT` 0.965, centered).
  - The HTML screen is **square**. A WebGL **glass pane** of the same size draws everything else: the **rounded CRT corners** (anti-aliased), an inner shadow where the glass meets the bezel, a vignette, faint scanlines and a top-left reflection.
  - A dark **tube interior** (a box drawn from the inside, with no fog) sits behind the screen, so the recess reads as the inside of a CRT at any angle, never the sky.
  - The monitor's float runs before the screen positions itself each frame (`useFrame` priority -1), so the desktop never lags behind the bezel.
  - The model's own curved screen surface (textured with a baked third-party OS boot image) is removed at load time by deleting only its triangles (`removeBakedScreen`). The texture stays untouched, because cutting it punched holes in other parts.
- **Power button (Sep 23):** the only mouse way to turn the computer on is the **power button on the front of the base unit**: the pill to the right of its three round buttons, measured from the model's geometry.
  - It has an LED in the gap to its left. In standby, the LED is a steady dim amber for the first 5 seconds.
  - **After 5 seconds, a slow breathing glow** eases in over ~1.5s. It cycles every ~2.6s from fully dark to full glow, and lingers slightly in the dark half so it invites rather than nags. The LED, the button face and a soft additive halo all pulse together (`powerGlow.js`, unit-tested).
  - Hover holds it at full glow. Once the computer is on, the LED is a steady green and the glow is off.
  - It also has a hover highlight, a pointer cursor, a press animation and a generous invisible hit area.
  - Clicking elsewhere on the computer does nothing.
  - **The screen is completely blank until then**, like a powered-off tube: no logo, no text. An invisible standby button keeps power-on keyboard-reachable (Tab + Enter) and ignores mouse clicks.
- **No text or buttons on the home screen (Sep 23):** just the computer. The pulsing amber power LED on the base unit is the only call to action; the screen stays blank until it's pressed. Keyboard users reach the standby button with Tab (everything behind it is `inert` until boot finishes).
- Entering: the camera dives in, the Cola OS logo boot screen plays (about 1s), then the desktop appears. It can be skipped.
- Visitors with reduced motion, or whose browser can't run the 3D scene, go straight to the desktop.

## Layer 2 — The shell (Cola OS desktop)

Decided Sep 23, 2026: the OS is called **Cola OS** and the shell is **full 90s retro**. These styles apply only to the desktop, taskbar, start menu, icons, dialogs and the default window frame. Apps keep their own frames (the browser's XP frame, Steam's dark frame, the editor's NLE frame), so opening an app feels like launching different software on an old machine.

- **Look:** classic 90s desktop. Solid teal wallpaper, or a simple tiled pattern, with light-grey `#c0c0c0` surfaces and hard 2px bevels (white top-left, dark-grey bottom-right). Navy title bars `#000080` with white bold text on the default window frame. No rounded corners and no blur.
- **Type:** a crisp bitmap or pixel-style UI font for the shell (a self-hosted pixel font, falling back to Tahoma/MS Sans Serif-like system fonts) at 11–12px. Headlines in the welcome window can be larger, but stay pixel-style.
- **Icons:** 32×32 pixel-art desktop icons with the label below. A selected icon gets a dotted focus rectangle and a navy label background. Double-click opens (single click selects); Enter opens a selected icon for keyboard users.
- **Taskbar:** bottom, full width, grey and beveled. It has a **Start** button with the Cola OS logo on the left, a button for each open window (the pressed/sunken one is active), and a tray on the right with the clock. It replaces the floating dock.
- **Start menu: Vista-era (changed Sep 23)** (`StartMenu.jsx`, `start-menu.css`), deliberately another era inside the 90s shell:
  - A dark Aero-glass frame with a user picture that changes to whichever item you hover.
  - A white left column with pinned Internet and Steam (bold, with subtitles), recent items (READ_ME, Résumé, Contact) and a working "All Programs".
  - A dark right column of links: Zack, My Work, Résumé, Games, Contact, GitHub, Help and Support.
  - A working "Start Search" box that ignores accents; Enter opens the first match.
  - A glossy orange power button that shuts down and returns to the 3D void. The arrow menu next to it has Restart (replays boot) and Shut Down.
  - No Microsoft logos.
- **Desktop items:** icons for each app, plus `READ_ME_FIRST.txt`, which opens in a Notepad-style window as a 30-second guide for recruiters.
- **Readability rule:** the retro look must never cost clarity. Text stays ≥11px with high contrast, and focus states stay visible.
- Optional CRT treatment across the whole screen (scanlines, vignette, glow), kept subtle.
- Virtual screen **1920×1440 at 175% scaling** (lays out as ~1097×823). Zack asked for 1920×1080. The CRT is 4:3, so he chose 1920×1440 to fill it without letterboxing or stretching, and 175% scaling so text stays readable (started at 150%, raised for readability).
- Not copying any real OS's branding: no Windows logo, and no "Start" flag artwork. The Cola OS logo is original.

### Boot screen
- **Logo only**, about 1 second: a black screen, the Cola OS logo, and a small loading bar, then the desktop. It can be skipped with a click or any key. There's no BIOS/POST text.

## Layer 3 — App identities

Each app sets its tokens under `[data-app="<id>"]` and picks a window `chrome` variant. App styles must not leak outside the app.

### Web browser — `portfolio`, chrome `xp`
- **Chrome:** early-2000s browser: glossy toolbar, address bar, Links bar, spinning globe while loading, status bar.
- **Page content (changed Sep 23, 2026): a late-90s/early-2000s personal homepage**, not a modern editorial site. The whole thing should feel like a site you'd find in that browser:
  - A tiled starfield background, and a centered ~660px layout with a left sidebar (Navigation, Elsewhere, "Best viewed in Internet Explorer at 800×600") and a main column.
  - A WordArt-style name banner (gradient fill, 3D drop shadow, slight skew) with a pixel-font tagline, and a green-on-black scrolling ticker for "now" news.
  - Portal-style boxes with gradient title bars, beveled 90s buttons, blue underlined links, bordered data tables, ★ bullets, a blinking NEW! tag, an "Under Construction" hazard stripe (used honestly, for games in development), LCD-style counters for real stats, a "webring" to move between case studies, and a footer of original 88×31 badges.
  - Readability rules still apply: Verdana 11–12px black on white panels, real contrast, and the animations (ticker, blinking) stop for reduced-motion visitors.
- **Proves:** social and esports storytelling, plus a sense of internet culture and design history.

### Steam-style launcher — `games`, chrome `steam`
- **A standalone desktop client in the style of the original 2003-era Steam** (changed Sep 23, 2026): the olive "VGUI" skin (`#4c5844` body, `#3e4637` panels, bevel highlights `#8c9880`/`#282e22`, text `#dee5d7`, gold accent `#c4b550`, selection `#958831`), Tahoma 11px, square beveled buttons, and tabs.
- Its own olive window frame (no navy title bar). Structure: menu row, tabs (My games / Developer), a sunken games list with a gold selection bar, a properties panel on the details page, and a status bar.
- No Valve logos or assets. Referential only.
- **Proves:** game development and systems thinking.

### Media browser — `media`, chrome `media`
- **Editing-timeline (NLE) aesthetic:** dark charcoal panels, a preview monitor, a media bin, and a multi-track timeline with colored clips, a playhead, a ruler and timecode (monospace).
- Clip colors by track: long-form, shorts, thumbnails/graphics. Use a saturated accent (magenta or amber) for the playhead and selection.
- Video comes first: clicking a clip plays it in the monitor. Embeds load only when a clip is clicked.
- **Proves:** editing rhythm, motion, thumbnail craft, and fluency with editing tools.

## Mobile — `#mobile`

- Traditional scrolling layout. No 3D, no windows.
- Borrows light Cola OS touches (the logo, a beveled accent or two) so it feels related to the desktop, but stays clean and modern: a single column and large tap targets.
- Order: hero, work (social/esports), video, games, résumé, contact.

## Rules that apply everywhere

- Readability comes before nostalgia. Every retro effect has to stay readable at 1024×768.
- Keep content honest: no fake metrics, and don't offer a "Play" or "Watch" button unless it works.
- Content lives in `src/content/`, not inside components.
- Apps use container queries: windows can be smaller than the virtual screen.
