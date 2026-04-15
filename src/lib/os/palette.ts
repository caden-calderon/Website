/**
 * Windows 98 system color palette.
 *
 * These are the exact default Win98 system colors from the
 * "Windows Standard" color scheme.
 */
export const WIN98 = {
	// Desktop
	desktop: '#008080',

	// Window chrome
	activeTitleBar: '#000080',
	activeTitleBarEnd: '#1084d0',
	activeTitleText: '#ffffff',
	inactiveTitleBar: '#808080',
	inactiveTitleBarEnd: '#b5b5b5',
	inactiveTitleText: '#c0c0c0',

	// 3D surfaces
	buttonFace: '#c0c0c0',
	buttonHighlight: '#ffffff',
	buttonLight: '#dfdfdf',
	buttonShadow: '#808080',
	buttonDarkShadow: '#000000',

	// Menu
	menu: '#c0c0c0',
	menuText: '#000000',
	menuHighlight: '#000080',
	menuHighlightText: '#ffffff',
	menuDisabledText: '#808080',

	// Window
	window: '#ffffff',
	windowText: '#000000',

	// Selection
	highlight: '#000080',
	highlightText: '#ffffff',

	// Tooltip
	tooltipBg: '#ffffe1',
	tooltipText: '#000000',
} as const;
