import { json } from '@sveltejs/kit';
import { listRgbdSequenceManifestSources } from '$lib/server/rgbdSequenceSources.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	return json({
		sources: listRgbdSequenceManifestSources(),
	});
};
