import path from 'node:path';

export interface PointSequenceDirectorySource {
	id: string;
	rootDir: string;
}

const POINT_SEQUENCE_DIRECTORY_SOURCES: PointSequenceDirectorySource[] = [
	{
		id: 'synthetic-pulse',
		rootDir: path.resolve(process.cwd(), 'tmp', 'synthetic-point-sequence'),
	},
	{
		id: 'itop-side-test-short',
		rootDir: path.resolve(process.cwd(), 'tmp', 'point-sequences', 'itop-side-test-short'),
	},
	{
		id: 'itop-side-test-medium',
		rootDir: path.resolve(process.cwd(), 'tmp', 'point-sequences', 'itop-side-test-medium'),
	},
	{
		id: 'itop-side-test-long',
		rootDir: path.resolve(process.cwd(), 'tmp', 'point-sequences', 'itop-side-test-long'),
	},
	{
		id: 'utd-kinect2-high-wave',
		rootDir: path.resolve(process.cwd(), 'tmp', 'point-sequences', 'utd-kinect2-high-wave'),
	},
	{
		id: 'utd-kinect2-hand-clap',
		rootDir: path.resolve(process.cwd(), 'tmp', 'point-sequences', 'utd-kinect2-hand-clap'),
	},
	{
		id: 'utd-multiview-front-throw',
		rootDir: path.resolve(process.cwd(), 'tmp', 'point-sequences', 'utd-multiview-front-throw'),
	},
];

export function getPointSequenceDirectorySource(sequenceId: string): PointSequenceDirectorySource | null {
	return POINT_SEQUENCE_DIRECTORY_SOURCES.find((source) => source.id === sequenceId) ?? null;
}

export function resolvePointSequenceAssetPath(sequenceId: string, assetPath: string): string {
	const source = getPointSequenceDirectorySource(sequenceId);
	if (!source) {
		throw new Error(`Unknown point-sequence source "${sequenceId}".`);
	}

	if (!assetPath) {
		throw new Error(`Point-sequence source "${sequenceId}" requires an asset path.`);
	}

	const relativeSegments = assetPath.split('/').filter(Boolean);
	if (relativeSegments.some((segment) => segment === '.' || segment === '..')) {
		throw new Error(`Invalid point-sequence asset path "${assetPath}".`);
	}

	const resolvedPath = path.resolve(source.rootDir, ...relativeSegments);
	const normalizedRoot = source.rootDir.endsWith(path.sep) ? source.rootDir : `${source.rootDir}${path.sep}`;

	if (resolvedPath !== source.rootDir && !resolvedPath.startsWith(normalizedRoot)) {
		throw new Error(`Point-sequence asset path "${assetPath}" escapes the source root.`);
	}

	return resolvedPath;
}

export function getPointSequenceContentType(assetPath: string): string {
	const extension = path.extname(assetPath).toLowerCase();

	switch (extension) {
		case '.json':
			return 'application/json; charset=utf-8';
		case '.ply':
			return 'application/octet-stream';
		default:
			return 'application/octet-stream';
	}
}
