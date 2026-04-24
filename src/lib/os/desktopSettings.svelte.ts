import type { WallpaperDef } from './types.js';

const STORAGE_KEY = 'chromatic.desktop.wallpaper';

export type WallpaperPresetId =
	| 'teal'
	| 'graphite'
	| 'blueprint'
	| 'grid'
	| 'sunset'
	| 'custom';

export type WallpaperMode = WallpaperDef['type'];

export type WallpaperPreset = {
	id: WallpaperPresetId;
	name: string;
	wallpaper: WallpaperDef;
};

export const wallpaperPresets: WallpaperPreset[] = [
	{ id: 'teal', name: 'Windows Teal', wallpaper: { type: 'solid', color: '#008080' } },
	{ id: 'graphite', name: 'Graphite', wallpaper: { type: 'solid', color: '#353535' } },
	{ id: 'blueprint', name: 'Blueprint Grid', wallpaper: { type: 'solid', color: '#102fa7' } },
	{ id: 'grid', name: 'OS Grid', wallpaper: { type: 'solid', color: '#d8d8d2' } },
	{
		id: 'sunset',
		name: 'Late Sunset',
		wallpaper: {
			type: 'fill',
			src:
				'linear-gradient(135deg, #211f4f 0%, #124c8f 40%, #d06d33 72%, #f1c05f 100%)',
		},
	},
];

type DesktopSettingsState = {
	presetId: WallpaperPresetId;
	customUrl: string;
	wallpaper: WallpaperDef;
};

const defaultPreset = wallpaperPresets[0];

let state = $state<DesktopSettingsState>({
	presetId: defaultPreset.id,
	customUrl: '',
	wallpaper: { ...defaultPreset.wallpaper },
});

function cloneWallpaper(wallpaper: WallpaperDef): WallpaperDef {
	return { ...wallpaper };
}

function persist() {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function parseStoredSettings(value: string | null): DesktopSettingsState | null {
	if (!value) return null;
	try {
		const parsed = JSON.parse(value) as Partial<DesktopSettingsState>;
		if (!parsed.wallpaper?.type) return null;
		return {
			presetId: parsed.presetId ?? 'teal',
			customUrl: parsed.customUrl ?? '',
			wallpaper: cloneWallpaper(parsed.wallpaper),
		};
	} catch {
		return null;
	}
}

function presetById(id: WallpaperPresetId) {
	return wallpaperPresets.find((preset) => preset.id === id) ?? defaultPreset;
}

export const desktopSettings = {
	get presetId() {
		return state.presetId;
	},

	get customUrl() {
		return state.customUrl;
	},

	get wallpaper() {
		return state.wallpaper;
	},

	init() {
		if (typeof localStorage === 'undefined') return;
		const stored = parseStoredSettings(localStorage.getItem(STORAGE_KEY));
		if (stored) state = stored;
	},

	setPreset(id: WallpaperPresetId) {
		const preset = presetById(id);
		state.presetId = preset.id;
		state.wallpaper = cloneWallpaper(preset.wallpaper);
		persist();
	},

	setCustomUrl(url: string) {
		state.presetId = 'custom';
		state.customUrl = url.trim();
		state.wallpaper = state.customUrl
			? { type: 'fill', src: state.customUrl }
			: cloneWallpaper(defaultPreset.wallpaper);
		persist();
	},

	setMode(mode: WallpaperMode) {
		state.wallpaper = { ...state.wallpaper, type: mode };
		persist();
	},

	setColor(color: string) {
		state.presetId = 'custom';
		state.wallpaper = { type: 'solid', color };
		persist();
	},
};

