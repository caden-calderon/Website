# Website OS Context

## Date

2026-04-16

## Purpose

Build a Windows 95/98 desktop OS as the 2D interface for the Chromatic portfolio website. The OS lives on a virtual ThinkPad laptop that sits on a table in the 3D scene alongside an AI character.

## Current Position

- Phase 1 OS shell is functional: Desktop, Window manager, Taskbar, Start menu, context menus, icons
- **Phase 2 in progress**: Internet Explorer 4 with real web browsing via server-side proxy
- Visual accuracy pass completed: exact Win98 colors, proper font weight, viewport-relative icons
- 98.css installed with color overrides applied to fix its inaccurate defaults
- Route layout groups working: `(main)/` for Tailwind routes, `(os)/` for 98.css routes
- All existing routes (`/`, `/capture-control`) unchanged and functional
- `pnpm check` = 0 errors, `pnpm test` = 126 tests pass

## Active Work

**Browser refinement in progress** — IE4 opens external sites via server-side proxy at `/api/proxy`. Most sites work (Wikipedia, Hacker News, archive.org, personal blogs). Known issues:
- Google search triggers CAPTCHA ("unusual traffic") — proxy IP flagged as bot
- GitHub repo pages load but commit info / deferred content still shows "Cannot retrieve latest commit"
- Cookie jar is implemented but effectiveness unverified from user observation

**Visual direction pending** — user wants a blend of 90s web + early-2000s + webcore + Nintendo Wii UI + tech portfolio. Current styling is early-2000s gradient-heavy sections with Mii avatar. Needs more Wii-influence (softer rounded shapes, lighter palette, playful touches) and webcore personality (decorative dividers, sparkle motifs, more expressive).

## What's Built

### OS Shell (Phase 1 — complete)
- `src/lib/os/Desktop.svelte` — wallpaper, icon grid, keyboard shortcuts, context menu wiring
- `src/lib/os/Window.svelte` — 98.css chrome, drag via pointer capture, 8-edge resize, lazy app loading
- `src/lib/os/windowManager.svelte.ts` — open/close/focus/minimize/maximize/restore, z-stacking, cascade positioning, mobile-aware
- `src/lib/os/Taskbar.svelte` — Start button with Windows flag, running window list with icons, live clock, system tray
- `src/lib/os/StartMenu.svelte` — hierarchical Win98 menu: Programs (Accessories, Games, IE), Favorites, Documents, Settings, Find, Help, Run, Log Off, Shut Down. 32x32 icons on top-level, 16x16 in submenus. Submenu overlap.
- `src/lib/os/ContextMenu.svelte` — right-click menus with submenu support
- `src/lib/os/DesktopIcon.svelte` — viewport-relative sizing, Win98 selection behavior (blue tint + navy label bg)
- `src/lib/os/appRegistry.ts` — lazy component imports for 10 apps, all pointing to Placeholder for now
- `src/lib/os/icons.ts` — real Win98 PNG icons for system apps, inline SVG for custom apps (Chess, Axial, Point Engine)
- `src/lib/os/palette.ts` — complete Win98 color palette, font specs, icon metrics, 98.css override values
- `src/lib/os/types.ts` — WindowState, AppDef, AppId, TaskbarEntry, DesktopTheme, ContextMenuItem, constants
- `src/lib/os/apps/Placeholder.svelte` — stub for unimplemented apps
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

### Web Proxy (`src/routes/api/proxy/+server.ts`)
- Server-side proxy fetches external pages, strips CSP/X-Frame-Options/CORP headers
- Injects `<base>` tag for correct relative-URL resolution (images, CSS, JS load from original site)
- **Server-side link rewriting**: all `<a href>`, `<form action>`, `<include-fragment src>`, `<turbo-frame src>` are rewritten at HTML parse time to route through the proxy. Uses **full absolute URLs** (e.g. `http://localhost:5178/api/proxy?url=...`) — critical because the `<base>` tag would otherwise make relative `/api/proxy` paths resolve against the remote origin
- Injects navigation interceptor script: click capture, pushState/replaceState, fetch/XHR wrapping (backup for dynamically generated content)
- Forwards client Accept header so API endpoints return correct content type (JSON vs HTML)
- Rewrites localhost-origin URLs back to remote origin (fixes SPAs using `window.location`)
- Blocks service worker registration in proxied pages
- postMessage to parent IE shell syncs address bar with real URL
- OPTIONS handler for CORS preflight (needed because fetch wrapper sets custom headers)
- CORS `Access-Control-Allow-Origin: *` on all responses
- COEP: consistent `credentialless` across all routes — proxy iframe is same-origin so no blocking

### Cookie Jar (`src/lib/server/cookieJar.ts`)
- In-memory singleton Cookie jar shared across all proxy users (acceptable for portfolio)
- Captures `Set-Cookie` from upstream responses, sends stored cookies on subsequent requests
- Handles domain matching (exact + parent), path prefix, expiry, secure flag, Max-Age precedence
- Validates cookie domain against request hostname to prevent cross-domain injection
- `redirect: 'follow'` in fetch loses intermediate 3xx Set-Cookie headers — noted as future enhancement

### Known Browser Limitations
- Google search triggers CAPTCHA — server IP flagged. Possible solutions: render CAPTCHA in iframe for user to solve, use custom search results page via API, or use a different search engine backend
- GitHub commit info (`tree-commit-info` endpoint) returns data in direct curl tests but doesn't always load in browser — may be client-side JS authentication flow that depends on session cookies set via `document.cookie` (not captured by our server-side jar)
- Authenticated site features won't work — `credentialless` COEP strips cookies from client-side cross-origin sub-resource requests

### Portfolio Content Pages (`src/lib/portfolio/`)
- `types.ts` — `PortfolioProject` interface with appId for OS integration
- `projects.ts` — 6 project manifests (Point Engine, Axial, Chess, Aperture, Argus, Chromatic)
- `HomePage.svelte` — portal-style landing with banner, featured projects grid, sidebar with quick links + game launchers
- `ProjectList.svelte` — table view of all projects with type badges and year
- `ProjectDetail.svelte` — breadcrumb, description, tech stack tags, "Launch Demo" button, details table
- `AboutPage.svelte` — bio, skills table, contact sidebar
- `ErrorPage.svelte` — faithful IE "The page cannot be displayed" with troubleshooting steps
- All pages styled as clean late-90s web pages (navy headings, blue links, gray borders)

## What's Next

**Immediate (browser refinement)**:
1. Solve Google CAPTCHA — user suggested allowing CAPTCHA passthrough in the iframe
2. Debug why cookie jar isn't helping GitHub commit info (verify cookies are stored/sent, check Network tab in browser)
3. Discuss visual direction for portfolio pages — more Wii/webcore, less corporate early-2000s

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
