import { describe, expect, it } from 'vitest';
import { readErrorMessage } from '../../src/lib/services/backgroundRemoval.js';

describe('readErrorMessage', () => {
	it('returns the normalized error field from JSON responses', async () => {
		const response = new Response(JSON.stringify({ error: 'Background removal service failed.' }), {
			status: 500,
			headers: {
				'content-type': 'application/json',
			},
		});

		await expect(readErrorMessage(response)).resolves.toBe('Background removal service failed.');
	});

	it('falls back to the detail field when the upstream service returns FastAPI-style errors', async () => {
		const response = new Response(
			JSON.stringify({ detail: 'Missing model runtime dependency: timm' }),
			{
				status: 500,
				headers: {
					'content-type': 'application/json',
				},
			},
		);

		await expect(readErrorMessage(response)).resolves.toBe('Missing model runtime dependency: timm');
	});

	it('returns a readable fallback for empty responses', async () => {
		const response = new Response(null, { status: 502 });

		await expect(readErrorMessage(response)).resolves.toBe(
			'Background removal request failed (502)',
		);
	});
});
