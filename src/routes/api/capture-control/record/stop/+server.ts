import { json } from '@sveltejs/kit';
import { stopCaptureRecording } from '$lib/server/captureControl.js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	let timeoutMs = 5_000;
	try {
		const payload = (await request.json()) as { timeoutMs?: number };
		if (typeof payload.timeoutMs === 'number' && Number.isFinite(payload.timeoutMs)) {
			timeoutMs = payload.timeoutMs;
		}
	} catch {
		// Default timeout is fine.
	}

	try {
		return json(await stopCaptureRecording(timeoutMs));
	} catch (error) {
		return json({ error: readErrorMessage(error) }, { status: 500 });
	}
};

function readErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : 'Failed to stop capture recording.';
}
