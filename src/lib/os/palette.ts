/**
 * Windows 98 "Windows Standard" system color palette.
 *
 * Exact RGB values from the actual Windows Default.theme binary.
 * These are the ground truth — use these everywhere in the OS shell.
 *
 * IMPORTANT: 98.css ships with slightly wrong defaults:
 *   --button-face: #dfdfdf  → should be #c0c0c0
 *   --text-color: #222222   → should be #000000
 *   --window-frame: #0a0a0a → should be #000000
 * We override these in the (os) layout.
 */
export const WIN98 = {
	// ── Desktop ──
	desktop: '#008080',

	// ── Title bar (gradient left → right) ──
	activeTitleBar: '#000080',
	activeTitleBarEnd: '#1084d0',
	activeTitleText: '#ffffff',
	inactiveTitleBar: '#808080',
	inactiveTitleBarEnd: '#b5b5b5',
	inactiveTitleText: '#c0c0c0',

	// ── 3D surface / button colors ──
	buttonFace: '#c0c0c0',
	buttonHighlight: '#ffffff',
	buttonLight: '#c0c0c0',
	buttonShadow: '#808080',
	buttonDarkShadow: '#000000',
	buttonText: '#000000',

	// ── Window ──
	window: '#ffffff',
	windowText: '#000000',
	windowFrame: '#000000',

	// ── Menu ──
	menu: '#c0c0c0',
	menuText: '#000000',

	// ── Selection / highlight ──
	highlight: '#000080',
	highlightText: '#ffffff',

	// ── Disabled ──
	grayText: '#808080',

	// ── Tooltip ──
	tooltipBg: '#ffffe1',
	tooltipText: '#000000',

	// ── Other ──
	scrollbar: '#c0c0c0',
	appWorkspace: '#808080',
	activeBorder: '#c0c0c0',
	inactiveBorder: '#c0c0c0',
	hotTracking: '#000080',
} as const;

/**
 * Win98 font specifications.
 *
 * MS Sans Serif is a bitmap font. 98.css ships "Pixelated MS Sans Serif"
 * as a WOFF2 web font converted from the real bitmap. Use it with
 * -webkit-font-smoothing: none for pixel-perfect rendering.
 */
export const WIN98_FONTS = {
	/** System UI font — menus, status bars, message boxes */
	ui: `'Pixelated MS Sans Serif', 'MS Sans Serif', 'Microsoft Sans Serif', Arial, sans-serif`,
	/** Title bar font (bold) */
	caption: `'Pixelated MS Sans Serif', 'MS Sans Serif', Arial, sans-serif`,
	/** Desktop icon label font (regular weight, ~8pt) */
	iconLabel: `'Pixelated MS Sans Serif', 'MS Sans Serif', Arial, sans-serif`,

	/** Standard UI size */
	uiSize: '11px',
	/** Desktop icon label size (8pt ≈ 11px at 96dpi) */
	iconLabelSize: '11px',
} as const;

/**
 * Win98 desktop icon metrics.
 */
export const WIN98_ICON = {
	/** Icon image size */
	size: 32,
	/** Center-to-center grid spacing */
	gridSpacing: 75,
	/** Label font weight — Regular, NOT bold */
	labelWeight: 400,
	/** Label text color on desktop (white on teal) */
	labelColor: '#ffffff',
	/** No text shadow in Win98 (shadows were Win2000/ME) */
	labelShadow: false,
} as const;

/**
 * CSS custom property overrides for 98.css.
 *
 * Apply these in the (os) layout to fix 98.css's inaccurate defaults.
 */
export const CSS_OVERRIDES = `
	--surface: ${WIN98.buttonFace};
	--button-face: ${WIN98.buttonFace};
	--button-highlight: ${WIN98.buttonHighlight};
	--button-shadow: ${WIN98.buttonShadow};
	--window-frame: ${WIN98.windowFrame};
	--text-color: ${WIN98.buttonText};
	--dialog-blue: ${WIN98.activeTitleBar};
	--dialog-blue-light: ${WIN98.activeTitleBarEnd};
	--dialog-gray: ${WIN98.inactiveTitleBar};
	--dialog-gray-light: ${WIN98.inactiveTitleBarEnd};
`;
