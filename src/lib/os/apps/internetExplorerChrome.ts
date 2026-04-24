const ICON_BASE = '/os-assets/icons/ie4';

function svg(body: string, size = 32): string {
	return `data:image/svg+xml,${encodeURIComponent(
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">${body}</svg>`,
	)}`;
}

export const FAVORITES = [
	{ label: 'Chromatic Home', url: 'http://chromatic.dev/' },
	{ sep: true },
	{ label: "Caden's GitHub", url: 'https://github.com/Caden-Calderon' },
	{ sep: true },
	{ label: 'Wikipedia', url: 'https://en.wikipedia.org/' },
	{ label: 'Hacker News', url: 'https://news.ycombinator.com/' },
	{ label: 'Wayback Machine', url: 'https://web.archive.org/' },
	{ label: 'CSS Zen Garden', url: 'http://www.csszengarden.com/' },
] as const;

export const LINKS = [
	{ label: 'Best of the Web', url: 'https://en.wikipedia.org/' },
	{ label: 'Channel Guide', url: 'http://chromatic.dev/projects' },
	{ label: 'Customize Links', url: 'http://chromatic.dev/about' },
	{ label: 'Internet Start', url: 'http://chromatic.dev/search' },
	{ label: 'Microsoft', url: 'https://en.wikipedia.org/wiki/Microsoft' },
] as const;

export const ICO_BACK = svg(`
	<path d="M3 16 L13 7 L13 12 L27 12 L27 20 L13 20 L13 25 Z"
	      fill="#3063b8" stroke="#0a2050" stroke-width="1" stroke-linejoin="miter"/>
`);
export const ICO_FORWARD = svg(`
	<path d="M29 16 L19 7 L19 12 L5 12 L5 20 L19 20 L19 25 Z"
	      fill="#3063b8" stroke="#0a2050" stroke-width="1" stroke-linejoin="miter"/>
`);
export const ICO_STOP = svg(`
	<circle cx="16" cy="16" r="12" fill="#d81020" stroke="#500000" stroke-width="1"/>
	<path d="M10 10 L22 22 M22 10 L10 22" stroke="#ffffff" stroke-width="3" stroke-linecap="square"/>
`);
export const ICO_REFRESH = svg(`
	<path d="M 16 4 A 12 12 0 1 1 4 16" fill="none" stroke="#3063b8" stroke-width="4" stroke-linecap="butt"/>
	<path d="M 12 1 L 20 4 L 16 11 Z" fill="#3063b8" stroke="#0a2050" stroke-width="1" stroke-linejoin="miter"/>
`);
export const ICO_DROPDOWN = svg(`<path d="M1 3 L9 3 L5 8 Z" fill="#000"/>`, 10);
export const ICO_PAGE = svg(`
	<rect x="4" y="2" width="10" height="14" fill="#fff" stroke="#808080" stroke-width="1"/>
	<path d="M11 2v4h4" fill="#c0c0c0" stroke="#808080" stroke-width="1"/>
	<line x1="6" y1="8" x2="12" y2="8" stroke="#000080" stroke-width="1"/>
	<line x1="6" y1="10" x2="12" y2="10" stroke="#000080" stroke-width="1"/>
	<line x1="6" y1="12" x2="10" y2="12" stroke="#000080" stroke-width="1"/>
`);
export const ICO_GLOBE = svg(`
	<circle cx="10" cy="10" r="8" fill="#3a6ea5"/>
	<ellipse cx="10" cy="10" rx="4" ry="8" fill="none" stroke="#6aa0d0" stroke-width="0.8"/>
	<line x1="2" y1="7" x2="18" y2="7" stroke="#6aa0d0" stroke-width="0.8"/>
	<line x1="2" y1="13" x2="18" y2="13" stroke="#6aa0d0" stroke-width="0.8"/>
	<line x1="10" y1="2" x2="10" y2="18" stroke="#6aa0d0" stroke-width="0.8"/>
`, 20);

export const ICO_IE_LOGO = `${ICON_BASE}/ie-logo.png`;
export const ICO_HOME = `${ICON_BASE}/home.png`;
export const ICO_SEARCH = `${ICON_BASE}/search.png`;
export const ICO_FAVORITES = `${ICON_BASE}/favorites.png`;
export const ICO_HISTORY = `${ICON_BASE}/history.png`;
export const ICO_CHANNELS = `${ICON_BASE}/channels.png`;
export const ICO_FULLSCREEN = `${ICON_BASE}/fullscreen.png`;
export const ICO_MAIL = `${ICON_BASE}/mail.png`;
export const ICO_PRINT = `${ICON_BASE}/print.png`;
export const ICO_EDIT = `${ICON_BASE}/edit.png`;
