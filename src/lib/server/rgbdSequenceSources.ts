import path from 'node:path';

export interface RgbdSequenceDirectorySource {
	id: string;
	rootDir: string;
}

const RGBD_SEQUENCE_DIRECTORY_SOURCES: RgbdSequenceDirectorySource[] = [
	{
		id: 'procedural-rgbd-portrait',
		rootDir: path.resolve(process.cwd(), 'tmp', 'rgbd-sequences', 'procedural-rgbd-portrait'),
	},
	{
		id: 'kinect-rgbd-registration-smoke',
		rootDir: path.resolve(process.cwd(), 'tmp', 'rgbd-sequences', 'kinect-rgbd-registration-smoke'),
	},
];

export function getRgbdSequenceDirectorySource(sequenceId: string): RgbdSequenceDirectorySource | null {
	return RGBD_SEQUENCE_DIRECTORY_SOURCES.find((source) => source.id === sequenceId) ?? null;
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
