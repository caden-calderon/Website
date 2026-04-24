import { getAppDef } from './appRegistry.js';
import {
	CASCADE_OFFSET,
	MIN_VISIBLE_TITLE_BAR,
	SMALL_VIEWPORT_THRESHOLD,
	TASKBAR_HEIGHT,
	type AppId,
	type Position,
	type Size,
	type TaskbarEntry,
	type WindowState,
} from './types.js';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let windows = $state<WindowState[]>([]);
let zCounter = $state(0);
let cascadeIndex = $state(0);

// ---------------------------------------------------------------------------
// Derived
// ---------------------------------------------------------------------------

/** The currently focused (top-most, non-minimized) window, if any. */
const focusedWindow = $derived.by(() => {
	let top: WindowState | null = null;
	for (const w of windows) {
		if (!w.minimized && (top === null || w.zIndex > top.zIndex)) {
			top = w;
		}
	}
	return top;
});

/** Entries for the taskbar, one per open window. */
const taskbarEntries: TaskbarEntry[] = $derived(
	windows.map((w) => ({
		windowId: w.id,
		title: w.title,
		icon: w.icon,
		focused: focusedWindow?.id === w.id,
		minimized: w.minimized,
	})),
);

// ---------------------------------------------------------------------------
// Viewport helpers
// ---------------------------------------------------------------------------

function viewportWidth(): number {
	return typeof window !== 'undefined' ? window.innerWidth : 800;
}

function viewportHeight(): number {
	return typeof window !== 'undefined' ? window.innerHeight : 600;
}

function desktopHeight(): number {
	return viewportHeight() - TASKBAR_HEIGHT;
}

function isSmallViewport(): boolean {
	return viewportWidth() < SMALL_VIEWPORT_THRESHOLD;
}

// ---------------------------------------------------------------------------
// Position / size helpers
// ---------------------------------------------------------------------------

function nextCascadePosition(size: Size): Position {
	const offset = (cascadeIndex % 8) * CASCADE_OFFSET;

	cascadeIndex++;
	return clampPosition(
		{
			x: Math.round((viewportWidth() - size.width) / 2 + offset),
			y: Math.round((desktopHeight() - size.height) / 2 + offset),
		},
		size,
	);
}

function clampPosition(pos: Position, size: Size): Position {
	return {
		x: Math.max(-(size.width - MIN_VISIBLE_TITLE_BAR), Math.min(pos.x, viewportWidth() - MIN_VISIBLE_TITLE_BAR)),
		y: Math.max(0, Math.min(pos.y, desktopHeight() - MIN_VISIBLE_TITLE_BAR)),
	};
}

function clampSize(size: Size, minSize: Size): Size {
	return {
		width: Math.max(minSize.width, Math.min(size.width, viewportWidth())),
		height: Math.max(minSize.height, Math.min(size.height, desktopHeight())),
	};
}

function nextZIndex(): number {
	return ++zCounter;
}

let idCounter = 0;
function nextWindowId(): string {
	return `win-${++idCounter}`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const windowManager = {
	// -- Reactive getters (use these in components) --

	get windows() {
		return windows;
	},

	get focusedWindow() {
		return focusedWindow;
	},

	get taskbarEntries() {
		return taskbarEntries;
	},

	// -- Actions --

	/** Open a new window for the given app. Returns the new window's ID. */
	open(appId: AppId, props: Record<string, unknown> = {}): string | null {
		const def = getAppDef(appId);
		if (!def) return null;

		// Enforce singleton: if already open, just focus it
		if (def.singleton) {
			const existing = windows.find((w) => w.appId === appId);
			if (existing) {
				this.focus(existing.id);
				return existing.id;
			}
		}

		const size = isSmallViewport()
			? { width: viewportWidth(), height: desktopHeight() }
			: clampSize(def.defaultSize, def.minSize);

		const maximized = isSmallViewport();
		const position = maximized
			? { x: 0, y: 0 }
			: nextCascadePosition(size);

		const win: WindowState = {
			id: nextWindowId(),
			appId,
			title: def.label,
			icon: def.icon,
			position,
			size,
			minSize: def.minSize,
			minimized: false,
			maximized,
			preMaximize: null,
			zIndex: nextZIndex(),
			props,
		};

		windows = [...windows, win];
		return win.id;
	},

	/** Close and remove a window. */
	close(windowId: string): void {
		windows = windows.filter((w) => w.id !== windowId);
	},

	/** Bring a window to the front. Un-minimizes it if minimized. */
	focus(windowId: string): void {
		const win = windows.find((w) => w.id === windowId);
		if (!win) return;

		win.zIndex = nextZIndex();
		if (win.minimized) win.minimized = false;

		// Trigger reactivity by reassigning
		windows = [...windows];
	},

	/** Minimize a window (hide it, keep in taskbar). */
	minimize(windowId: string): void {
		const win = windows.find((w) => w.id === windowId);
		if (!win) return;
		win.minimized = true;
		windows = [...windows];
	},

	/** Maximize a window to fill the desktop area. */
	maximize(windowId: string): void {
		const win = windows.find((w) => w.id === windowId);
		if (!win || win.maximized) return;

		win.preMaximize = { position: { ...win.position }, size: { ...win.size } };
		win.position = { x: 0, y: 0 };
		win.size = { width: viewportWidth(), height: desktopHeight() };
		win.maximized = true;
		win.zIndex = nextZIndex();
		windows = [...windows];
	},

	/** Restore a maximized window to its previous size/position. */
	restore(windowId: string): void {
		const win = windows.find((w) => w.id === windowId);
		if (!win || !win.maximized || !win.preMaximize) return;

		win.position = win.preMaximize.position;
		win.size = win.preMaximize.size;
		win.maximized = false;
		win.preMaximize = null;
		windows = [...windows];
	},

	/** Toggle between maximize and restore. */
	toggleMaximize(windowId: string): void {
		const win = windows.find((w) => w.id === windowId);
		if (!win) return;
		if (win.maximized) this.restore(windowId);
		else this.maximize(windowId);
	},

	/** Taskbar click behavior: focused → minimize; otherwise → focus. */
	taskbarClick(windowId: string): void {
		const win = windows.find((w) => w.id === windowId);
		if (!win) return;
		if (focusedWindow?.id === windowId && !win.minimized) {
			this.minimize(windowId);
		} else {
			this.focus(windowId);
		}
	},

	/** Update a window's position (e.g., during drag). */
	updatePosition(windowId: string, x: number, y: number): void {
		const win = windows.find((w) => w.id === windowId);
		if (!win || win.maximized) return;
		const clamped = clampPosition({ x, y }, win.size);
		win.position = clamped;
		// Intentionally no reassignment — fine-grained drag updates are frequent.
		// Components reading `win.position` directly will still see the mutation.
	},

	/** Update a window's size (e.g., during resize). */
	updateSize(
		windowId: string,
		width: number,
		height: number,
		anchorX?: number,
		anchorY?: number,
	): void {
		const win = windows.find((w) => w.id === windowId);
		if (!win || win.maximized) return;

		const newSize = clampSize({ width, height }, win.minSize);
		const nextPosition = clampPosition(
			{
				x: anchorX ?? win.position.x,
				y: anchorY ?? win.position.y,
			},
			newSize,
		);

		win.position = nextPosition;
		win.size = newSize;
	},

	/** Update a window's title bar text (also updates the taskbar entry). */
	updateTitle(windowId: string, title: string): void {
		const win = windows.find((w) => w.id === windowId);
		if (!win || win.title === title) return;
		win.title = title;
		windows = [...windows];
	},

	/** Get a window by ID. */
	get(windowId: string): WindowState | undefined {
		return windows.find((w) => w.id === windowId);
	},
};
