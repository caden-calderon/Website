import { json } from '@sveltejs/kit';
import { startCaptureRecording } from '$lib/server/captureControl.js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	let payload: {
		label?: string;
		width?: number;
		height?: number;
		fps?: number;
		maxFrames?: number;
	};
	try {
		payload = (await request.json()) as typeof payload;
	} catch {
		payload = {};
	}

	try {
		return json(
			await startCaptureRecording({
				label: typeof payload.label === 'string' ? payload.label : undefined,
				width: asOptionalNumber(payload.width),
				height: asOptionalNumber(payload.height),
				fps: asOptionalNumber(payload.fps),
				maxFrames: asOptionalNumber(payload.maxFrames),
			}),
		);
	} catch (error) {
		return json({ error: readErrorMessage(error) }, { status: 500 });
	}
};

function asOptionalNumber(value: unknown): number | undefined {
	return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function readErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : 'Failed to start capture recording.';
}
