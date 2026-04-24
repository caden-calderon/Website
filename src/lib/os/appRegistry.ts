import type { AppDef, AppId } from './types.js';
import { getIcon } from './icons.js';

/**
 * Central registry of all launchable applications.
 *
 * Components are lazy-imported — they load when first opened, not at boot.
 * This keeps the initial desktop load fast.
 */
const APP_DEFS: AppDef[] = [
	{
		id: 'internet-explorer',
		label: 'Internet Explorer',
		icon: getIcon('internet-explorer'),
		defaultSize: { width: 1120, height: 760 },
		minSize: { width: 720, height: 480 },
		component: () => import('./apps/InternetExplorer.svelte'),
		singleton: false,
	},
	{
		id: 'file-explorer',
		label: 'Explorer',
		icon: getIcon('file-explorer'),
		defaultSize: { width: 760, height: 540 },
		minSize: { width: 420, height: 300 },
		component: () => import('./apps/Placeholder.svelte'),
		singleton: false,
	},
	{
		id: 'settings',
		label: 'Control Panel',
		icon: getIcon('settings'),
		defaultSize: { width: 520, height: 420 },
		minSize: { width: 420, height: 320 },
		component: () => import('./apps/Settings.svelte'),
		singleton: true,
	},
	{
		id: 'notepad',
		label: 'Notepad',
		icon: getIcon('notepad'),
		defaultSize: { width: 680, height: 500 },
		minSize: { width: 320, height: 220 },
		component: () => import('./apps/Placeholder.svelte'),
		singleton: false,
	},
	{
		id: 'calculator',
		label: 'Calculator',
		icon: getIcon('calculator'),
		defaultSize: { width: 248, height: 292 },
		minSize: { width: 248, height: 292 },
		component: () => import('./apps/Placeholder.svelte'),
		singleton: true,
	},
	{
		id: 'run-dialog',
		label: 'Run',
		icon: getIcon('run-dialog'),
		defaultSize: { width: 360, height: 160 },
		minSize: { width: 360, height: 160 },
		component: () => import('./apps/Placeholder.svelte'),
		singleton: true,
	},
	{
		id: 'chess',
		label: 'Chess',
		icon: getIcon('chess'),
		defaultSize: { width: 620, height: 640 },
		minSize: { width: 320, height: 360 },
		component: () => import('./apps/Placeholder.svelte'),
		singleton: true,
	},
	{
		id: 'axial',
		label: 'Axial',
		icon: getIcon('axial'),
		defaultSize: { width: 620, height: 640 },
		minSize: { width: 320, height: 360 },
		component: () => import('./apps/Placeholder.svelte'),
		singleton: true,
	},
	{
		id: 'solitaire',
		label: 'Solitaire',
		icon: getIcon('solitaire'),
		defaultSize: { width: 760, height: 540 },
		minSize: { width: 400, height: 300 },
		component: () => import('./apps/Placeholder.svelte'),
		singleton: false,
	},
	{
		id: 'minesweeper',
		label: 'Minesweeper',
		icon: getIcon('minesweeper'),
		defaultSize: { width: 280, height: 360 },
		minSize: { width: 200, height: 260 },
		component: () => import('./apps/Placeholder.svelte'),
		singleton: false,
	},
	{
		id: 'point-engine',
		label: 'Point Engine',
		icon: getIcon('point-engine'),
		defaultSize: { width: 1120, height: 760 },
		minSize: { width: 620, height: 440 },
		component: () => import('./apps/PointEngine.svelte'),
		singleton: true,
	},
];

const registry = new Map<AppId, AppDef>(APP_DEFS.map((def) => [def.id, def]));

/** Look up an app definition by ID. */
export function getAppDef(id: AppId): AppDef | undefined {
	return registry.get(id);
}

/** Get all registered app definitions. */
export function getAllApps(): AppDef[] {
	return APP_DEFS;
}

/** Get app definitions filtered by a set of IDs. */
export function getApps(ids: AppId[]): AppDef[] {
	return ids.map((id) => registry.get(id)).filter((d): d is AppDef => d !== undefined);
}
