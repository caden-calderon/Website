# Website OS Architecture

## Purpose

Technical map for the Windows 95 desktop OS that serves as the 2D interface of the Chromatic website. Read `plan.md` first for vision and decisions.

## Component Hierarchy

```
+page.svelte (route: /desktop)
└── Desktop.svelte
    ├── Wallpaper layer (CSS background, scene-aware)
    ├── DesktopIcon.svelte (× N, sourced from filesystem Desktop folder)
    ├── Window.svelte (× N, managed by windowManager)
    │   ├── TitleBar (drag handle, title, control buttons)
    │   ├── MenuBar (optional, per-app)
    │   └── Content area (app component rendered here)
    ├── ContextMenu.svelte (right-click, positioned absolutely)
    ├── StartMenu.svelte (anchored to Start button)
    └── Taskbar.svelte
        ├── StartButton
        ├── TaskbarWindowList (one entry per open window)
        └── SystemTray (clock, volume, theme indicator)
```

## CSS Scoping: 98.css and Tailwind Coexistence

The project currently uses Tailwind CSS 4.2 for the existing demo and capture-control routes. The OS desktop uses 98.css. These must not conflict.

### Layout group approach

Use SvelteKit layout groups to give each context its own CSS:

```
src/routes/
  +layout.svelte               ← root layout: minimal, no CSS import
  (main)/
    +layout.svelte             ← imports app.css (Tailwind)
    +page.svelte               ← point engine demo (existing)
    capture-control/
      +page.svelte             ← Kinect operator route (existing)
  (os)/
    +layout.svelte             ← imports 98.css, OS reset styles
    desktop/
      +page.svelte             ← mounts Desktop.svelte
```

The root `+layout.svelte` moves its `import '../app.css'` into the `(main)` group layout. The `(os)` group layout imports 98.css and its own base styles. No CSS bleeds between groups.

This requires a small refactor of the existing route structure (moving `+page.svelte` and `capture-control/` into a `(main)/` group). The routes themselves don't change — layout groups are invisible in URLs.

### OS components use 98.css only

Components under `src/lib/os/` use 98.css class conventions and semantic HTML. No Tailwind utilities. This keeps the Win95 look pure and avoids fighting two CSS frameworks.

Components under `src/lib/portfolio/` (rendered inside the IE browser window) may use a minimal local stylesheet — they're a website-within-a-website and should look like a late-90s web page, not a Tailwind site.

## Viewport and Mobile

### Native pixel rendering

Following the daedalOS approach: render at native device pixels with no CSS scaling. The viewport meta tag locks zoom:

```html
<meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1">
```

On mobile, UI elements (taskbar, icons, windows) are proportionally smaller but remain usable. Win95's 640x480 minimum maps well to modern phone viewports (375px+ wide). The taskbar is 30px, icons are 32x32+label — these are touch-viable sizes on mobile.

Global touch styles:
```css
* {
  -webkit-tap-highlight-color: transparent;
  -webkit-touch-callout: none;
  user-select: none;
}
```

### Touch input

Use pointer events throughout (unified mouse/touch). Specific touch behaviors:

- **Tap** → click (native via pointer events)
- **Double-tap** → double-click (custom, 500ms window, cancel if pointer moves >12px)
- **Long-press** → right-click / context menu (500ms hold, cancel on move)
- **Pointer drag on title bar** → window move (works via pointer capture)
- **Pointer drag on resize handle** → window resize (works via pointer capture)
- **Scroll in window content** → native touch scrolling on the content area (not the window chrome)

Implement touch behaviors as reusable Svelte actions (`use:longpress`, `use:doubleclick`) so they're composable across components.

### Window sizing on small screens

Default window sizes may exceed mobile viewport. The window manager clamps:
- Max width: `window.innerWidth`
- Max height: `window.innerHeight - TASKBAR_HEIGHT`
- New windows on small screens open maximized by default (below a viewport width threshold, e.g., 640px)

## Virtual Filesystem

### Why a filesystem

Desktop icons, Start menu items, File Explorer contents, and project data all describe the same underlying tree. A virtual filesystem unifies them:

- Desktop icons = shortcut files in `C:\Windows\Desktop\`
- Start menu items = shortcut files in `C:\Windows\Start Menu\Programs\`
- Projects = folders in `C:\My Projects\`
- User files = files in `C:\My Documents\`
- File Explorer browses the tree directly
- Files have type associations (`.txt` → Notepad, `.exe` → app launch)

### OverlayFS pattern

Borrowed from daedalOS's architecture. Two layers:

1. **Base layer** (read-only): The default filesystem tree defined in code. This is the "OS image" — it contains the initial desktop shortcuts, Start menu structure, project folders, and system files. Defined as a static TypeScript object.

2. **User layer** (read-write): Modifications persisted to IndexedDB. Renames, deletions, new files, moved items. On load, the user layer patches over the base layer.

On "reset" or "reinstall", the user layer is cleared and the base layer is restored.

### Data model

```typescript
interface FSEntry {
  name: string;
  kind: 'file' | 'folder' | 'shortcut';
  icon?: string;
  readOnly?: boolean;
  createdAt: number;
  modifiedAt: number;
}

interface FSFile extends FSEntry {
  kind: 'file';
  extension: string;
  size: number;
  content?: string;             // text content for .txt files, etc.
  appId?: AppId;                // for .exe files, the app to launch
}

interface FSFolder extends FSEntry {
  kind: 'folder';
  children: string[];           // child entry names (not full paths)
}

interface FSShortcut extends FSEntry {
  kind: 'shortcut';
  targetPath: string;           // path to the target file/folder
  targetAppId?: AppId;          // for app shortcuts, the app to launch
  targetProps?: Record<string, unknown>;
}
```

### Operations

```typescript
interface FileSystem {
  resolve(path: string): FSEntry | null;
  list(folderPath: string): FSEntry[];
  read(filePath: string): string | null;
  write(filePath: string, content: string): void;
  create(parentPath: string, entry: FSEntry): void;
  rename(path: string, newName: string): void;
  remove(path: string): void;
  move(fromPath: string, toPath: string): void;
  exists(path: string): boolean;
}
```

Paths use backslash Windows-style: `C:\My Documents\notes.txt`. Case-insensitive matching (Win95 was case-preserving but case-insensitive).

### Default filesystem tree

```
C:\
├── Windows\
│   ├── Desktop\
│   │   ├── My Projects.lnk       → C:\My Projects
│   │   ├── Internet Explorer.lnk → internet-explorer app
│   │   ├── Chess.lnk             → chess app
│   │   ├── Axial.lnk             → axial app
│   │   ├── Point Engine.lnk      → point-engine app
│   │   └── Recycle Bin.lnk       → recycle-bin (special)
│   ├── Start Menu\
│   │   └── Programs\
│   │       ├── Accessories\
│   │       │   ├── Calculator.lnk
│   │       │   └── Notepad.lnk
│   │       ├── Games\
│   │       │   ├── Chess.lnk
│   │       │   ├── Axial.lnk
│   │       │   ├── Solitaire.lnk
│   │       │   └── Minesweeper.lnk
│   │       ├── Internet Explorer.lnk
│   │       ├── My Projects.lnk
│   │       └── Point Engine.lnk
│   └── Media\
│       └── (system sounds)
├── My Documents\
│   └── (user files — empty initially)
├── My Projects\
│   ├── Axial\
│   │   ├── README.txt
│   │   └── Axial.exe              → opens Axial app
│   ├── Aperture\
│   │   └── README.txt
│   ├── Argus\
│   │   └── README.txt
│   └── Point Engine\
│       └── README.txt
└── Games\
    ├── Solitaire.exe
    ├── Minesweeper.exe
    └── (save files)
```

### File type associations

```typescript
const FILE_ASSOCIATIONS: Record<string, AppId> = {
  '.txt': 'notepad',
  '.log': 'notepad',
  '.md':  'notepad',
  '.bmp': 'paint',             // future
  '.exe': 'self',              // reads appId from the file entry
  '.lnk': 'self',              // follows shortcut target
};
```

Double-clicking a file in File Explorer or on the Desktop resolves the association and opens the appropriate app with the file path as a prop.

## Session Persistence

### What is persisted

```typescript
interface SessionData {
  // Boot state
  hasBooted: boolean;                  // false = show boot sequence, true = show sleep/wake

  // Window state
  openWindows: WindowDef[];            // which windows are open and their positions/sizes
  focusedWindowId: string | null;

  // Desktop state
  iconPositions: Record<string, { col: number; row: number }>;

  // Theme state
  activeThemeId: string;
  wallpaperOverride?: WallpaperDef;    // if user changed wallpaper independently of theme

  // App state
  runHistory: string[];                // Run dialog history
  recentFiles: string[];               // recently opened files

  // Scene state
  currentScene: SceneId;
}
```

### Storage

Session data is serialized to JSON and stored in IndexedDB. The virtual filesystem's user layer is also in IndexedDB. Both use the same database with different object stores.

### Save/restore lifecycle

- **Save**: A Svelte `$effect` watches derived session state. On change, debounce (500ms via `requestIdleCallback` or `setTimeout`) and write to IndexedDB.
- **Restore**: On mount, read session from IndexedDB. If found, hydrate all state and skip the boot sequence. If not found (first visit), use defaults and show the boot sequence.
- **Reset**: Clear IndexedDB stores, reload. The base filesystem and default session take over.

### Boot / sleep lifecycle

**First visit** (`hasBooted === false`):
1. BIOS POST text (brief, skippable with click/keypress)
2. Windows 95 loading screen with progress bar
3. Desktop appears
4. Startup sound plays
5. `hasBooted` is set to `true` in session

**Return visit** (`hasBooted === true`):
1. Brief sleep/wake animation (screen brightens from black)
2. Desktop appears with previous state restored (open windows, positions, wallpaper)
3. No startup sound on wake

**Shut Down** (from Start menu):
1. "It is now safe to turn off your computer" screen (classic Win95)
2. Or smooth transition back to 3D scene
3. Session state is saved before shutdown

## State Architecture

### windowManager.svelte.ts

Central state for all window lifecycle and layout. Svelte 5 runes.

```typescript
interface WindowDef {
  id: string;
  appId: AppId;
  title: string;
  icon: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  minSize?: { width: number; height: number };
  minimized: boolean;
  maximized: boolean;
  zIndex: number;
  props?: Record<string, unknown>;    // app-specific props (e.g., file path)
}
```

Core operations:
- `open(appId, props?)` → creates window with default or restored size/position
- `close(windowId)` → removes from state, triggers save
- `focus(windowId)` → assigns next z-index counter value
- `minimize(windowId)` → hides window, keeps in taskbar
- `maximize(windowId)` → stores pre-max size/position, fills desktop area
- `restore(windowId)` → returns to pre-maximize size/position
- `updatePosition(windowId, x, y)` → clamps to viewport bounds
- `updateSize(windowId, w, h)` → enforces minSize, clamps to viewport

Z-index strategy: monotonic counter. `focus()` assigns `++counter`. Higher value = on top.

Position strategy: new windows cascade from (30, 30), offset +30px each. Wrap at viewport edge. On mobile (viewport < 640px width), new windows open maximized.

### themeManager.svelte.ts

Desktop theme state. Drives wallpaper, sounds, and accent colors.

```typescript
interface DesktopTheme {
  id: string;
  name: string;
  wallpaper: WallpaperDef;
  soundScheme: SoundSchemeDef;
  accentColors?: AccentColors;
}

interface WallpaperDef {
  type: 'solid' | 'tiled' | 'centered' | 'stretched';
  color?: string;
  src?: string;
}

interface SoundSchemeDef {
  windowOpen?: string;
  windowClose?: string;
  error?: string;
  notification?: string;
  startup?: string;
  shutdown?: string;
  menuOpen?: string;
  minimize?: string;
  maximize?: string;
}
```

Default theme: `{ wallpaper: { type: 'solid', color: '#008080' } }`.

Scene-to-theme mapping is declarative. Changing the scene selects a new theme.

### sceneStore.svelte.ts

Shared scene state consumed by both 3D view and desktop theme system.

```typescript
type SceneId = 'default' | 'aquarium' | 'train';

// Changing scene updates both 3D environment and desktop theme.
// The mapping is declarative, not hard-coded into either view.
```

### gameStore.svelte.ts

View-agnostic game state. Both 3D and 2D renderers consume the same store.

```typescript
interface GameStore {
  activeGame: GameId | null;
  chess: ChessState;
  axial: AxialState;
}
```

Game logic lives in pure functions/classes that operate on state. Renderers are separate — `ChessBoard2D.svelte` for OS windows, `ChessBoard3D.svelte` for the Threlte scene.

## App Registry

Apps are registered in code. The filesystem references them via shortcuts and `.exe` entries.

```typescript
interface AppDef {
  id: AppId;
  label: string;
  icon: string;
  defaultSize: { width: number; height: number };
  minSize?: { width: number; height: number };
  component: () => Promise<{ default: Component }>;  // lazy import
  singleton?: boolean;
}
```

Note: `component` is a lazy import function, not an eager import. Apps are loaded when first opened, not at boot. This keeps initial load fast.

Initial app registry:

| App ID | Label | Singleton |
|--------|-------|-----------|
| `internet-explorer` | Internet Explorer | No |
| `file-explorer` | Explorer | No |
| `notepad` | Notepad | No |
| `calculator` | Calculator | Yes |
| `run-dialog` | Run | Yes |
| `chess` | Chess | Yes |
| `axial` | Axial | Yes |
| `solitaire` | Solitaire | No |
| `minesweeper` | Minesweeper | No |
| `point-engine` | Point Engine | Yes |

Desktop icons, Start menu items, and file associations are defined in the filesystem, not the app registry. The app registry is the code-side lookup; the filesystem is the user-facing structure.

## Window Component Internals

### Drag behavior

Pointer events on the title bar. On `pointerdown`, call `setPointerCapture` and record the offset from the window's top-left. On `pointermove`, update window position (current pointer minus offset). On `pointerup`, release capture. No external drag library needed.

Constraints: clamp so at least 50px of the title bar remains visible on any viewport edge. Maximized windows cannot be dragged.

### Resize behavior

Eight invisible resize handles (6-8px zones) on edges and corners. Each sets the appropriate CSS cursor and tracks drag deltas to update window size and position.

Constraints: enforce `minSize`. Clamp to viewport. Maximized windows cannot be resized.

### Title bar control buttons

Three buttons (98.css provides styling):
- **Minimize** `_` → sets `minimized: true`
- **Maximize / Restore** `□` / `⧉` → toggles maximize state
- **Close** `×` → calls `windowManager.close()`

### Content area

Renders the app component lazily. The app receives its window ID, window dimensions, and any app-specific props. The app fills the available space and does not know about window chrome.

## IE4 Browser Internals

### Layout

```
┌─────────────────────────────────────────────────────┐
│ Menu Bar: File  Edit  View  Go  Favorites  Help     │
├─────────────────────────────────────────────────────┤
│ Toolbar: [←][→][⊘][↻][🏠][🔍][★][📂]    [throbber]│
├─────────────────────────────────────────────────────┤
│ Address: [📄 http://chromatic.dev/               ▾] │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Content Area                                       │
│  (portfolio pages / error pages / homepage)         │
│                                                     │
├─────────────────────────────────────────────────────┤
│ Status: Done                              [🌐 zone] │
└─────────────────────────────────────────────────────┘
```

### Internal routing

```typescript
interface BrowserState {
  url: string;
  history: string[];
  forwardHistory: string[];
  loading: boolean;
  title: string;
}
```

Known routes (`chromatic.dev/projects`, `chromatic.dev/about`, etc.) render portfolio content. Unknown routes render the IE "This page cannot be displayed" error page. The address bar is editable — type a URL and press Enter to navigate.

The throbber animates during a brief simulated loading delay (200-500ms), then content appears. Status bar shows "Opening page..." then "Done".

### Content pages

Standard HTML rendered inside the browser chrome. Styled like a late-90s web page (table layouts, web-safe fonts, simple borders) for authenticity, or a clean modern style — this is a design decision we can make per-page.

- **Homepage** — portal-style landing (search box, categorized links, featured projects)
- **Project list** — grid of all projects with icons and descriptions
- **Project detail** — per-project page with description, stack, screenshots, "Launch Demo" button
- **About** — bio, skills, contact
- **Error page** — IE "page cannot be displayed" for unknown URLs

## Desktop Icons

Sourced from `C:\Windows\Desktop\` in the virtual filesystem. Each shortcut file in that folder becomes a desktop icon.

Grid: ~75px spacing, columns fill top-to-bottom then left-to-right. Positions persist in session data and can be rearranged by dragging.

Each icon: 32x32 image + label below (white text, black 1px shadow). Single-click selects (blue highlight). Double-click follows the shortcut (opens app or folder).

## Start Menu

Sourced from `C:\Windows\Start Menu\` in the virtual filesystem. The folder structure maps directly to the menu hierarchy.

```
┌───────────────────────────┐
│ Windows 95    [user icon] │ ← vertical banner
├───────────────────────────┤
│ Programs              ▸   │ → reads from Start Menu\Programs\
│ Settings              ▸   │ → Themes, Display Properties
│ Find                  ▸   │ → project search
│ Help                      │
│ Run...                    │ → opens Run dialog
├───────────────────────────┤
│ Shut Down...              │ → 3D transition / shut down dialog
└───────────────────────────┘
```

## Taskbar

Fixed bottom, 30px tall.

```
┌──────────────────────────────────────────────────────────┐
│ [Start] │ [IE] [Chess] [Notepad]         │ 🔊 3:42 PM  │
└──────────────────────────────────────────────────────────┘
```

Click behavior matches real Win95: focused window → minimize; minimized/background → focus.

## Context Menus

Right-click surfaces:
- **Desktop** → Arrange Icons, Refresh, New ▸, Properties (Display)
- **Desktop icon** → Open, Rename, Delete, Properties
- **Taskbar** → Cascade Windows, Tile Windows, Minimize All, Properties
- **Inside apps** → app-specific menus

## Sounds

| Event | Sound | Phase |
|-------|-------|-------|
| Window open | Short rising tone | 1 |
| Window close | Short falling tone | 1 |
| Error dialog | Classic error chord | 1 |
| Minimize | Subtle click | 2 |
| Maximize | Subtle snap | 2 |
| Menu open | Soft click | 2 |
| Startup | Chime | 4 |
| Shutdown | Descending tone | 4 |

Source: original creations or CC-licensed retro UI sounds. Do not use copyrighted Microsoft audio.

## File Layout

```
src/routes/
  +layout.svelte                       ← root: minimal, no CSS
  (main)/
    +layout.svelte                     ← imports Tailwind (app.css)
    +page.svelte                       ← point engine demo (existing)
    capture-control/+page.svelte       ← Kinect operator (existing)
  (os)/
    +layout.svelte                     ← imports 98.css + OS base styles
    desktop/+page.svelte               ← mounts Desktop.svelte

src/lib/os/
  Desktop.svelte
  Window.svelte
  Taskbar.svelte
  StartMenu.svelte
  DesktopIcon.svelte
  ContextMenu.svelte
  windowManager.svelte.ts
  themeManager.svelte.ts
  appRegistry.ts
  filesystem.ts                        ← virtual filesystem implementation
  filesystem.data.ts                   ← default filesystem tree (base layer)
  session.ts                           ← session persistence (IndexedDB)
  sounds.ts
  types.ts

src/lib/os/apps/
  InternetExplorer.svelte
  FileExplorer.svelte
  Notepad.svelte
  Calculator.svelte
  RunDialog.svelte
  Properties.svelte                    ← file/system properties dialog

src/lib/os/boot/
  BootSequence.svelte                  ← BIOS POST + Win95 loading screen
  SleepWake.svelte                     ← return-visit wake animation

src/lib/games/
  chess/
    state.svelte.ts
    engine.ts
    ChessBoard2D.svelte
  axial/
    state.svelte.ts
    engine.ts
    AxialBoard2D.svelte
  solitaire/
    state.svelte.ts
    Solitaire.svelte
  minesweeper/
    state.svelte.ts
    Minesweeper.svelte

src/lib/portfolio/
  projects.ts
  types.ts
  ProjectList.svelte
  ProjectDetail.svelte
  HomePage.svelte
  AboutPage.svelte
  ErrorPage.svelte

src/lib/stores/
  sceneStore.svelte.ts
  gameStore.svelte.ts

static/os-assets/
  icons/
  sounds/
  wallpapers/
  cursors/
```

## Interaction with Existing Code

### What changes
- Root `+layout.svelte` drops its CSS import (moved to group layout)
- Existing `+page.svelte` and `capture-control/` move into a `(main)/` layout group
- Routes are unchanged — layout groups are URL-invisible
- Install `98.css` npm package

### What we add
- `src/lib/os/` — the OS shell
- `src/lib/games/` — game logic and renderers
- `src/lib/portfolio/` — content data and pages
- `src/lib/stores/` — shared state
- `src/routes/(os)/` — OS route with its own layout
- `static/os-assets/` — icons, sounds, wallpapers

### What we do NOT touch
- `src/lib/engine/` — point cloud engine
- `src/lib/demo/` — point engine demo (later becomes an OS app)
- `src/lib/scene/` — 3D scene components
- `src/lib/capture/` — Kinect capture control
- `python/` — Kinect pipeline
- `cpp/` — native helper

## Recommended Reading Order for a Fresh Agent

1. `dev/active/website-os/plan.md`
2. `dev/active/website-os/architecture.md` (this file)
3. `dev/active/website-os/tasks.md`
4. `src/lib/content/types.ts` (existing content type definitions)
5. `ChromaticUpdates.md` (implementation patterns for effects and games)
