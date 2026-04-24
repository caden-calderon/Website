# Website OS Context

## Date

2026-04-24

## Purpose

Build a Windows 95/98 desktop OS as the 2D interface for the Chromatic portfolio website. The OS lives on a virtual ThinkPad laptop that sits on a table in the 3D scene alongside an AI character.

## Current Position

- Phase 1 OS shell is functional: Desktop, Window manager, Taskbar, Start menu, context menus, icons
- **Phase 2 in progress**: Internet Explorer 4 with real web browsing via server-side proxy
- Browser hardening pass completed: proxy split into dedicated server modules, per-session cookie jars, manual redirect handling, non-GET upstream support, SSRF/timeout guards, fragment-aware HTML injection, and JS-cookie/nav interception for proxied pages
- **Resize-lag mitigation reverted**: dynamic resize was already smooth for every site except GitHub. Both the previous `display:none`-during-resize hack and a tried size-pin replacement were removed — they didn't fix GitHub's resize lag and they made the general case worse (jank on display:none, complexity for size-pin). Back to the simple `flex:1; width:100%` iframe.
- **GitHub profile-page duplication fixed**: GitHub's profile page contains an `<include-fragment>` whose `src` is a Rails-style URL (`/<user>?action=show&controller=profiles&tab=contributions`). Without `X-PJAX: true` (or `X-Requested-With: XMLHttpRequest`), GitHub serves the **full HTML page** for that URL. `include-fragment-element` then inserts the entire page into the placeholder, and the user sees the profile rendered twice — which is also the source of the perceived "GitHub is laggy to use and to resize" feeling. The proxy's upstream now forwards `X-PJAX: true` + `X-Requested-With: XMLHttpRequest` whenever the incoming request's `sec-fetch-dest` is anything other than `document`/`iframe`/`frame`. Other sites ignore those headers; GitHub's PJAX-aware endpoint returns the proper 12 KB / 238 KB fragment.
- Visual accuracy pass completed: exact Win98 colors, proper font weight, viewport-relative icons
- 98.css installed with color overrides applied to fix its inaccurate defaults
- Route layout groups working: `(main)/` for Tailwind routes, `(os)/` for 98.css routes
- All existing routes (`/`, `/capture-control`) unchanged and functional
- `pnpm check` = 0 errors, `pnpm test` = 145 tests pass, `pnpm build` succeeds

## Active Work

**Browser verification / remaining browser risk** — IE4 opens external sites via server-side proxy at `/api/proxy`. Most sites work (Wikipedia, Hacker News, archive.org, personal blogs). Highest-priority remaining issues:
- Google search triggers CAPTCHA ("unusual traffic") — proxy IP flagged as bot
- GitHub repo deferred content path was fixed at the proxy layer, but still needs real browser verification against the live site
- Global `COEP: credentialless` remains a product-level tradeoff; it keeps the ML worker path working but may be broader than the browser route really needs

**Visual direction pending** — user wants a blend of 90s web + early-2000s + webcore + Nintendo Wii UI + tech portfolio. Current styling is early-2000s gradient-heavy sections with Mii avatar. Needs more Wii-influence (softer rounded shapes, lighter palette, playful touches) and webcore personality (decorative dividers, sparkle motifs, more expressive).

## What's Built

### OS Shell (Phase 1 — complete)
- `src/lib/os/Desktop.svelte` — wallpaper, icon grid, keyboard shortcuts, context menu wiring
- `src/lib/os/Window.svelte` — 98.css chrome, drag via pointer capture, 8-edge resize, lazy app loading
- `src/lib/os/windowManager.svelte.ts` — open/close/focus/minimize/maximize/restore, z-stacking, centered cascade positioning, mobile-aware
- `src/lib/os/Taskbar.svelte` — Start button with Windows flag, running window list with icons, live clock, system tray
- `src/lib/os/StartMenu.svelte` — hierarchical Win98 menu: Programs (Accessories, Games, IE), Favorites, Documents, Settings, Find, Help, Run, Log Off, Shut Down. 32x32 icons on top-level, 16x16 in submenus. Submenu overlap.
- `src/lib/os/apps/Settings.svelte` — Control Panel background settings, reachable from Start → Settings → Control Panel and desktop Properties
- `src/lib/os/desktopSettings.svelte.ts` + `wallpaperStyle.ts` — persistent wallpaper state with solid, fill, fit, center, tile, and stretch modes
- `src/lib/os/ContextMenu.svelte` — right-click menus with submenu support
- `src/lib/os/DesktopIcon.svelte` — viewport-relative sizing, Win98 selection behavior (blue tint + navy label bg)
- `src/lib/os/appRegistry.ts` — lazy component imports for 10 apps, larger useful default sizes for IE/main apps, placeholders for unimplemented apps
- `src/lib/os/icons.ts` — real Win98 PNG icons for system apps, inline SVG for custom apps (Chess, Axial, Point Engine)
- `src/lib/os/palette.ts` — complete Win98 color palette, font specs, icon metrics, 98.css override values
- `src/lib/os/types.ts` — WindowState, AppDef, AppId, TaskbarEntry, DesktopTheme, ContextMenuItem, constants
- `src/lib/os/apps/Placeholder.svelte` — stub for unimplemented apps
- `src/lib/os/apps/PointEngine.svelte` — thin Win98-style OS shell around the existing point engine demo, with container-relative demo layout for window resizing
- `static/os-assets/icons/` — 20 real Win98 PNG icons from the win98_icons pack

### Route Structure
```
src/routes/
  +layout.svelte               — root: minimal, no CSS
  (main)/
    +layout.svelte             — imports Tailwind (app.css)
    +page.svelte               — point engine demo (existing, unchanged)
    capture-control/+page.svelte — Kinect operator (existing, unchanged)
  (os)/
    +layout.svelte             — imports 98.css + Win98 color overrides
    desktop/+page.svelte       — mounts Desktop.svelte
```

## Key Technical Decisions

- 98.css for visual styling, with CSS custom property overrides to fix its inaccurate defaults (`--button-face`, `--text-color`, `--window-frame`)
- `-webkit-font-smoothing: none` for pixel-perfect bitmap font rendering
- Desktop icon labels: Regular weight (400), no text shadow (shadows were Win2000+)
- Viewport-relative icon sizing via `clamp()` for proportional scaling
- Start menu overlaps taskbar by 2px; submenus overlap parents by 2px
- Menu text: black `#000000` default, white `#ffffff` on hover highlight
- All colors sourced from real Win98 "Windows Standard" theme binary

## Research Findings

### 98.css Inaccuracies (fixed via overrides)
- `--button-face: #dfdfdf` → should be `#c0c0c0`
- `--text-color: #222222` → should be `#000000`
- `--window-frame: #0a0a0a` → should be `#000000`
- `--surface: #c0c0c0` is correct
- Title bar gradients are correct
- Ships "Pixelated MS Sans Serif" WOFF2 — this is the right font

### Win98 Desktop Icon Specs
- 32x32 pixel icons
- MS Sans Serif, 8pt, Regular (400) weight
- 75px center-to-center grid spacing
- No text shadow (that was Win2000/ME)
- Selection: blue tint on icon + navy bg on label text

### Win98 Taskbar Specs
- 28px height including 2px raised border (we use 32px for modern displays)
- Start button: ~54x22px, MS Sans Serif Bold, Windows flag 16x16
- System tray: sunken border, clock, 16x16 notification icons

### Win98 Font Usage
- Title bar: MS Sans Serif, -11 height, Bold
- Menus: MS Sans Serif, -11 height, Regular
- Desktop icons: MS Sans Serif, -8 height, Regular
- Status bars: MS Sans Serif, -11 height, Regular

### Win98 Icon Resources
- `win98_icons.zip` at repo root contains the full Win98 icon pack (ICO + PNG)
- PNGs use numbered suffixes for size variants: `-0` = largest, `-1` = smaller
- Real Win98 icons sourced from the Alex Meub collection (win98icons.alexmeub.com)

## What's Built — Phase 2 (in progress)

### Internet Explorer 4 (`src/lib/os/apps/InternetExplorer.svelte`)
- Full IE4 chrome: menu bar, toolbar with cool-button hover, address bar, throbber, status bar
- 8 toolbar buttons: Back, Forward, Stop, Refresh, Home, Search, Favorites, History
- Cool-button CSS: flat default, raised 1px border on hover, sunken on active
- Editable address bar with page icon and Enter-to-navigate
- **Search queries**: typing "apple" or "how to cook" searches Google; "github.com" navigates
- Animated throbber (pulsing globe during load, static when idle)
- Internal URL routing: `http://chromatic.dev/` domain → content component mapping
- **External browsing**: any URL loads through server-side proxy in iframe
- **Favorites dropdown**: working star button with bookmarks (GitHub, Wikipedia, HN, etc.)
- Back/Forward navigation with full history stacks
- Simulated loading delay (200-500ms) with status text and throbber animation
- Click interception on content area: all `<a>` tags route through the IE navigator
- Window title updates dynamically: "Page Title - Microsoft Internet Explorer"
- `windowManager.updateTitle()` added to enable this
- Status bar: "Opening page..." during load, "Done" when idle, zone switches Internet/Local intranet
- Dismissable info strip on external pages with "Open in new tab" option
- Can open via desktop icon, Start menu, or programmatically with a URL prop
- Direct app launches to external IE URLs seed `iframeSrc` immediately, so externally opened IE windows do not render a blank iframe before the first explicit navigation
- URL normalization, internal route resolution, proxy URL building, and short URL formatting live in tested pure helpers at `src/lib/os/apps/internetExplorerNavigation.ts`
- `postMessage` sync from proxied pages is source-checked so unrelated windows cannot spoof the address bar
- Iframe-escape recovery: if a proxied page navigates the iframe outside `/api/proxy` (cross-origin or same-origin non-proxy URL), the IE shell detects it on `iframe.onload`, shows a small recovery info strip, and reloads the last known proxied URL

### Web Proxy (`src/routes/api/proxy/+server.ts`)
- Route is now a thin orchestrator over `src/lib/server/proxy/{html,sessionStore,upstream}.ts`
- Per-session upstream cookie jars keyed by an HttpOnly proxy-session cookie instead of a shared process-global singleton
- Manual redirect loop preserves intermediate `Set-Cookie` headers and handles 301/302/303 method transitions correctly
- Supports `GET`, `HEAD`, `POST`, `PUT`, `PATCH`, and `DELETE` upstream requests so real form flows can pass through the proxy
- HTML injection now distinguishes full documents from fragment requests; deferred HTML fragments are no longer treated as standalone pages
- Injects `<base>` tag using the full final URL, including query params, for correct relative and query-relative navigation
- **Server-side link rewriting**: `<a href>`, `<form action>`, `<include-fragment src>`, and `<turbo-frame src>` are rewritten to full proxy URLs so the remote `<base>` tag cannot break them
- Injects navigation interceptor script: click capture, `location.assign`/`replace`, GET/POST form submit handling, pushState/replaceState, fetch/XHR wrapping, service-worker blocking, non-HttpOnly cookie sync back to the proxy session, and parent address-bar sync
- Upstream fetches are guarded with hostname-to-IP validation against private-network SSRF and a 15s timeout
- CORS `Access-Control-Allow-Origin: *` on all proxy responses
- Proxy helper logic now has direct server tests for HTML-shell decisions, redirect cookies, and POST redirect behavior

### Cookie Jar (`src/lib/server/cookieJar.ts`)
- Cookie jar is now scoped per proxy session instead of shared across all users
- Captures `Set-Cookie` from upstream responses and sends stored cookies on subsequent requests in the same proxy session
- Handles host-only cookies, domain matching, RFC default-path derivation, path-boundary matching, expiry, secure flag, and Max-Age precedence
- Validates cookie domain against request hostname to prevent cross-domain injection

### Known Browser Limitations
- Google search still depends on Google’s current bot / IP reputation scoring. The proxy now carries JS-driven challenge flows more cleanly, but it cannot guarantee the server IP will avoid `sorry` / CAPTCHA responses.
- GitHub’s older `tree-commit-info` path appears to have been replaced on the current live site; deferred fragments still need browser-level spot checks as GitHub keeps changing its repo UI.
- ~~GitHub specifically feels laggy to use and to resize~~ — root cause was the include-fragment full-page-injection bug above; once `X-PJAX: true` is forwarded on fragment requests, the duplicated render goes away and the page weight drops by roughly 200 KB (one fewer copy of the entire profile inside itself). Repo pages were never affected because their fragment URLs already serve real fragments without `X-PJAX`.
- Authenticated or bot-sensitive sites remain fragile; the proxy is still intentionally lightweight and not a full browser engine
- `credentialless` COEP is still global, which may be a worse tradeoff than route-scoped isolation once the browser work settles

### Portfolio Content Pages (`src/lib/portfolio/`)
- `types.ts` — `PortfolioProject` and `PortfolioRouteMatch` interfaces with appId/page contracts for OS integration
- `projectCatalog.ts` — static project manifests only (Point Engine, Axial, Chess, Aperture, Argus, Chromatic)
- `projectQueries.ts` — pure lookup/filter helpers for project data
- `projects.ts` — compatibility barrel re-exporting project catalog/query helpers for existing imports
- `routes.ts` — internal `chromatic.dev` route contract consumed by IE navigation helpers
- `HomePage.svelte` — editorial OS-dashboard portfolio home orchestration: rail state, rail resizing, and height-aware left-rail expansion
- `HomeLeftRail.svelte`, `HomeMainPanel.svelte`, `HomeRightRail.svelte` — extracted home-page sections for navigation/status modules, hero/feature/project modules, and profile/contact modules
- `HomePage.css` — page-owned portfolio home styles shared by the extracted home components
- `homePageData.ts` — home-page navigation/focus/stack/game launcher/sidebar constants kept out of the Svelte component
- `ProjectList.svelte` — table view of all projects with type badges and year
- `ProjectDetail.svelte` — breadcrumb, description, tech stack tags, "Launch Demo" button, details table
- `AboutPage.svelte` — bio, skills table, contact sidebar
- `SearchStartPage.svelte` — MSN-era search start page; date is generated client-side instead of hard-coded
- `PlaceholderPage.svelte` — reserved-route page for `/writings` and `/contact` until those surfaces get real content
- `ErrorPage.svelte` — faithful IE "The page cannot be displayed" with troubleshooting steps
- Home page now follows the user-provided CADEN CALDERON editorial reference more closely; secondary portfolio pages still use the older clean late-90s web style and need a later visual pass.
- IE internal route resolution now delegates portfolio page paths to `resolvePortfolioRoute(pathname)` so future portfolio pages can be added without changing the browser's address normalization/proxy logic.
- IE chrome/content cleanup split static toolbar data into `internetExplorerChrome.ts`, moved internal content rendering into `InternetExplorerContent.svelte`, and moved the shell stylesheet into `InternetExplorer.css`. `InternetExplorer.svelte` still owns browser state and proxy/iframe behavior.

### Build Configuration
- `vite.config.ts` disables CSS minification for both SSR and client builds because `98.css@0.1.21` includes `@media (not(hover))`, which Vite 8's default Lightning CSS minifier rejects. This keeps the vendor package intact and avoids adding an extra CSS build dependency.

### Point Engine OS App
- Point Engine now launches from the desktop icon, Start menu, and portfolio project launch action into a real OS window instead of `Placeholder.svelte`.
- The OS app is intentionally a wrapper around `src/lib/demo/PointEngineDemo.svelte`; it does not duplicate editor/viewer implementation or move app policy into `src/lib/engine/`.
- `PointEngineDemo.svelte` accepts `presentation="standalone" | "embedded"` so the existing `/` route keeps full-viewport behavior while the OS app uses container-relative sizing.
- `Controls.svelte` accepts `panelLayout="viewport" | "container"` so the control panel stays inside the OS window during resize.
- The OS app imports a Tailwind theme/utilities-only CSS entry for the demo controls, avoiding Tailwind preflight in the Win98 desktop surface.

### Wallpaper Sizing Decision
- Do not cap the whole OS viewport for ultrawide displays yet. The desktop should stay fluid like the teal default.
- Image wallpapers use display modes instead: `Fill` for full-bleed responsive backgrounds, `Fit` for preserving the full image, `Center` / `Tile` for Win98-style assets, and `Stretch` only when intentional distortion is acceptable.
- Practical source image target: provide at least `3440x1440` for ultrawide fill, or `2560x1440` for normal widescreen. Smaller classic wallpapers still work best as `Tile` or `Center`.

## What's Next

**Immediate (browser verification / policy decisions)**:
1. Verify Google’s current `sorry` / CAPTCHA flows in an actual browser session now that JS cookie sync and location/form interception are in place
2. Verify GitHub repo pages in an actual browser session and confirm current deferred fragments still behave through the proxy
3. Decide whether `COEP: credentialless` should stay global or move to route-scoped isolation for only the ML-heavy surfaces
4. Continue home-page visual refinement against the editorial reference: replace temporary generated/CSS project art with stronger real assets, tune the portrait treatment, and decide whether collapsible panel/rail state should persist

**Open questions / nice-to-haves**:
- Win95-style "outline only while resizing" remains an interesting authenticity touch (not a perf fix anymore). Medium effort.
- Throttle window size updates to ~30 Hz during resize. Cheap; only matters if any other heavy site shows up in practice.
- The proxy shim is still inlined per page. Marginal win to externalize + cache.

**Then (Phase 2 continuation)**:
- Notepad — simple text editor
- Calculator — Win98 calculator
- File Explorer — two-pane folder/file browser (needs virtual filesystem)

See `tasks.md` for the full checklist.

## Handoff Prompt

See `handoff-prompt.md` in this directory for the prompt to feed Claude after context clear.

## Read These First

- `dev/active/website-os/plan.md` — vision, decisions, phases
- `dev/active/website-os/architecture.md` — technical map, component contracts
- `dev/active/website-os/tasks.md` — phase-by-phase checklist
- `src/lib/os/palette.ts` — Win98 color reference
