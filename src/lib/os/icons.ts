/**
 * Win95-style icon SVGs as inline data URIs.
 *
 * These are original pixel-art-inspired icons that evoke the Win95 aesthetic
 * without using any copyrighted Microsoft assets. Each is a 32x32 SVG
 * rendered with crisp pixel edges via shape-rendering="crispEdges".
 */

function svg(inner: string, viewBox = '0 0 32 32'): string {
	return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" shape-rendering="crispEdges">${inner}</svg>`)}`;
}

// My Computer — beige CRT monitor with blue screen
export const ICON_MY_COMPUTER = svg(`
	<rect x="4" y="3" width="24" height="18" fill="#c0c0c0" stroke="#000" stroke-width="1"/>
	<rect x="6" y="5" width="20" height="13" fill="#000080"/>
	<rect x="8" y="7" width="16" height="8" fill="#0000aa"/>
	<rect x="12" y="22" width="8" height="2" fill="#c0c0c0" stroke="#000" stroke-width="1"/>
	<rect x="8" y="24" width="16" height="3" fill="#c0c0c0" stroke="#000" stroke-width="1"/>
	<circle cx="26" cy="18" r="1" fill="#00aa00"/>
`);

// My Documents — yellow folder
export const ICON_MY_DOCUMENTS = svg(`
	<path d="M3 8h10l2-3h14v22H3z" fill="#ffcc00" stroke="#000" stroke-width="1"/>
	<rect x="3" y="10" width="26" height="17" fill="#ffdd44" stroke="#000" stroke-width="1" rx="1"/>
	<rect x="3" y="8" width="12" height="4" fill="#ffcc00" stroke="#000" stroke-width="1"/>
`);

// Internet Explorer — blue "e" on white page
export const ICON_IE = svg(`
	<rect x="4" y="2" width="24" height="28" fill="white" stroke="#000" stroke-width="1" rx="1"/>
	<text x="16" y="23" text-anchor="middle" font-family="Arial,sans-serif" font-size="20" font-weight="bold" font-style="italic" fill="#0066cc">e</text>
	<path d="M8 12h16" stroke="#ffaa00" stroke-width="2" fill="none"/>
`);

// Explorer — open folder with magnifying glass
export const ICON_EXPLORER = svg(`
	<path d="M2 9h10l2-3h16v20H2z" fill="#ffcc00" stroke="#000" stroke-width="1"/>
	<rect x="2" y="11" width="28" height="15" fill="#ffdd44" stroke="#000" stroke-width="1"/>
	<circle cx="22" cy="14" r="5" fill="none" stroke="#000" stroke-width="2"/>
	<line x1="26" y1="18" x2="30" y2="22" stroke="#000" stroke-width="2"/>
`);

// Notepad — white page with lines and blue header
export const ICON_NOTEPAD = svg(`
	<rect x="5" y="2" width="22" height="28" fill="white" stroke="#000" stroke-width="1"/>
	<rect x="5" y="2" width="22" height="5" fill="#000080"/>
	<line x1="8" y1="11" x2="24" y2="11" stroke="#808080" stroke-width="1"/>
	<line x1="8" y1="14" x2="24" y2="14" stroke="#808080" stroke-width="1"/>
	<line x1="8" y1="17" x2="24" y2="17" stroke="#808080" stroke-width="1"/>
	<line x1="8" y1="20" x2="24" y2="20" stroke="#808080" stroke-width="1"/>
	<line x1="8" y1="23" x2="20" y2="23" stroke="#808080" stroke-width="1"/>
`);

// Calculator — gray calc with buttons
export const ICON_CALCULATOR = svg(`
	<rect x="6" y="2" width="20" height="28" fill="#c0c0c0" stroke="#000" stroke-width="1" rx="1"/>
	<rect x="8" y="4" width="16" height="6" fill="#9ebb9e" stroke="#000" stroke-width="1"/>
	<rect x="8" y="12" width="4" height="3" fill="white" stroke="#808080" stroke-width="0.5"/>
	<rect x="14" y="12" width="4" height="3" fill="white" stroke="#808080" stroke-width="0.5"/>
	<rect x="20" y="12" width="4" height="3" fill="white" stroke="#808080" stroke-width="0.5"/>
	<rect x="8" y="17" width="4" height="3" fill="white" stroke="#808080" stroke-width="0.5"/>
	<rect x="14" y="17" width="4" height="3" fill="white" stroke="#808080" stroke-width="0.5"/>
	<rect x="20" y="17" width="4" height="3" fill="#ff8800" stroke="#808080" stroke-width="0.5"/>
	<rect x="8" y="22" width="4" height="3" fill="white" stroke="#808080" stroke-width="0.5"/>
	<rect x="14" y="22" width="4" height="3" fill="white" stroke="#808080" stroke-width="0.5"/>
	<rect x="20" y="22" width="4" height="3" fill="#4488ff" stroke="#808080" stroke-width="0.5"/>
	<text x="16" y="9" text-anchor="middle" font-family="monospace" font-size="5" fill="#000">1234</text>
`);

// Chess — chess piece silhouette on checkered board
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
	<path d="M14 8 L16 6 L18 8 L18 12 L20 14 L20 16 L19 18 L13 18 L12 16 L12 14 L14 12 Z" fill="#000" opacity="0.8"/>
	<rect x="12" y="18" width="8" height="3" fill="#000" opacity="0.8" rx="1"/>
`);

// Axial — 3D grid/connect-4 concept
export const ICON_AXIAL = svg(`
	<rect x="2" y="2" width="28" height="28" fill="#2244aa" rx="2"/>
	<circle cx="10" cy="10" r="3" fill="#ff4444"/>
	<circle cx="16" cy="10" r="3" fill="#ffdd00"/>
	<circle cx="22" cy="10" r="3" fill="#ff4444"/>
	<circle cx="10" cy="16" r="3" fill="#ffdd00"/>
	<circle cx="16" cy="16" r="3" fill="#ff4444"/>
	<circle cx="22" cy="16" r="3" fill="#ffdd00"/>
	<circle cx="10" cy="22" r="3" fill="#ff4444"/>
	<circle cx="16" cy="22" r="3" fill="#ffdd00"/>
	<circle cx="22" cy="22" r="3" fill="#ff4444"/>
`);

// Solitaire — card fan
export const ICON_SOLITAIRE = svg(`
	<rect x="6" y="4" width="16" height="22" fill="white" stroke="#000" stroke-width="1" rx="1" transform="rotate(-8 14 15)"/>
	<rect x="10" y="4" width="16" height="22" fill="white" stroke="#000" stroke-width="1" rx="1" transform="rotate(0 18 15)"/>
	<rect x="14" y="4" width="16" height="22" fill="white" stroke="#000" stroke-width="1" rx="1" transform="rotate(8 22 15)"/>
	<text x="17" y="13" font-family="serif" font-size="10" fill="#cc0000" font-weight="bold">A</text>
	<text x="17" y="22" font-family="serif" font-size="8" fill="#cc0000">♥</text>
`);

// Minesweeper — grid with mine and flag
export const ICON_MINESWEEPER = svg(`
	<rect x="3" y="3" width="26" height="26" fill="#c0c0c0" stroke="#808080" stroke-width="1"/>
	<rect x="5" y="5" width="7" height="7" fill="#bdbdbd" stroke="#808080" stroke-width="0.5"/>
	<rect x="13" y="5" width="7" height="7" fill="#bdbdbd" stroke="#808080" stroke-width="0.5"/>
	<rect x="21" y="5" width="7" height="7" fill="#bdbdbd" stroke="#808080" stroke-width="0.5"/>
	<rect x="5" y="13" width="7" height="7" fill="#bdbdbd" stroke="#808080" stroke-width="0.5"/>
	<rect x="13" y="13" width="7" height="7" fill="#bdbdbd" stroke="#808080" stroke-width="0.5"/>
	<rect x="21" y="13" width="7" height="7" fill="#bdbdbd" stroke="#808080" stroke-width="0.5"/>
	<rect x="5" y="21" width="7" height="7" fill="#bdbdbd" stroke="#808080" stroke-width="0.5"/>
	<rect x="13" y="21" width="7" height="7" fill="#bdbdbd" stroke="#808080" stroke-width="0.5"/>
	<rect x="21" y="21" width="7" height="7" fill="#bdbdbd" stroke="#808080" stroke-width="0.5"/>
	<circle cx="16" cy="16" r="3" fill="#000"/>
	<line x1="16" y1="11" x2="16" y2="21" stroke="#000" stroke-width="1"/>
	<line x1="11" y1="16" x2="21" y2="16" stroke="#000" stroke-width="1"/>
	<text x="8" y="11" font-family="Arial,sans-serif" font-size="7" font-weight="bold" fill="#0000ff">1</text>
	<polygon points="8,27 8,23 12,25" fill="#ff0000"/>
	<line x1="8" y1="22" x2="8" y2="28" stroke="#000" stroke-width="1"/>
`);

// Point Engine — scattered colored dots (point cloud concept)
export const ICON_POINT_ENGINE = svg(`
	<rect x="2" y="2" width="28" height="28" fill="#111" rx="2"/>
	<circle cx="8" cy="8" r="2" fill="#ff6644"/>
	<circle cx="14" cy="6" r="1.5" fill="#44aaff"/>
	<circle cx="20" cy="9" r="2.5" fill="#ff6644"/>
	<circle cx="26" cy="7" r="1" fill="#ffdd44"/>
	<circle cx="6" cy="14" r="1.5" fill="#ffdd44"/>
	<circle cx="12" cy="13" r="2" fill="#44aaff"/>
	<circle cx="18" cy="15" r="1.5" fill="#ff6644"/>
	<circle cx="24" cy="14" r="2" fill="#44aaff"/>
	<circle cx="9" cy="20" r="2" fill="#44aaff"/>
	<circle cx="15" cy="19" r="2.5" fill="#ffdd44"/>
	<circle cx="22" cy="21" r="1.5" fill="#ff6644"/>
	<circle cx="7" cy="26" r="1.5" fill="#ff6644"/>
	<circle cx="13" cy="25" r="2" fill="#44aaff"/>
	<circle cx="20" cy="26" r="1" fill="#ffdd44"/>
	<circle cx="26" cy="24" r="2" fill="#44aaff"/>
`);

// Recycle Bin — trash can
export const ICON_RECYCLE_BIN = svg(`
	<rect x="8" y="8" width="16" height="20" fill="#c0c0c0" stroke="#000" stroke-width="1" rx="1"/>
	<rect x="6" y="5" width="20" height="3" fill="#c0c0c0" stroke="#000" stroke-width="1" rx="1"/>
	<rect x="12" y="3" width="8" height="3" fill="#c0c0c0" stroke="#000" stroke-width="1"/>
	<line x1="12" y1="12" x2="12" y2="24" stroke="#808080" stroke-width="1"/>
	<line x1="16" y1="12" x2="16" y2="24" stroke="#808080" stroke-width="1"/>
	<line x1="20" y1="12" x2="20" y2="24" stroke="#808080" stroke-width="1"/>
`);

// Run dialog — small window with cursor
export const ICON_RUN = svg(`
	<rect x="3" y="4" width="26" height="24" fill="#c0c0c0" stroke="#000" stroke-width="1"/>
	<rect x="4" y="5" width="24" height="4" fill="#000080"/>
	<text x="6" y="8.5" font-family="Arial,sans-serif" font-size="4" fill="white" font-weight="bold">Run</text>
	<rect x="6" y="14" width="20" height="4" fill="white" stroke="#808080" stroke-width="0.5"/>
	<rect x="16" y="22" width="10" height="4" fill="#c0c0c0" stroke="#000" stroke-width="0.5"/>
	<text x="21" y="25" text-anchor="middle" font-family="Arial,sans-serif" font-size="4" fill="#000">OK</text>
`);

// Windows flag — simplified 4-color flag for Start button
export const ICON_WINDOWS_FLAG = svg(`
	<rect x="2" y="2" width="12" height="12" fill="#ff0000" rx="1"/>
	<rect x="16" y="2" width="14" height="12" fill="#00aa00" rx="1"/>
	<rect x="2" y="16" width="12" height="14" fill="#0000ff" rx="1"/>
	<rect x="16" y="16" width="14" height="14" fill="#ffcc00" rx="1"/>
`, '0 0 32 32');

/** Map from app IDs and special icon names to data URIs. */
export const ICONS: Record<string, string> = {
	'my-computer': ICON_MY_COMPUTER,
	'my-documents': ICON_MY_DOCUMENTS,
	'internet-explorer': ICON_IE,
	'file-explorer': ICON_EXPLORER,
	'notepad': ICON_NOTEPAD,
	'calculator': ICON_CALCULATOR,
	'chess': ICON_CHESS,
	'axial': ICON_AXIAL,
	'solitaire': ICON_SOLITAIRE,
	'minesweeper': ICON_MINESWEEPER,
	'point-engine': ICON_POINT_ENGINE,
	'recycle-bin': ICON_RECYCLE_BIN,
	'run-dialog': ICON_RUN,
	'windows-flag': ICON_WINDOWS_FLAG,
};

/** Get an icon data URI by ID, with a fallback. */
export function getIcon(id: string): string {
	return ICONS[id] ?? ICONS['my-computer'];
}
