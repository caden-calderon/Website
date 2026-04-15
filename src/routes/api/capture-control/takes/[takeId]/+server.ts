import { json } from '@sveltejs/kit';
import { readCaptureTake } from '$lib/server/captureControl.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	try {
		return json(await readCaptureTake(params.takeId));
	} catch (error) {
		return json({ error: readErrorMessage(error) }, { status: 500 });
	}
};

function readErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : 'Failed to read capture take.';
}
