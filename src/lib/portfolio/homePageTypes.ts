export const LEFT_PANEL_ORDER = ['nav', 'quick', 'building', 'github', 'availability', 'visitor', 'now'] as const;

export type Rail = 'left' | 'right';
export type LeftPanelKey = (typeof LEFT_PANEL_ORDER)[number];
export type PanelKey =
	| 'index'
	| 'stack'
	| 'notes'
	| 'profile'
	| 'focus'
	| 'education'
	| 'contact'
	| 'update';

export type CollapsedPanels = Record<PanelKey, boolean>;
