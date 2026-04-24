# Website OS Tasks

## Phase 0: Project Setup — COMPLETE

### CSS Scoping
- [x] Restructure routes into layout groups: `(main)/` for existing routes, `(os)/` for desktop
- [x] Move `import '../app.css'` from root layout to `(main)/+layout.svelte`
- [x] Create `(os)/+layout.svelte` that imports 98.css and OS base styles
- [x] Override 98.css wrong color defaults (`--button-face`, `--text-color`, `--window-frame`)
- [x] Verify existing routes (`/`, `/capture-control`) still work unchanged
- [x] Verify `pnpm check` and `pnpm test` pass after restructure

### Dependencies
- [x] Install `98.css`
- [x] Create `static/os-assets/` directory structure (icons, sounds, wallpapers, cursors)
- [x] Create `src/lib/os/types.ts` with core type definitions
- [x] Create `src/lib/os/palette.ts` with complete Win98 color reference
- [x] Source real Win98 PNG icons from icon pack into `static/os-assets/icons/`

## Phase 1: OS Shell — MOSTLY COMPLETE

### Virtual Filesystem
- [ ] Implement `filesystem.ts` with OverlayFS pattern (read-only base + IndexedDB writes)
- [ ] Define default filesystem tree in `filesystem.data.ts`
- [ ] Implement core operations: resolve, list, read, write, create, rename, remove, move, exists
- [ ] Case-insensitive path matching
- [ ] File type associations (extension → app mapping)
- [ ] Tests for filesystem operations

### Session Persistence
- [ ] Implement `session.ts` with IndexedDB read/write
- [ ] Define SessionData interface (boot state, window state, icon positions, theme, scene)
- [ ] Save on state change with debounce (500ms)
- [ ] Restore on mount (hydrate all state from stored session)
- [ ] First-visit detection (`hasBooted` flag)
- [ ] Reset capability (clear IndexedDB, restore defaults)

### Window Manager
- [x] Implement `windowManager.svelte.ts` with rune-based state
- [x] open, close, focus, minimize, maximize, restore operations
- [x] Z-index stacking with monotonic counter
- [x] Cascading position for new windows (30px offset, wrap at viewport edge)
- [x] Mobile-aware: open maximized on small viewports (<640px width)
- [x] Clamp windows to viewport bounds
- [x] Clamp left/top resize anchors back into the viewport during edge resize
- [ ] Session integration: save/restore window state

### App Registry
- [x] Implement `appRegistry.ts` with lazy component imports
- [x] Register initial apps: IE, File Explorer, Settings, Notepad, Calculator, Run Dialog, Chess, Axial, Solitaire, Minesweeper, Point Engine
- [x] Singleton enforcement (only one Calculator, etc.)
- [ ] App launch from filesystem shortcut resolution

### Desktop Settings
- [x] Add Control Panel app reachable from Start → Settings
- [x] Add persistent wallpaper settings with presets, custom image URL, solid color, and image display modes
- [x] Apply wallpaper settings to the desktop surface

### Window Component
- [x] Build `Window.svelte` with 98.css title bar chrome
- [x] Title bar drag-to-move with `setPointerCapture`
- [x] Edge/corner resize handles (8 zones) with pointer capture
- [x] Minimize/maximize/restore/close button handlers
- [x] Enforce minSize constraints and viewport clamping
- [x] Lazy-render app component in content area
- [x] Pass window ID, dimensions, and props to app component
- [x] Double-click title bar to maximize/restore

### Desktop
- [x] Build `Desktop.svelte` with wallpaper layer (teal `#008080`)
- [x] Build `DesktopIcon.svelte` with select/double-click behavior
- [x] Icon grid layout (columns top-to-bottom, left-to-right)
- [x] Viewport-relative icon sizing via `clamp()`
- [x] White text labels, regular weight, no text shadow (correct Win98)
- [x] Win98 selection: blue tint on icon + navy label background
- [x] Click desktop to deselect icons
- [x] Desktop background click/right-click works correctly through the icon-grid container, not just on the bare background node
- [ ] Source desktop icons from filesystem (`C:\Windows\Desktop\`)
- [ ] Drag icons to reposition (persist positions in session)

### Taskbar
- [x] Build `Taskbar.svelte` fixed to bottom (32px)
- [x] Start button with Windows flag icon
- [x] Window list entries (one per open window, icon + truncated title)
- [x] Click entry: focused → minimize; minimized/background → focus
- [x] System tray: live clock (12h format with AM/PM)
- [x] Proper Win98 colors and 3D border

### Start Menu
- [x] Build `StartMenu.svelte` anchored to Start button, opens upward
- [x] Vertical "Windows 98" banner on left edge
- [x] Nested submenu support (hover to expand)
- [x] Programs > Accessories, Games submenus
- [x] Favorites, Documents, Settings, Find entries with submenus
- [x] Help, Run, Log Off, Shut Down entries
- [x] Click-outside-to-close behavior
- [x] Submenu overlaps parent by 2px (Win98 attached look)
- [x] Menu overlaps taskbar slightly
- [x] Black text default, white on hover highlight
- [x] Escape closes the menu even when focus is inside nested submenu items
- [ ] Source Programs submenu from filesystem
- [ ] Keyboard: Arrow-key navigation between items/submenus

### Context Menus
- [x] Build `ContextMenu.svelte` with absolute positioning
- [x] Desktop right-click: Arrange Icons, New, Properties
- [x] Nested submenu support
- [x] Dismiss on click-outside or Escape
- [x] Basic keyboard activation for focused items (Enter / Space)
- [ ] Desktop icon right-click: Open, Rename, Delete, Properties
- [ ] Taskbar right-click: Cascade Windows, Tile Windows, Minimize All

### Sounds
- [ ] Create `sounds.ts` with sound playback (Audio API)
- [ ] Source or create: window open, window close, error chord
- [ ] Wire sounds to window manager events
- [ ] Respect mute/volume setting

### Touch Support
- [ ] Implement `use:longpress` Svelte action (500ms hold → context menu)
- [ ] Implement `use:doubleclick` Svelte action (500ms window, 12px move cancel)
- [ ] Verify window drag works on touch via pointer events
- [ ] Verify window resize works on touch
- [x] Disable default touch behaviors (tap highlight, callout, text selection)

### Keyboard
- [x] Alt+F4 closes focused window
- [x] Escape closes Start menu / context menus
- [ ] Tab / Shift+Tab cycles between open windows (stretch: Alt+Tab overlay)

## Phase 2: Core Apps

### Internet Explorer — COMPLETE
- [x] Build `InternetExplorer.svelte` with IE4 layout
- [x] Menu bar (File, Edit, View, Go, Favorites, Help)
- [x] Toolbar: Back, Forward, Stop, Refresh, Home, Search, Favorites, History (cool-button hover style)
- [x] Address bar with editable URL input, page icon, Go action on Enter
- [x] Throbber animation in top-right (pulsing during load, static when idle)
- [x] Status bar with loading text and zone icon
- [x] Internal URL → content component routing
- [x] Back/forward navigation with history stacks
- [x] Simulated loading delay (200-500ms) with throbber and status text
- [x] "This page cannot be displayed" error for unknown URLs
- [x] Default homepage (portal-style landing)
- [x] Window title updates dynamically ("Page Title - Microsoft Internet Explorer")
- [x] Content area click interception (anchors route through IE navigator)
- [x] `postMessage` sync only accepts messages from the active proxied iframe
- [x] Split static IE chrome data/icons and internal route content rendering out of the browser shell
- [ ] Menu bar dropdowns (File, Edit, View, Go, Favorites, Help — currently labels only)

### Proxy / External Browsing
- [x] Split proxy implementation into dedicated server modules (`html.ts`, `upstream.ts`, `sessionStore.ts`)
- [x] Per-session proxy cookie jars instead of a process-global singleton
- [x] Manual upstream redirect handling with intermediate `Set-Cookie` capture
- [x] Support non-GET upstream requests (POST/PUT/PATCH/DELETE) through the proxy
- [x] Distinguish full HTML documents from fragment responses before injecting the browser shim
- [x] Preserve query params in injected `<base>` handling
- [x] Add SSRF hostname-to-private-IP validation and upstream timeout
- [x] Add direct server tests for cookie semantics, redirect handling, and HTML-shell decisions
- [x] Keep JS-driven upstream cookies and navigations inside the proxy session (`document.cookie`, `location.replace/assign`, form submits)
- [ ] Live-verify GitHub deferred content / commit info against the current site
- [ ] Decide whether global `COEP: credentialless` should be narrowed to only the routes that need cross-origin isolation

### Portfolio Content (inside IE) — CURRENT HOME PASS COMPLETE
- [x] Define project manifests in `src/lib/portfolio/projects.ts` (Point Engine, Axial, Chess, Aperture, Argus, Chromatic)
- [x] Split project manifests, project query helpers, and internal portfolio route contracts into focused modules
- [x] Add reserved `/writings` and `/contact` route contracts with placeholder rendering
- [x] Route IE internal page resolution through the portfolio route contract instead of hard-coded browser literals
- [x] Split the portfolio home page into orchestration, left rail, main panel, right rail, and page-owned CSS
- [x] Build `HomePage.svelte` — editorial OS-dashboard home with dense rails, oversized name lockup, featured project module, height-aware left sidebar panels, and game launchers
- [x] Split home-page constants into `homePageData.ts`
- [x] Build `ProjectList.svelte` — table view of all projects with type badges
- [x] Build `ProjectDetail.svelte` — per-project page with description, stack, "Launch Demo"
- [x] Build `AboutPage.svelte` — bio, skills, contact info
- [x] Build `ErrorPage.svelte` — IE "page cannot be displayed"
- [x] "Launch Demo" button opens the project's app in its own OS window

### Point Engine App
- [x] Replace Point Engine placeholder registry entry with a real OS app component
- [x] Keep the OS app as a thin wrapper around the existing PointEngineDemo surface
- [x] Add embedded demo sizing so the canvas/editor fit inside a resizable OS window
- [x] Preserve standalone `/` route behavior
- [x] Browser-smoke Point Engine launch from desktop icon and portfolio project launch action after implementation changes

### Notepad
- [ ] Build `Notepad.svelte` with menu bar and textarea
- [ ] File menu: New, Open (from filesystem), Save (to filesystem)
- [ ] Edit menu: Undo, Cut, Copy, Paste, Select All, Find
- [ ] Word wrap toggle (Format menu)
- [ ] Status bar with line/column position
- [ ] Open .txt files from File Explorer / double-click

### Calculator
- [ ] Build `Calculator.svelte` matching Win98 layout
- [ ] Standard mode: digit buttons, operations, memory (MC, MR, MS, M+)
- [ ] Working calculation logic
- [ ] Edit menu: Copy, Paste

### File Explorer
- [ ] Build `FileExplorer.svelte` with two-pane layout
- [ ] Left pane: folder tree (expand/collapse)
- [ ] Right pane: file/folder icons or list view in selected directory
- [ ] Address bar showing current path
- [ ] Double-click file → open with associated app
- [ ] Double-click folder → navigate into
- [ ] Right-click → context menu (Open, Rename, Delete, Properties)
- [ ] View menu: Large Icons, Small Icons, List, Details
- [ ] File menu: New Folder, Rename, Delete, Properties

### Run Dialog
- [ ] Build `RunDialog.svelte` matching Win98 layout
- [ ] Text input for app/command name
- [ ] OK, Cancel, Browse buttons
- [ ] App name → app launch (resolve from registry)
- [ ] History dropdown (persist in session)
- [ ] Enter to run, Escape to cancel

## Phase 3: Games

### Solitaire (adapt rjanjic/js-solitaire, MIT)
- [ ] Extract and adapt js-solitaire from 1j01/98 project
- [ ] Wrap vanilla JS in Svelte component for OS window integration
- [ ] Verify spritesheet renders correctly (71x96px card faces, blue crosshatch backs)
- [ ] Verify green felt background, drag-and-drop, cascading win animation
- [ ] Add Win98-style menu bar (Game: Deal, Undo, Options; Help)
- [ ] Score tracking

### Minesweeper (adapt 1j01/98 minesweeper)
- [ ] Extract and adapt minesweeper from 1j01/98 project
- [ ] Wrap vanilla JS in Svelte component
- [ ] Verify sprite sheet renders correctly (tiles, smiley, LED digits)
- [ ] Verify difficulty presets (Beginner, Intermediate, Expert)
- [ ] Add Win98-style menu bar

### Chess (custom build: chess.js + stockfish WASM)
- [ ] Install chess.js (npm, BSD-2) and stockfish (npm v18, GPL-3)
- [ ] Design chess state interface in `state.svelte.ts` wrapping chess.js
- [ ] Build `ChessBoard2D.svelte` — DOM-based 8x8 grid with retro piece sprites
- [ ] Click-to-select, click-to-move interaction
- [ ] Legal move highlighting
- [ ] Check/checkmate/stalemate detection and display
- [ ] Wire Stockfish WASM as AI opponent
- [ ] Adjustable difficulty via Stockfish UCI: Skill Level 0-20, UCI_Elo 1320-3190
- [ ] Expose game state API for AI character integration (board position, evaluation, move history)
- [ ] Game menu: New Game, Undo, Difficulty selector

### Axial (custom build)
- [ ] Design Axial state interface
- [ ] Port or rebuild 3D Connect-4 rules from Caden's Axial project
- [ ] AI opponent with adjustable difficulty
- [ ] Build `AxialBoard2D.svelte` — 2D representation of 3D board
- [ ] Expose game state API for AI character integration
- [ ] Game controls: New Game, Difficulty selector

### Stretch: Pinball
- [ ] Evaluate SpaceCadetPinball WASM build (MIT, 4.3K stars)
- [ ] Embed WASM binary in OS window

### Stretch: DOS Games via js-dos
- [ ] Install js-dos (npm v8.3.20)
- [ ] Create .jsdos bundle with Doom shareware WAD + dosbox.conf
- [ ] Wire js-dos player into OS window
- [ ] Verify COOP/COEP headers work (already set for SharedArrayBuffer)

## Phase 4: Theme System

- [ ] Implement `themeManager.svelte.ts` with theme data model
- [ ] Define theme interface (wallpaper, sound scheme, accent colors)
- [ ] Build default Win98 theme (teal `#008080`, standard sounds)
- [ ] Build at least one scene-linked theme (e.g., aquarium → underwater wallpaper)
- [ ] Wire scene changes to theme switching (sceneStore → themeManager)
- [ ] Build Display Properties dialog
- [ ] Session persistence for theme/wallpaper changes

## Phase 5: Polish

- [ ] Boot sequence (BIOS POST → Win98 loading → desktop, skippable, first visit only)
- [ ] Sleep/wake (return visits restore previous state)
- [ ] Paint app (canvas drawing tool)
- [ ] Media Player (audio player chrome)
- [ ] Win98 cursors
- [ ] Screen saver (starfield, 3D pipes, or maze)
- [ ] Shut Down dialog
- [ ] More Plus!-style themes

## Integration (Depends on 3D Scene Work)

- [ ] Laptop prop in 3D scene that triggers transition
- [ ] Camera zoom animation toward laptop screen
- [ ] Crossfade from 3D canvas to OS desktop
- [ ] Reverse transition: Shut Down → pull back to 3D
- [ ] Ambient audio persistence across transition
- [ ] Wire shared game state between 3D and 2D renderers
- [ ] Wire scene switching between 3D environment and desktop theme
