import fs from 'node:fs/promises';
import {
	getRgbdSequenceContentType,
	getRgbdSequenceDirectorySource,
	resolveRgbdSequenceAssetPath,
} from '$lib/server/rgbdSequenceSources.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const sequenceId = params.sequence;
	const assetPath = params.asset;

	if (!assetPath) {
		return new Response('RGBD-sequence asset path is required.', { status: 400 });
	}

	const source = getRgbdSequenceDirectorySource(sequenceId);
	if (!source) {
		return new Response(`Unknown RGBD-sequence source "${sequenceId}".`, { status: 404 });
	}

	let resolvedPath: string;
	try {
		resolvedPath = resolveRgbdSequenceAssetPath(sequenceId, assetPath);
	} catch (error) {
		return new Response(error instanceof Error ? error.message : 'Invalid RGBD-sequence asset path.', {
			status: 400,
		});
	}

	let file: Buffer;
	try {
		file = await fs.readFile(resolvedPath);
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
			const command = source.id === 'procedural-rgbd-portrait'
				? ' Run `node scripts/generate-test-rgbd-sequence.mjs --output tmp/rgbd-sequences/procedural-rgbd-portrait` first.'
				: '';
			return new Response(
				`RGBD-sequence asset "${assetPath}" was not found for "${sequenceId}" at ${source.rootDir}.${command}`,
				{ status: 404 },
			);
		}

		console.error('Failed to read RGBD-sequence asset', error);
		return new Response('Failed to read RGBD-sequence asset.', { status: 500 });
	}

	return new Response(new Uint8Array(file), {
		status: 200,
		headers: {
			'content-type': getRgbdSequenceContentType(assetPath),
			'cache-control': 'no-store',
		},
	});
};
