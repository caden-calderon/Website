# Website OS Tasks

## Phase 0: Project Setup

### CSS Scoping
- [ ] Restructure routes into layout groups: `(main)/` for existing routes, `(os)/` for desktop
- [ ] Move `import '../app.css'` from root layout to `(main)/+layout.svelte`
- [ ] Create `(os)/+layout.svelte` that imports 98.css and OS base styles
- [ ] Verify existing routes (`/`, `/capture-control`) still work unchanged
- [ ] Verify `pnpm check` and `pnpm test` pass after restructure

### Dependencies
- [ ] Install `98.css`
- [ ] Create `static/os-assets/` directory structure (icons, sounds, wallpapers, cursors)
- [ ] Create `src/lib/os/types.ts` with core type definitions

## Phase 1: OS Shell

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
- [ ] Implement `windowManager.svelte.ts` with rune-based state
- [ ] open, close, focus, minimize, maximize, restore operations
- [ ] Z-index stacking with monotonic counter
- [ ] Cascading position for new windows (30px offset, wrap at viewport edge)
- [ ] Mobile-aware: open maximized on small viewports (<640px width)
- [ ] Clamp windows to viewport bounds
- [ ] Session integration: save/restore window state

### App Registry
- [ ] Implement `appRegistry.ts` with lazy component imports
- [ ] Register initial apps: IE, File Explorer, Notepad, Calculator, Run Dialog
- [ ] Singleton enforcement (only one Calculator, etc.)
- [ ] App launch from filesystem shortcut resolution

### Window Component
- [ ] Build `Window.svelte` with 98.css title bar chrome
- [ ] Title bar drag-to-move with `setPointerCapture`
- [ ] Edge/corner resize handles (8 zones) with pointer capture
- [ ] Minimize/maximize/restore/close button handlers
- [ ] Enforce minSize constraints and viewport clamping
- [ ] Lazy-render app component in content area
- [ ] Pass window ID, dimensions, and props to app component
- [ ] Double-click title bar to maximize/restore (Win95 behavior)

### Desktop
- [ ] Build `Desktop.svelte` with wallpaper layer
- [ ] Source desktop icons from filesystem (`C:\Windows\Desktop\`)
- [ ] Build `DesktopIcon.svelte` with select/double-click behavior
- [ ] Icon grid layout (columns top-to-bottom, left-to-right, ~75px spacing)
- [ ] White text labels with 1px black shadow
- [ ] Click desktop to deselect icons
- [ ] Drag icons to reposition (persist positions in session)
- [ ] Default wallpaper: solid teal `#008080`

### Taskbar
- [ ] Build `Taskbar.svelte` fixed to bottom, 30px tall
- [ ] Start button with Win95 logo
- [ ] Window list entries (one per open window, icon + truncated title)
- [ ] Click entry: focused → minimize; minimized/background → focus
- [ ] System tray: live clock (12h format with AM/PM)
- [ ] Raised 3D border styling (98.css)

### Start Menu
- [ ] Build `StartMenu.svelte` anchored to Start button, opens upward
- [ ] Vertical "Windows 95" banner on left edge
- [ ] Source Programs submenu from filesystem (`C:\Windows\Start Menu\Programs\`)
- [ ] Nested submenu support (hover to expand)
- [ ] Settings entry (placeholder)
- [ ] Find entry (placeholder)
- [ ] Run... entry (opens Run dialog)
- [ ] Shut Down... entry (placeholder for 3D transition)
- [ ] Click-outside-to-close behavior
- [ ] Keyboard: Escape to close

### Context Menus
- [ ] Build `ContextMenu.svelte` with absolute positioning
- [ ] Desktop right-click: Arrange Icons, Refresh, New ▸, Properties
- [ ] Desktop icon right-click: Open, Rename, Delete, Properties
- [ ] Taskbar right-click: Cascade Windows, Tile Windows, Minimize All
- [ ] Dismiss on click-outside or Escape
- [ ] Nested submenu support

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
- [ ] Disable default touch behaviors (tap highlight, callout, text selection)

### Keyboard
- [ ] Alt+F4 closes focused window
- [ ] Escape closes Start menu / context menus / dialogs
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
- [ ] Build `Calculator.svelte` matching Win95 layout
- [ ] Standard mode: digit buttons, operations, memory (MC, MR, MS, M+)
- [ ] Working calculation logic (standard arithmetic, proper order of operations)
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
- [ ] Build `RunDialog.svelte` matching Win95 layout
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
- [ ] AI can suggest lowering difficulty (ties into AI character system later)

### Axial
- [ ] Design Axial state interface
- [ ] Implement 3D Connect-4 rules in `engine.ts`
- [ ] AI opponent (port from existing Axial project or rebuild)
- [ ] Build `AxialBoard2D.svelte` — 2D representation of 3D board
- [ ] Game controls: New Game, Difficulty selector

### Solitaire
- [ ] Implement Klondike solitaire state
- [ ] Build card rendering (Win95 card face/back style)
- [ ] Drag-and-drop card movement
- [ ] Auto-flip tableau cards, auto-complete to foundation
- [ ] Win animation (cascading bouncing cards — iconic)
- [ ] Game menu: New Game, Undo
- [ ] Score tracking

### Minesweeper
- [ ] Implement minesweeper grid state
- [ ] Build grid renderer (Win95 style: sunken revealed cells, raised unrevealed)
- [ ] Left-click reveal, right-click flag, middle-click chord
- [ ] Difficulty presets (Beginner 9x9/10, Intermediate 16x16/40, Expert 30x16/99)
- [ ] Timer and mine counter (LED-style digits)
- [ ] Smiley face button (click to reset, changes expression on game events)
- [ ] Game menu: New, Beginner/Intermediate/Expert/Custom

## Phase 4: Theme System

- [ ] Implement `themeManager.svelte.ts` with theme data model
- [ ] Define theme interface (wallpaper, sound scheme, accent colors)
- [ ] Build default Win95 theme (teal `#008080`, standard sounds)
- [ ] Build at least one scene-linked theme (e.g., aquarium → underwater wallpaper)
- [ ] Wire scene changes to theme switching (sceneStore → themeManager)
- [ ] Build Display Properties dialog (accessible from desktop right-click → Properties)
- [ ] Wallpaper tab: solid color picker, image selection, tile/center/stretch
- [ ] Appearance tab: theme selection (Plus!-style theme picker)
- [ ] Session persistence for theme/wallpaper changes

## Phase 5: Polish

### Boot Sequence
- [ ] Build `BootSequence.svelte` — BIOS POST text → Win95 loading bar
- [ ] Skippable on click/keypress
- [ ] Startup sound on completion
- [ ] Only shown on first visit

### Sleep/Wake
- [ ] Build `SleepWake.svelte` — screen brightens from black
- [ ] Shown on return visits (session exists)
- [ ] Restore previous desktop state

### Additional Apps
- [ ] Paint (canvas drawing tool — stretch goal)
- [ ] Media Player (audio player chrome for ambient music)
- [ ] Properties dialog for files (Name, Type, Size, Location, dates)

### Additional Authenticity
- [ ] Win95 cursors (default arrow, hand for links, hourglass for loading, resize cursors)
- [ ] Solitaire win animation (cascading bouncing cards)
- [ ] Screen saver (after idle timeout — starfield, 3D pipes, or maze)
- [ ] Shut Down dialog with options (Shut down, Restart, Sleep)
- [ ] "It is now safe to turn off your computer" screen
- [ ] My Computer icon showing fake system info

### More Themes
- [ ] Dangerous Creatures theme
- [ ] Inside your Computer theme
- [ ] Additional scene-linked themes as 3D scenes are built

## Integration (Depends on 3D Scene Work)

- [ ] Laptop prop in 3D scene that triggers transition
- [ ] Camera zoom animation toward laptop screen
- [ ] Crossfade from 3D canvas to OS desktop
- [ ] Reverse transition: Shut Down → pull back to 3D
- [ ] Ambient audio persistence across transition
- [ ] Wire shared game state between 3D and 2D renderers
- [ ] Wire scene switching between 3D environment and desktop theme
