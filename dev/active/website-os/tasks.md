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
- [ ] Session integration: save/restore window state

### App Registry
- [x] Implement `appRegistry.ts` with lazy component imports
- [x] Register initial apps: IE, File Explorer, Notepad, Calculator, Run Dialog, Chess, Axial, Solitaire, Minesweeper, Point Engine
- [x] Singleton enforcement (only one Calculator, etc.)
- [ ] App launch from filesystem shortcut resolution

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
- [ ] Source Programs submenu from filesystem
- [ ] Keyboard: Escape to close (partially — works from Desktop, not internal)

### Context Menus
- [x] Build `ContextMenu.svelte` with absolute positioning
- [x] Desktop right-click: Arrange Icons, New, Properties
- [x] Nested submenu support
- [x] Dismiss on click-outside or Escape
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

### Internet Explorer
- [ ] Build `InternetExplorer.svelte` with IE4 layout
- [ ] Menu bar (File, Edit, View, Go, Favorites, Help)
- [ ] Toolbar: Back, Forward, Stop, Refresh, Home, Search, Favorites (cool-button hover style)
- [ ] Address bar with editable URL input, page icon, Go action on Enter
- [ ] Throbber animation in top-right (spinning/animated during load, static when idle)
- [ ] Status bar with loading text and zone icon
- [ ] Internal URL → content component routing
- [ ] Back/forward navigation with history stacks
- [ ] Simulated loading delay (200-500ms) with throbber and status text
- [ ] "This page cannot be displayed" error for unknown URLs
- [ ] Default homepage (portal-style landing)

### Portfolio Content (inside IE)
- [ ] Define project manifests in `src/lib/portfolio/projects.ts` (Axial, Aperture, Argus, Point Engine, Chess)
- [ ] Build `HomePage.svelte` — portal with search, categorized links, featured projects
- [ ] Build `ProjectList.svelte` — grid/list of all projects
- [ ] Build `ProjectDetail.svelte` — per-project page with description, stack, media, "Launch Demo"
- [ ] Build `AboutPage.svelte` — bio, skills, contact info
- [ ] Build `ErrorPage.svelte` — IE "page cannot be displayed"
- [ ] "Launch Demo" button opens the project's app in its own OS window

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

### Chess
- [ ] Design chess state interface in `state.svelte.ts`
- [ ] Implement chess logic in `engine.ts` (or evaluate chess.js)
- [ ] AI opponent with adjustable difficulty (evaluate stockfish.js WASM or lighter alternative)
- [ ] Build `ChessBoard2D.svelte` — 2D board with piece rendering
- [ ] Click-to-select, click-to-move interaction
- [ ] Legal move highlighting
- [ ] Check/checkmate/stalemate detection and display
- [ ] Game menu: New Game, Undo, Difficulty selector

### Axial
- [ ] Design Axial state interface
- [ ] Implement 3D Connect-4 rules in `engine.ts`
- [ ] AI opponent (port from existing Axial project or rebuild)
- [ ] Build `AxialBoard2D.svelte` — 2D representation of 3D board
- [ ] Game controls: New Game, Difficulty selector

### Solitaire
- [ ] Implement Klondike solitaire state
- [ ] Build card rendering (Win98 card face/back style)
- [ ] Drag-and-drop card movement
- [ ] Auto-flip tableau cards, auto-complete to foundation
- [ ] Win animation (cascading bouncing cards)
- [ ] Game menu: New Game, Undo
- [ ] Score tracking

### Minesweeper
- [ ] Implement minesweeper grid state
- [ ] Build grid renderer (Win98 style: sunken revealed cells, raised unrevealed)
- [ ] Left-click reveal, right-click flag, middle-click chord
- [ ] Difficulty presets (Beginner 9x9/10, Intermediate 16x16/40, Expert 30x16/99)
- [ ] Timer and mine counter (LED-style digits)
- [ ] Smiley face button (click to reset, changes expression on game events)
- [ ] Game menu: New, Beginner/Intermediate/Expert/Custom

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
