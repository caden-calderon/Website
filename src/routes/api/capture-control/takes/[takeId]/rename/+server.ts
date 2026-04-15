import { json } from '@sveltejs/kit';
import { renameCaptureTake } from '$lib/server/captureControl.js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, request }) => {
	const payload = (await request.json()) as { label?: string };
	if (typeof payload.label !== 'string' || payload.label.trim().length === 0) {
		return json({ error: 'Expected a non-empty label.' }, { status: 400 });
	}

	try {
		return json(await renameCaptureTake(params.takeId, payload.label));
	} catch (error) {
		return json({ error: readErrorMessage(error) }, { status: 500 });
	}
};

function readErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : 'Failed to rename capture take.';
}
