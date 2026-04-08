import fs from 'node:fs';
import path from 'node:path';
import type { AnimationClip } from '$lib/engine/animation/types.js';

export interface RgbdSequenceDirectorySource {
	id: string;
	rootDir: string;
}

export interface ListedRgbdSequenceSource extends RgbdSequenceDirectorySource {
	builtin: boolean;
}

export interface ListedRgbdSequenceManifestSource extends ListedRgbdSequenceSource {
	label: string;
	description: string;
	manifestUrl: string;
	initialClipId?: string;
	frameCount?: number;
	fps?: number;
}

interface SequenceManifestSummary {
	frameCount?: number;
	fps?: number;
	clips?: readonly AnimationClip[];
	raster?: {
		width?: number;
		height?: number;
	};
}

const RGBD_SEQUENCE_ROOT_DIR = path.resolve(process.cwd(), 'tmp', 'rgbd-sequences');

const RGBD_SEQUENCE_DIRECTORY_SOURCES: readonly RgbdSequenceDirectorySource[] = [
	{
		id: 'procedural-rgbd-portrait',
		rootDir: path.resolve(RGBD_SEQUENCE_ROOT_DIR, 'procedural-rgbd-portrait'),
	},
	{
		id: 'kinect-rgbd-registration-smoke',
		rootDir: path.resolve(RGBD_SEQUENCE_ROOT_DIR, 'kinect-rgbd-registration-smoke'),
	},
];

export function getRgbdSequenceDirectorySource(sequenceId: string): RgbdSequenceDirectorySource | null {
	return getBuiltinRgbdSequenceDirectorySource(sequenceId) ?? getLocalRgbdSequenceDirectorySource(sequenceId);
}

export function listRgbdSequenceDirectorySources(): ListedRgbdSequenceSource[] {
	const builtinById = new Map(
		RGBD_SEQUENCE_DIRECTORY_SOURCES.map((source) => [source.id, { ...source, builtin: true }] as const),
	);
	const listed: ListedRgbdSequenceSource[] = Array.from(builtinById.values());
	if (!fs.existsSync(RGBD_SEQUENCE_ROOT_DIR)) {
		return listed;
	}

	for (const entry of fs.readdirSync(RGBD_SEQUENCE_ROOT_DIR, { withFileTypes: true })) {
		if (!entry.isDirectory()) continue;
		if (builtinById.has(entry.name)) continue;
		const localSource = getLocalRgbdSequenceDirectorySource(entry.name);
		if (!localSource) continue;
		listed.push({ ...localSource, builtin: false });
	}

	listed.sort((left, right) => {
		if (left.builtin !== right.builtin) {
			return left.builtin ? -1 : 1;
		}
		return left.id.localeCompare(right.id);
	});
	return listed;
}

export function listRgbdSequenceManifestSources(): ListedRgbdSequenceManifestSource[] {
	return listRgbdSequenceDirectorySources().map((source) => {
		const manifestPath = path.resolve(source.rootDir, 'manifest.json');
		const manifest = readManifestSummary(manifestPath);
		const clipId = manifest?.clips?.[0]?.id;
		const label = source.builtin ? builtinLabelForSequenceId(source.id) : humanizeSequenceId(source.id);
		const frameSummary = manifest?.frameCount && manifest?.fps
			? ` ${manifest.frameCount} frames at ${trimNumber(manifest.fps)} fps.`
			: '';
		const rasterSummary = manifest?.raster?.width && manifest?.raster?.height
			? ` ${manifest.raster.width}x${manifest.raster.height}.`
			: '';
		return {
			...source,
			label,
			description: source.builtin
				? builtinDescriptionForSequenceId(source.id)
				: `Local manifest-backed RGBD study discovered under tmp/rgbd-sequences/${source.id}.${frameSummary}${rasterSummary}`.trim(),
			manifestUrl: `/api/rgbd-sequences/${source.id}/manifest.json`,
			initialClipId: clipId,
			frameCount: manifest?.frameCount,
			fps: manifest?.fps,
		};
	});
}

export function resolveRgbdSequenceAssetPath(sequenceId: string, assetPath: string): string {
	const source = getRgbdSequenceDirectorySource(sequenceId);
	if (!source) {
		throw new Error(`Unknown RGBD-sequence source "${sequenceId}".`);
	}
	if (!assetPath) {
		throw new Error(`RGBD-sequence source "${sequenceId}" requires an asset path.`);
	}

	const relativeSegments = assetPath.split('/').filter(Boolean);
	if (relativeSegments.some((segment) => segment === '.' || segment === '..')) {
		throw new Error(`Invalid RGBD-sequence asset path "${assetPath}".`);
	}

	const resolvedPath = path.resolve(source.rootDir, ...relativeSegments);
	const normalizedRoot = source.rootDir.endsWith(path.sep) ? source.rootDir : `${source.rootDir}${path.sep}`;
	if (resolvedPath !== source.rootDir && !resolvedPath.startsWith(normalizedRoot)) {
		throw new Error(`RGBD-sequence asset path "${assetPath}" escapes the source root.`);
	}

	return resolvedPath;
}

export function getRgbdSequenceContentType(assetPath: string): string {
	switch (path.extname(assetPath).toLowerCase()) {
		case '.json':
			return 'application/json; charset=utf-8';
		default:
			return 'application/octet-stream';
	}
}

function getBuiltinRgbdSequenceDirectorySource(sequenceId: string): RgbdSequenceDirectorySource | null {
	return RGBD_SEQUENCE_DIRECTORY_SOURCES.find((source) => source.id === sequenceId) ?? null;
}

function getLocalRgbdSequenceDirectorySource(sequenceId: string): RgbdSequenceDirectorySource | null {
	if (!isValidSequenceId(sequenceId)) {
		return null;
	}
	const rootDir = path.resolve(RGBD_SEQUENCE_ROOT_DIR, sequenceId);
	const normalizedRoot = RGBD_SEQUENCE_ROOT_DIR.endsWith(path.sep)
		? RGBD_SEQUENCE_ROOT_DIR
		: `${RGBD_SEQUENCE_ROOT_DIR}${path.sep}`;
	if (rootDir !== RGBD_SEQUENCE_ROOT_DIR && !rootDir.startsWith(normalizedRoot)) {
		return null;
	}
	const manifestPath = path.resolve(rootDir, 'manifest.json');
	if (!fs.existsSync(manifestPath)) {
		return null;
	}
	return {
		id: sequenceId,
		rootDir,
	};
}

function isValidSequenceId(sequenceId: string): boolean {
	return /^[a-z0-9][a-z0-9_-]*$/i.test(sequenceId);
}

function readManifestSummary(manifestPath: string): SequenceManifestSummary | null {
	try {
		const raw = fs.readFileSync(manifestPath, 'utf-8');
		return JSON.parse(raw) as SequenceManifestSummary;
	} catch {
		return null;
	}
}

function builtinLabelForSequenceId(sequenceId: string): string {
	switch (sequenceId) {
		case 'procedural-rgbd-portrait':
			return 'Procedural RGBD Portrait';
		case 'kinect-rgbd-registration-smoke':
			return 'Kinect RGBD Registration Smoke';
		default:
			return humanizeSequenceId(sequenceId);
	}
}

function builtinDescriptionForSequenceId(sequenceId: string): string {
	switch (sequenceId) {
		case 'procedural-rgbd-portrait':
			return 'Generated RGBD portrait-sequence mock that exercises image-style point sampling with real per-frame depth input.';
		case 'kinect-rgbd-registration-smoke':
			return 'Mock Kinect-style registered RGBD export using the same manifest/frame layout planned for real captured clips.';
		default:
			return `Manifest-backed RGBD sequence for ${humanizeSequenceId(sequenceId)}.`;
	}
}

function humanizeSequenceId(sequenceId: string): string {
	return sequenceId
		.split(/[-_]+/)
		.filter(Boolean)
		.map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
		.join(' ');
}

function trimNumber(value: number): string {
	return Number.isInteger(value) ? `${value}` : value.toFixed(3).replace(/\.?0+$/, '');
}
