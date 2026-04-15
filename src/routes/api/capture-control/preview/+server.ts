import { json } from '@sveltejs/kit';
import { getCapturePreview } from '$lib/server/captureControl.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const width = parseOptionalNumber(url.searchParams.get('width'));
	const height = parseOptionalNumber(url.searchParams.get('height'));

	try {
		return json(
			await getCapturePreview({
				width,
				height,
			}),
		);
	} catch (error) {
		return json({ error: readErrorMessage(error) }, { status: 500 });
	}
};

function parseOptionalNumber(value: string | null): number | undefined {
	if (value === null || value.length === 0) {
		return undefined;
	}
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : undefined;
}

function readErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : 'Failed to read capture preview.';
}
