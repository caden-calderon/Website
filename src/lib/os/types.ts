import type { Component } from 'svelte';

// ---------------------------------------------------------------------------
// App definitions
// ---------------------------------------------------------------------------

export type AppId =
	| 'internet-explorer'
	| 'file-explorer'
	| 'notepad'
	| 'calculator'
	| 'run-dialog'
	| 'chess'
	| 'axial'
	| 'solitaire'
	| 'minesweeper'
	| 'point-engine';

/** Metadata for a launchable application. */
export interface AppDef {
	id: AppId;
	label: string;
	icon: string;
	defaultSize: Size;
	minSize: Size;
	/** Lazy loader — apps are imported on first open, not at boot. */
	component: () => Promise<{ default: Component }>;
	/** When true, only one instance of this app can be open at a time. */
	singleton?: boolean;
}

// ---------------------------------------------------------------------------
// Window state
// ---------------------------------------------------------------------------

export interface Position {
	x: number;
	y: number;
}

export interface Size {
	width: number;
	height: number;
}

/** Runtime state for a single open window. */
export interface WindowState {
	id: string;
	appId: AppId;
	title: string;
	icon: string;
	position: Position;
	size: Size;
	minSize: Size;
	minimized: boolean;
	maximized: boolean;
	/** Pre-maximize position/size for restore. */
	preMaximize: { position: Position; size: Size } | null;
	zIndex: number;
	/** Arbitrary props forwarded to the app component. */
	props: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Taskbar
// ---------------------------------------------------------------------------

/** Minimal window info shown in the taskbar. */
export interface TaskbarEntry {
	windowId: string;
	title: string;
	icon: string;
	focused: boolean;
	minimized: boolean;
}

// ---------------------------------------------------------------------------
// Desktop theme
// ---------------------------------------------------------------------------

export interface WallpaperDef {
	type: 'solid' | 'tiled' | 'centered' | 'stretched';
	color?: string;
	src?: string;
}

export interface SoundSchemeDef {
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

export interface DesktopTheme {
	id: string;
	name: string;
	wallpaper: WallpaperDef;
	sounds: SoundSchemeDef;
}

// ---------------------------------------------------------------------------
// Context menu
// ---------------------------------------------------------------------------

export interface ContextMenuItem {
	label: string;
	icon?: string;
	disabled?: boolean;
	separator?: boolean;
	action?: () => void;
	children?: ContextMenuItem[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const TASKBAR_HEIGHT = 32;
export const ICON_GRID_SIZE = 75;
export const CASCADE_OFFSET = 30;
export const MIN_VISIBLE_TITLE_BAR = 50;
export const SMALL_VIEWPORT_THRESHOLD = 640;
