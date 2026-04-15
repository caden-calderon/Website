import { json } from '@sveltejs/kit';
import { listCaptureTakes } from '$lib/server/captureControl.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	try {
		return json(await listCaptureTakes());
	} catch (error) {
		return json({ error: readErrorMessage(error) }, { status: 500 });
	}
};

function readErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : 'Failed to list capture takes.';
}
