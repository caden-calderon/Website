/**
 * Win98 icon paths.
 *
 * Real Win98 icon PNGs sourced from the win98_icons pack, stored under
 * static/os-assets/icons/. For icons without a PNG (like the Windows flag
 * for the Start button or custom app icons), we use inline SVG data URIs.
 */

const BASE = '/os-assets/icons';

function svg(inner: string): string {
	return `data:image/svg+xml,${encodeURIComponent(
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" shape-rendering="crispEdges">${inner}</svg>`,
	)}`;
}

// Windows flag for the Start button (inline SVG — no PNG equivalent)
export const ICON_WINDOWS_FLAG = svg(`
	<rect x="3" y="4" width="12" height="10" fill="#ff0000" rx="1"/>
	<rect x="17" y="4" width="13" height="10" fill="#00aa00" rx="1"/>
	<rect x="3" y="16" width="12" height="12" fill="#0000ff" rx="1"/>
	<rect x="17" y="16" width="13" height="12" fill="#ffcc00" rx="1"/>
`);

// Custom app icons that don't exist in the Win98 pack (inline SVG)
export const ICON_CHESS = svg(`
	<rect x="4" y="4" width="24" height="24" fill="#deb887"/>
	<rect x="4" y="4" width="6" height="6" fill="#8b4513"/>
	<rect x="16" y="4" width="6" height="6" fill="#8b4513"/>
	<rect x="10" y="10" width="6" height="6" fill="#8b4513"/>
	<rect x="22" y="10" width="6" height="6" fill="#8b4513"/>
	<rect x="4" y="16" width="6" height="6" fill="#8b4513"/>
	<rect x="16" y="16" width="6" height="6" fill="#8b4513"/>
	<rect x="10" y="22" width="6" height="6" fill="#8b4513"/>
	<rect x="22" y="22" width="6" height="6" fill="#8b4513"/>
	<rect x="13" y="7" width="6" height="4" fill="#222"/>
	<rect x="12" y="11" width="8" height="6" fill="#222"/>
	<rect x="14" y="6" width="3" height="2" fill="#222"/>
	<rect x="11" y="17" width="10" height="3" rx="1" fill="#333"/>
`);

export const ICON_AXIAL = svg(`
	<rect x="2" y="2" width="28" height="28" rx="2" fill="#2244aa"/>
	<rect x="3" y="3" width="26" height="26" rx="1" fill="#2a4eb8"/>
	<circle cx="10" cy="10" r="3.5" fill="#ff3333"/>
	<circle cx="16" cy="10" r="3.5" fill="#ffdd00"/>
	<circle cx="22" cy="10" r="3.5" fill="#ff3333"/>
	<circle cx="10" cy="16" r="3.5" fill="#ffdd00"/>
	<circle cx="16" cy="16" r="3.5" fill="#ff3333"/>
	<circle cx="22" cy="16" r="3.5" fill="#2a4eb8"/>
	<circle cx="10" cy="22" r="3.5" fill="#ff3333"/>
	<circle cx="16" cy="22" r="3.5" fill="#2a4eb8"/>
	<circle cx="22" cy="22" r="3.5" fill="#ffdd00"/>
`);

export const ICON_POINT_ENGINE = svg(`
	<rect x="1" y="1" width="30" height="30" rx="2" fill="#0a0d12"/>
	<circle cx="7" cy="7" r="2" fill="#ff6644" opacity="0.9"/>
	<circle cx="15" cy="5" r="1.5" fill="#44aaff" opacity="0.8"/>
	<circle cx="22" cy="8" r="2.5" fill="#ff6644" opacity="0.9"/>
	<circle cx="27" cy="5" r="1" fill="#ffdd44" opacity="0.7"/>
	<circle cx="5" cy="14" r="1.5" fill="#ffdd44" opacity="0.8"/>
	<circle cx="12" cy="12" r="2" fill="#44aaff" opacity="0.9"/>
	<circle cx="19" cy="15" r="1.5" fill="#ff6644" opacity="0.8"/>
	<circle cx="25" cy="13" r="2" fill="#44aaff" opacity="0.9"/>
	<circle cx="8" cy="21" r="2" fill="#44aaff" opacity="0.8"/>
	<circle cx="16" cy="19" r="2.5" fill="#ffdd44" opacity="0.9"/>
	<circle cx="23" cy="22" r="1.5" fill="#ff6644" opacity="0.8"/>
	<circle cx="6" cy="27" r="1.5" fill="#ff6644" opacity="0.7"/>
	<circle cx="14" cy="26" r="2" fill="#44aaff" opacity="0.9"/>
	<circle cx="21" cy="27" r="1" fill="#ffdd44" opacity="0.8"/>
	<circle cx="27" cy="25" r="2" fill="#44aaff" opacity="0.7"/>
`);

export const ICON_RUN = svg(`
	<rect x="2" y="4" width="28" height="24" rx="1" fill="#c0c0c0"/>
	<rect x="3" y="5" width="26" height="4" fill="#000080"/>
	<text x="5" y="8.5" font-family="Arial" font-size="4" fill="white" font-weight="bold">Run</text>
	<rect x="5" y="14" width="22" height="5" fill="white"/>
	<rect x="6" y="15" width="8" height="3" fill="#000"/>
	<rect x="17" y="22" width="10" height="4" rx="1" fill="#dfdfdf"/>
	<text x="22" y="25" text-anchor="middle" font-family="Arial" font-size="4" fill="#000">OK</text>
`);

/** Icon lookup map — real PNGs where available, inline SVG fallbacks. */
export const ICONS: Record<string, string> = {
	// Real Win98 PNGs
	'my-computer': `${BASE}/my-computer.png`,
	'my-documents': `${BASE}/my-documents.png`,
	'internet-explorer': `${BASE}/internet-explorer.png`,
	'file-explorer': `${BASE}/file-explorer.png`,
	'notepad': `${BASE}/notepad.png`,
	'calculator': `${BASE}/calculator.png`,
	'recycle-bin': `${BASE}/recycle-bin.png`,
	'network': `${BASE}/network.png`,
	'solitaire': `${BASE}/solitaire.png`,
	'minesweeper': `${BASE}/minesweeper.png`,
	'help': `${BASE}/help.png`,
	'find': `${BASE}/find.png`,
	'settings': `${BASE}/settings.png`,
	'documents': `${BASE}/documents.png`,
	'favorites': `${BASE}/favorites.png`,
	'shutdown': `${BASE}/shutdown.png`,
	'folder-open': `${BASE}/folder-open.png`,

	// Inline SVGs for custom/unique icons
	'chess': ICON_CHESS,
	'axial': ICON_AXIAL,
	'point-engine': ICON_POINT_ENGINE,
	'run-dialog': ICON_RUN,
	'windows-flag': ICON_WINDOWS_FLAG,
};

export function getIcon(id: string): string {
	return ICONS[id] ?? ICONS['my-computer'];
}
