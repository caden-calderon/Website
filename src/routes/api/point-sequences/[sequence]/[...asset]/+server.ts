import fs from 'node:fs/promises';
import { getPointSequenceContentType, getPointSequenceDirectorySource, resolvePointSequenceAssetPath } from '$lib/server/pointSequenceSources.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const sequenceId = params.sequence;
	const assetPath = params.asset;

	if (!assetPath) {
		return new Response('Point-sequence asset path is required.', { status: 400 });
	}

	const source = getPointSequenceDirectorySource(sequenceId);
	if (!source) {
		return new Response(`Unknown point-sequence source "${sequenceId}".`, { status: 404 });
	}

	let resolvedPath: string;
	try {
		resolvedPath = resolvePointSequenceAssetPath(sequenceId, assetPath);
	} catch (error) {
		return new Response(error instanceof Error ? error.message : 'Invalid point-sequence asset path.', {
			status: 400,
		});
	}

	let file: Buffer;
	try {
		file = await fs.readFile(resolvedPath);
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
			const command = source.id === 'synthetic-pulse'
				? ' Run `pnpm generate:test-ply -- --output tmp/synthetic-point-sequence` first.'
				: source.id.startsWith('itop-side-test-')
					? ' Run `pnpm convert:itop -- --point-cloud <path>/ITOP_side_test_point_cloud.h5.gz --labels <path>/ITOP_side_test_labels.h5.gz --output-root tmp/point-sequences` first.'
				: '';

			return new Response(
				`Point-sequence asset "${assetPath}" was not found for "${sequenceId}" at ${source.rootDir}.${command}`,
				{ status: 404 },
			);
		}

		console.error('Failed to read point-sequence asset', error);
		return new Response('Failed to read point-sequence asset.', { status: 500 });
	}

	return new Response(new Uint8Array(file), {
		status: 200,
		headers: {
			'content-type': getPointSequenceContentType(assetPath),
			'cache-control': 'no-store',
		},
	});
};
