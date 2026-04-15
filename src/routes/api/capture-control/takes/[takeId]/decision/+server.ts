import { json } from '@sveltejs/kit';
import { setCaptureTakeDecision } from '$lib/server/captureControl.js';
import type { CaptureDecision } from '$lib/capture/types.js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, request }) => {
	const payload = (await request.json()) as { decision?: CaptureDecision };
	if (!isCaptureDecision(payload.decision)) {
		return json({ error: 'Decision must be pending, keep, or discard.' }, { status: 400 });
	}

	try {
		return json(await setCaptureTakeDecision(params.takeId, payload.decision));
	} catch (error) {
		return json({ error: readErrorMessage(error) }, { status: 500 });
	}
};

function isCaptureDecision(value: unknown): value is CaptureDecision {
	return value === 'pending' || value === 'keep' || value === 'discard';
}

function readErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : 'Failed to update capture take decision.';
}
