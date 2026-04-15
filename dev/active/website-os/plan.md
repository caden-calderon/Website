# Website OS Plan

## Vision

The Chromatic website presents two interfaces that are one experience:

1. A 3D scene where an AI character sits across a table from the visitor
2. A retro Windows 95 laptop on the table that the visitor can click into

The 2D view is not a fallback or alternative — it is literally the laptop's screen inside the 3D world. The user is always "in" the scene. Clicking the laptop is leaning forward and looking at the screen.

The laptop runs a faithful Windows 95 desktop OS. Internet Explorer opens the portfolio site. Games are desktop apps. The AI character becomes a Clippy-style assistant. Desktop themes change with the 3D scene.

## Goals

- Nail the Windows 95 look and feel. Authentic, not ironic.
- Both interfaces share the same content and state. Chess in 3D = chess on the laptop.
- Scene switching affects both views — 3D environment changes, desktop theme changes.
- Portfolio projects are accessible in both views, presented appropriately for each.
- Code quality: FAANG-grade without overengineering. Clean, readable, well-organized.

## Non-Goals (For Now)

- Point-cloud/particle visual effects layered onto the OS. Get Win95 right first.
- AI character integration (being built in a separate repo — leave the surface ready).
- The 3D scene itself (Codex owns Kinect pipeline, scene composition comes later).
- The laptop-to-3D transition animation (requires 3D scene work).

## Architecture Decisions

### 1. 98.css for the visual layer

Use the mature `98.css` library (11K stars, stable, CSS-only) for faithful Win95 styling. Write semantic HTML with its class conventions. No wrapper components needed — Svelte components output the expected HTML structure directly.

Why not roll our own CSS: 98.css has years of pixel-accurate refinement. We'd spend weeks matching it and still get details wrong. Use the library, spend our time on behavior and content.

### 2. Custom Svelte 5 window management

Build the window manager from scratch with Svelte 5 runes. The existing Svelte window management libraries are either 2 days old (winui) or self-described as buggy (panekit). Window management is well-understood behavior and maps cleanly to rune-based state.

The window manager owns: open/close, focus/z-index stacking, minimize/maximize/restore, drag position, resize dimensions, taskbar registration.

### 3. Internet Explorer 4 as the portfolio browser

The fake browser is the primary navigation surface for portfolio content. IE4 is the most authentic Win95-era browser and has the richest visual language: toolbar with cool buttons, address bar, throbber, Explorer Bar sidebar, status bar.

Address bar routing: internal routes render content directly. External URLs show the authentic "This page cannot be displayed" error. The default homepage is a portal-style landing with project links.

### 4. Plus!-style desktop themes for scene switching

Microsoft Plus! for Windows 95 introduced desktop themes — bundled wallpaper, icons, sounds, cursors, and colors. This maps directly to the scene-switching mechanic: each 3D scene has a corresponding desktop theme.

Default theme: teal `#008080` background (the real Win95 default) or Clouds.bmp. Future scenes add themes as they're built.

### 5. Shared state between 3D and 2D views

Game state, scene state, AI conversation state, and content state live in view-agnostic Svelte stores. Each view has its own renderer consuming the same state. Changing the chess board in 3D updates the 2D board and vice versa.

### 6. Route structure

The OS desktop is its own route (initially `/desktop`, eventually reached via the 3D laptop transition). The 3D scene remains at `/`. The OS manages its own internal navigation through windows — SvelteKit routes are minimal.

Portfolio content lives inside the IE browser window, not as SvelteKit page routes. The browser app handles its own internal routing (address bar → content switching). This keeps the OS feeling like a real OS rather than a website with window dressing.

### 7. Sound design

Win95 system sounds are copyrighted. Create original sounds that evoke the same feel, or source from ReactOS (open-source Win95-compatible sounds) or CC-licensed retro UI packs. Events: startup, error, window open/close, minimize/maximize, notification, menu click.

## Key References

- **daedalOS** (dustinbrett.com) — Complete web desktop portfolio, 12.5K stars. Best reference for architecture decisions.
- **98.css** (jdan/98.css) — CSS library for Win98 faithful UI. Our visual foundation.
- **poolside.fm** — Retro computer aesthetic music player. Good mood reference.
- **simone.computer** — Retro computer portfolio by Simone Giertz.
- **GUIdebook** (guidebookgallery.org) — Screenshots of historical OS GUIs for pixel reference.

## Build Phases

### Phase 1: OS Shell

The empty desktop that you can interact with. No apps, no content — just the container.

- Desktop surface with wallpaper (teal `#008080`)
- Window component with 98.css chrome (title bar, control buttons, resize, drag)
- Window manager state (open/close, focus, z-index, minimize/maximize, position, size)
- Taskbar (Start button, running window list, clock)
- Start menu (program list, Settings, Shut Down)
- Desktop icons (double-click to launch windows)
- Right-click context menus
- System sounds (window open/close, error, menu click)
- Keyboard shortcuts (Alt+F4 close, Alt+Tab switch, etc.)

### Phase 2: Core Apps

The apps that make the desktop useful.

- Internet Explorer 4 browser (toolbar, address bar, throbber, status bar, Explorer Bar)
- Portfolio content inside IE (project list, project detail pages)
- Notepad (plain text editor with menu bar)
- Calculator (standard Win95 calculator)
- File Explorer (tree view + file list for project browsing)

### Phase 3: Games

Interactive content that works in both 3D and 2D.

- Chess (2D board renderer, AI opponent at multiple difficulty levels)
- Axial (2D board renderer for 3D Connect-4)
- Solitaire (Klondike — classic Win95 game)
- Minesweeper (classic Win95 game)

### Phase 4: Theme System

Scene-aware desktop themes.

- Theme data model (wallpaper, sound scheme, accent colors, icon set)
- Default Win95 theme (teal background, standard sounds)
- At least one scene-linked theme (aquarium → underwater theme)
- Theme switching UI (in Settings or via Start menu)
- Wallpaper picker (Display Properties dialog)

### Phase 5: Polish and Enhancements

- Paint (canvas drawing app)
- Media Player (audio player for scene ambient music)
- Solitaire win animation (the classic cascading cards)
- More desktop themes as 3D scenes are built
- Clippy-style AI assistant placeholder
- Startup sequence (boot screen → desktop load)
- Screen saver (after idle timeout)

## Resolved Questions

- **Mobile**: Native pixel rendering, no CSS scaling. Win95 elements (30px taskbar, 32px icons) are small enough to be touch-viable on modern phones. Pointer events unify mouse/touch. Long-press action for right-click. Works well — daedalOS proves this approach at scale.
- **Route**: `/desktop` under a `(os)/` layout group. Separate CSS context from the existing Tailwind routes.
- **Boot sequence**: First visit shows BIOS POST → Win95 loading → desktop (skippable). Return visits show a brief sleep/wake animation and restore previous state. Session persists to IndexedDB.
- **File Explorer depth**: Full fake filesystem with OverlayFS pattern — read-only base tree in code, user modifications in IndexedDB. Supports rename, delete, create, move. Desktop icons and Start menu items are sourced from the filesystem.
- **CSS**: 98.css and Tailwind coexist via SvelteKit layout groups. Each group has its own CSS import. No conflicts.

## Open Questions

- What font stack? 98.css bundles its own pixel fonts. Do we supplement or override?
- Should the Run dialog accept arbitrary text (easter eggs for funny commands)?
- How does the Recycle Bin work? Move deleted files there, or purely cosmetic?
- Do we want Win95 cursors (custom CSS cursors) or just default browser cursors?

## Guardrails

- Do not over-abstract. A Window component does not need a plugin system.
- Do not add features speculatively. Build what's needed for the current phase.
- Keep the engine (`src/lib/engine/`) untouched. The OS is a separate concern.
- Do not collapse the OS shell into SvelteKit routing. The OS manages its own state.
- Test interactively. Window dragging, z-stacking, and resize need to feel right, not just pass a unit test.
- Keep the code organized. `src/lib/os/` owns the OS. `src/lib/games/` owns game logic. `src/lib/portfolio/` owns content. Clear boundaries.
