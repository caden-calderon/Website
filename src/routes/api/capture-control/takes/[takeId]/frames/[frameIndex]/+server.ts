import { json } from '@sveltejs/kit';
import { readCaptureTakeFrame } from '$lib/server/captureControl.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const frameIndex = Number(params.frameIndex);
	if (!Number.isInteger(frameIndex) || frameIndex < 0) {
		return json({ error: 'Frame index must be a non-negative integer.' }, { status: 400 });
	}

	try {
		return json(await readCaptureTakeFrame(params.takeId, frameIndex));
	} catch (error) {
		return json({ error: readErrorMessage(error) }, { status: 500 });
	}
};

function readErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : 'Failed to read capture frame.';
}
