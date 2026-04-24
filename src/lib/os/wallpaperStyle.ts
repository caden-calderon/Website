import type { WallpaperDef } from './types.js';

function cssUrl(value: string) {
	if (value.startsWith('linear-gradient(') || value.startsWith('radial-gradient(')) return value;
	return `url("${value.replaceAll('"', '\\"')}")`;
}

export function wallpaperStyle(wallpaper: WallpaperDef): string {
	if (wallpaper.type === 'solid') {
		return `background-color: ${wallpaper.color ?? '#008080'};`;
	}

	if (!wallpaper.src) {
		return `background-color: ${wallpaper.color ?? '#008080'};`;
	}

	const image = cssUrl(wallpaper.src);
	const repeat = wallpaper.type === 'tiled' ? 'repeat' : 'no-repeat';
	const position = 'center center';
	const size =
		wallpaper.type === 'stretched'
			? '100% 100%'
			: wallpaper.type === 'fit' || wallpaper.type === 'centered'
				? 'contain'
				: wallpaper.type === 'fill'
					? 'cover'
					: 'auto';

	return [
		'background-color: #008080;',
		`background-image: ${image};`,
		`background-repeat: ${repeat};`,
		`background-position: ${position};`,
		`background-size: ${size};`,
	].join(' ');
}

