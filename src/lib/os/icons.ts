/**
 * Win95/98-style icon SVGs as inline data URIs.
 *
 * Pixel-art inspired icons matching the Win98 aesthetic — no stroke borders,
 * filled shapes with shading and highlights. Each is 32x32.
 */

function svg(inner: string): string {
	return `data:image/svg+xml,${encodeURIComponent(
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" shape-rendering="crispEdges">${inner}</svg>`,
	)}`;
}

// My Computer — beige CRT with blue screen, base, green power LED
export const ICON_MY_COMPUTER = svg(`
	<rect x="3" y="2" width="26" height="19" rx="1" fill="#c0c0c0"/>
	<rect x="4" y="3" width="24" height="17" fill="#808080"/>
	<rect x="5" y="4" width="22" height="14" fill="#000080"/>
	<rect x="7" y="6" width="18" height="10" fill="#0000aa"/>
	<rect x="23" y="18" width="2" height="1" fill="#00aa00"/>
	<rect x="10" y="21" width="12" height="2" fill="#c0c0c0"/>
	<rect x="7" y="23" width="18" height="3" rx="1" fill="#c0c0c0"/>
	<rect x="8" y="24" width="16" height="1" fill="#dfdfdf"/>
	<rect x="11" y="8" width="4" height="4" fill="#ff0000"/>
	<rect x="17" y="8" width="4" height="4" fill="#00aa00"/>
	<rect x="14" y="10" width="4" height="4" fill="#0000ff"/>
	<rect x="11" y="12" width="4" height="2" fill="#ffff00"/>
`);

// My Documents — yellow folder with paper sticking out
export const ICON_MY_DOCUMENTS = svg(`
	<rect x="3" y="8" width="11" height="3" fill="#ffcc00"/>
	<rect x="2" y="11" width="28" height="18" rx="1" fill="#ffdd44"/>
	<rect x="2" y="11" width="28" height="2" fill="#ffcc00"/>
	<rect x="3" y="13" width="26" height="15" fill="#ffdd44"/>
	<rect x="3" y="12" width="26" height="1" fill="#ffe866"/>
	<rect x="8" y="4" width="16" height="12" fill="white"/>
	<rect x="8" y="4" width="16" height="1" fill="#dfdfdf"/>
	<rect x="10" y="7" width="12" height="1" fill="#808080"/>
	<rect x="10" y="9" width="10" height="1" fill="#808080"/>
	<rect x="10" y="11" width="12" height="1" fill="#808080"/>
`);

// Internet Explorer — blue "e" with golden orbit ring
export const ICON_IE = svg(`
	<rect x="6" y="4" width="20" height="24" rx="10" fill="#0066cc"/>
	<rect x="10" y="6" width="14" height="20" rx="6" fill="#0078d7"/>
	<rect x="12" y="10" width="4" height="2" fill="white"/>
	<rect x="10" y="12" width="10" height="2" fill="white"/>
	<rect x="10" y="14" width="4" height="2" fill="white"/>
	<rect x="10" y="16" width="10" height="2" fill="white"/>
	<rect x="12" y="18" width="8" height="2" fill="white"/>
	<rect x="14" y="20" width="6" height="2" fill="white"/>
	<path d="M4 14 Q8 8 16 7 Q24 6 28 10" fill="none" stroke="#ffaa00" stroke-width="3"/>
	<path d="M4 18 Q8 24 16 25 Q24 26 28 22" fill="none" stroke="#ffaa00" stroke-width="2"/>
`);

// Explorer / My Projects — open yellow folder
export const ICON_EXPLORER = svg(`
	<rect x="2" y="10" width="10" height="3" fill="#ffcc00"/>
	<rect x="1" y="13" width="30" height="16" rx="1" fill="#ffdd44"/>
	<rect x="1" y="13" width="30" height="2" fill="#ffcc00"/>
	<rect x="2" y="15" width="28" height="13" fill="#ffdd44"/>
	<rect x="2" y="14" width="28" height="1" fill="#ffe866"/>
	<path d="M15 20 L19 16 L23 20 L21 20 L21 24 L17 24 L17 20 Z" fill="#808080"/>
`);

// Notepad — white page with blue header bar and text lines
export const ICON_NOTEPAD = svg(`
	<rect x="6" y="2" width="20" height="27" fill="white"/>
	<rect x="6" y="2" width="20" height="4" fill="#000080"/>
	<rect x="7" y="3" width="4" height="2" fill="#c0c0c0"/>
	<rect x="9" y="10" width="14" height="1" fill="#000080"/>
	<rect x="9" y="13" width="12" height="1" fill="#000080"/>
	<rect x="9" y="16" width="14" height="1" fill="#000080"/>
	<rect x="9" y="19" width="10" height="1" fill="#000080"/>
	<rect x="9" y="22" width="13" height="1" fill="#000080"/>
`);

// Calculator — gray body with green LCD and colored buttons
export const ICON_CALCULATOR = svg(`
	<rect x="6" y="1" width="20" height="29" rx="1" fill="#c0c0c0"/>
	<rect x="7" y="2" width="18" height="28" fill="#b0b0b0"/>
	<rect x="8" y="3" width="16" height="7" fill="#9ebb9e"/>
	<rect x="9" y="4" width="14" height="5" fill="#a8cca8"/>
	<rect x="8" y="12" width="4" height="3" fill="#dfdfdf"/>
	<rect x="14" y="12" width="4" height="3" fill="#dfdfdf"/>
	<rect x="20" y="12" width="4" height="3" fill="#dfdfdf"/>
	<rect x="8" y="17" width="4" height="3" fill="#dfdfdf"/>
	<rect x="14" y="17" width="4" height="3" fill="#dfdfdf"/>
	<rect x="20" y="17" width="4" height="3" fill="#ff8844"/>
	<rect x="8" y="22" width="4" height="3" fill="#dfdfdf"/>
	<rect x="14" y="22" width="4" height="3" fill="#dfdfdf"/>
	<rect x="20" y="22" width="4" height="3" fill="#4488ff"/>
	<rect x="8" y="27" width="10" height="3" fill="#dfdfdf"/>
	<rect x="20" y="27" width="4" height="3" fill="#44aa44"/>
`);

// Chess — checkered board with black knight piece
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

// Axial — blue board with red and yellow circles (Connect-4 style)
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

// Solitaire — overlapping playing cards, ace of hearts
export const ICON_SOLITAIRE = svg(`
	<rect x="4" y="3" width="16" height="22" rx="2" fill="#114488" transform="rotate(-10 12 14)"/>
	<rect x="7" y="3" width="16" height="22" rx="2" fill="#114488" transform="rotate(-3 15 14)"/>
	<rect x="11" y="3" width="16" height="22" rx="2" fill="white"/>
	<rect x="12" y="4" width="14" height="20" rx="1" fill="#fafafa"/>
	<text x="14" y="12" font-family="serif" font-size="10" font-weight="bold" fill="#cc0000">A</text>
	<text x="19" y="21" font-family="serif" font-size="12" fill="#cc0000">♥</text>
`);

// Minesweeper — gray grid with revealed cells, mine, flag, numbers
export const ICON_MINESWEEPER = svg(`
	<rect x="2" y="2" width="28" height="28" fill="#c0c0c0"/>
	<rect x="3" y="3" width="8" height="8" fill="#bdbdbd"/>
	<rect x="13" y="3" width="8" height="8" fill="#bdbdbd"/>
	<rect x="23" y="3" width="7" height="8" fill="#c0c0c0"/>
	<rect x="3" y="13" width="8" height="8" fill="#bdbdbd"/>
	<rect x="13" y="13" width="8" height="8" fill="#bdbdbd"/>
	<rect x="23" y="13" width="7" height="8" fill="#c0c0c0"/>
	<rect x="3" y="23" width="8" height="7" fill="#c0c0c0"/>
	<rect x="13" y="23" width="8" height="7" fill="#c0c0c0"/>
	<rect x="23" y="23" width="7" height="7" fill="#c0c0c0"/>
	<text x="7" y="10" text-anchor="middle" font-family="Arial" font-size="8" font-weight="bold" fill="#0000ff">1</text>
	<text x="17" y="10" text-anchor="middle" font-family="Arial" font-size="8" font-weight="bold" fill="#008000">2</text>
	<circle cx="17" cy="17" r="3" fill="#222"/>
	<line x1="17" y1="12" x2="17" y2="22" stroke="#222" stroke-width="1.5"/>
	<line x1="12" y1="17" x2="22" y2="17" stroke="#222" stroke-width="1.5"/>
	<rect x="5" y="24" width="1.5" height="5" fill="#222"/>
	<polygon points="6.5,24 6.5,27 10,25.5" fill="#ff0000"/>
`);

// Point Engine — dark canvas with scattered colored point cloud dots
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
	<circle cx="10" cy="17" r="1" fill="#ff6644" opacity="0.6"/>
	<circle cx="28" cy="18" r="1.5" fill="#ffdd44" opacity="0.7"/>
`);

// Recycle Bin — desktop recycling bin
export const ICON_RECYCLE_BIN = svg(`
	<rect x="8" y="9" width="16" height="19" rx="1" fill="#808080"/>
	<rect x="9" y="10" width="14" height="17" fill="#c0c0c0"/>
	<rect x="6" y="6" width="20" height="3" rx="1" fill="#808080"/>
	<rect x="7" y="7" width="18" height="1" fill="#a0a0a0"/>
	<rect x="12" y="4" width="8" height="3" fill="#808080"/>
	<rect x="13" y="5" width="6" height="1" fill="#a0a0a0"/>
	<rect x="11" y="12" width="2" height="12" fill="#808080"/>
	<rect x="15" y="12" width="2" height="12" fill="#808080"/>
	<rect x="19" y="12" width="2" height="12" fill="#808080"/>
`);

// Network Neighborhood — globe with small computers
export const ICON_NETWORK = svg(`
	<circle cx="16" cy="14" r="10" fill="#0078d7"/>
	<circle cx="16" cy="14" r="10" fill="none" stroke="#005ea6" stroke-width="1"/>
	<ellipse cx="16" cy="14" rx="4" ry="10" fill="none" stroke="#44aaff" stroke-width="1"/>
	<line x1="6" y1="10" x2="26" y2="10" stroke="#44aaff" stroke-width="1"/>
	<line x1="6" y1="18" x2="26" y2="18" stroke="#44aaff" stroke-width="1"/>
	<rect x="3" y="22" width="8" height="6" rx="1" fill="#c0c0c0"/>
	<rect x="4" y="23" width="6" height="3" fill="#000080"/>
	<rect x="21" y="22" width="8" height="6" rx="1" fill="#c0c0c0"/>
	<rect x="22" y="23" width="6" height="3" fill="#000080"/>
	<line x1="7" y1="22" x2="16" y2="16" stroke="#808080" stroke-width="1"/>
	<line x1="25" y1="22" x2="16" y2="16" stroke="#808080" stroke-width="1"/>
`);

// Run dialog icon
export const ICON_RUN = svg(`
	<rect x="2" y="4" width="28" height="24" rx="1" fill="#c0c0c0"/>
	<rect x="3" y="5" width="26" height="4" fill="#000080"/>
	<text x="5" y="8.5" font-family="Arial" font-size="4" fill="white" font-weight="bold">Run</text>
	<rect x="5" y="14" width="22" height="5" fill="white"/>
	<rect x="6" y="15" width="8" height="3" fill="#000"/>
	<rect x="17" y="22" width="10" height="4" rx="1" fill="#dfdfdf"/>
	<text x="22" y="25" text-anchor="middle" font-family="Arial" font-size="4" fill="#000">OK</text>
`);

// Settings — control panel gear
export const ICON_SETTINGS = svg(`
	<rect x="2" y="4" width="28" height="24" rx="1" fill="#c0c0c0"/>
	<rect x="3" y="5" width="26" height="3" fill="#000080"/>
	<circle cx="16" cy="18" r="6" fill="#808080"/>
	<circle cx="16" cy="18" r="3" fill="#c0c0c0"/>
	<rect x="14" y="10" width="4" height="3" fill="#808080"/>
	<rect x="14" y="23" width="4" height="3" fill="#808080"/>
	<rect x="8" y="16" width="3" height="4" fill="#808080"/>
	<rect x="21" y="16" width="3" height="4" fill="#808080"/>
`);

// Documents — stack of papers
export const ICON_DOCUMENTS = svg(`
	<rect x="6" y="4" width="18" height="22" fill="#dfdfdf"/>
	<rect x="8" y="2" width="18" height="22" fill="white"/>
	<rect x="10" y="6" width="14" height="1" fill="#808080"/>
	<rect x="10" y="9" width="12" height="1" fill="#808080"/>
	<rect x="10" y="12" width="14" height="1" fill="#808080"/>
	<rect x="10" y="15" width="10" height="1" fill="#808080"/>
	<rect x="10" y="18" width="13" height="1" fill="#808080"/>
`);

// Favorites — yellow star
export const ICON_FAVORITES = svg(`
	<polygon points="16,3 19,12 29,12 21,18 24,28 16,22 8,28 11,18 3,12 13,12" fill="#ffcc00"/>
	<polygon points="16,5 18,12 27,12 20,17 23,26 16,21 9,26 12,17 5,12 14,12" fill="#ffdd44"/>
`);

// Help — blue question mark book
export const ICON_HELP = svg(`
	<rect x="4" y="3" width="20" height="26" rx="1" fill="#ffdd44"/>
	<rect x="6" y="3" width="20" height="26" rx="1" fill="#ffe866"/>
	<rect x="7" y="4" width="18" height="24" fill="white"/>
	<text x="16" y="22" text-anchor="middle" font-family="serif" font-size="18" font-weight="bold" fill="#0000aa">?</text>
`);

// Find — magnifying glass
export const ICON_FIND = svg(`
	<circle cx="13" cy="13" r="8" fill="none" stroke="#808080" stroke-width="3"/>
	<circle cx="13" cy="13" r="5" fill="white"/>
	<line x1="19" y1="19" x2="28" y2="28" stroke="#808080" stroke-width="4"/>
	<line x1="20" y1="20" x2="27" y2="27" stroke="#a0a0a0" stroke-width="2"/>
`);

// Windows flag — simplified 4-color waving flag for Start button
export const ICON_WINDOWS_FLAG = svg(`
	<rect x="3" y="4" width="12" height="10" fill="#ff0000" rx="1"/>
	<rect x="17" y="4" width="13" height="10" fill="#00aa00" rx="1"/>
	<rect x="3" y="16" width="12" height="12" fill="#0000ff" rx="1"/>
	<rect x="17" y="16" width="13" height="12" fill="#ffcc00" rx="1"/>
`);

// Shut Down — power button
export const ICON_SHUTDOWN = svg(`
	<circle cx="16" cy="16" r="12" fill="#c0c0c0"/>
	<circle cx="16" cy="16" r="10" fill="#808080"/>
	<circle cx="16" cy="16" r="8" fill="#c0c0c0"/>
	<rect x="14" y="4" width="4" height="14" rx="2" fill="#ff0000"/>
	<rect x="15" y="6" width="2" height="10" fill="#cc0000"/>
`);

/** Map from icon name to data URI. */
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
	'network': ICON_NETWORK,
	'run-dialog': ICON_RUN,
	'settings': ICON_SETTINGS,
	'documents': ICON_DOCUMENTS,
	'favorites': ICON_FAVORITES,
	'help': ICON_HELP,
	'find': ICON_FIND,
	'windows-flag': ICON_WINDOWS_FLAG,
	'shutdown': ICON_SHUTDOWN,
};

export function getIcon(id: string): string {
	return ICONS[id] ?? ICONS['my-computer'];
}
