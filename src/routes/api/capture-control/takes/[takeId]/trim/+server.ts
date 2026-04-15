import { json } from '@sveltejs/kit';
import { trimCaptureTake } from '$lib/server/captureControl.js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, request }) => {
	const payload = (await request.json()) as { trimInFrame?: number; trimOutFrame?: number };
	const trimInFrame = payload.trimInFrame;
	const trimOutFrame = payload.trimOutFrame;
	if (!Number.isInteger(trimInFrame) || !Number.isInteger(trimOutFrame)) {
		return json({ error: 'Trim in/out frames must be integers.' }, { status: 400 });
	}
	const resolvedTrimInFrame = trimInFrame as number;
	const resolvedTrimOutFrame = trimOutFrame as number;

	try {
		return json(await trimCaptureTake(params.takeId, resolvedTrimInFrame, resolvedTrimOutFrame));
	} catch (error) {
		return json({ error: readErrorMessage(error) }, { status: 500 });
	}
};

function readErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : 'Failed to trim capture take.';
}
