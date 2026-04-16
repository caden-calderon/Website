# Website OS Context

## Date

2026-04-15

## Purpose

Build a Windows 95/98 desktop OS as the 2D interface for the Chromatic portfolio website. The OS lives on a virtual ThinkPad laptop that sits on a table in the 3D scene alongside an AI character.

## Current Position

- Phase 1 OS shell is functional: Desktop, Window manager, Taskbar, Start menu, context menus, icons
- **Phase 2 started**: Internet Explorer 4 is the first real app — fully functional with IE4 chrome
- Visual accuracy pass completed: exact Win98 colors, proper font weight, viewport-relative icons
- 98.css installed with color overrides applied to fix its inaccurate defaults
- Route layout groups working: `(main)/` for Tailwind routes, `(os)/` for 98.css routes
- All existing routes (`/`, `/capture-control`) unchanged and functional
- `pnpm check` = 0 errors, `pnpm test` = 126 tests pass

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
- Animated throbber (pulsing globe during load, static when idle)
- Internal URL routing: `http://chromatic.dev/` domain → content component mapping
- Back/Forward navigation with full history stacks
- Simulated loading delay (200-500ms) with status text and throbber animation
- Click interception on content area: all `<a>` tags route through the IE navigator
- Window title updates dynamically: "Page Title - Microsoft Internet Explorer"
- `windowManager.updateTitle()` added to enable this
- Status bar: "Opening page..." during load, "Done" when idle, "Internet" zone indicator
- Can open via desktop icon, Start menu, or programmatically with a URL prop

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

Priority order:
1. ~~Internet Explorer 4 browser — the portfolio navigation surface~~ ✓
2. ~~Portfolio content pages~~ ✓
3. Notepad — simple text editor
4. Calculator — Win98 calculator
5. File Explorer — two-pane folder/file browser (needs virtual filesystem)

See `tasks.md` for the full checklist.

## Read These First

- `dev/active/website-os/plan.md` — vision, decisions, phases
- `dev/active/website-os/architecture.md` — technical map, component contracts
- `dev/active/website-os/tasks.md` — phase-by-phase checklist
- `src/lib/os/palette.ts` — Win98 color reference
