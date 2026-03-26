import { env } from '$env/dynamic/private';
import { MAX_SERVER_BG_UPLOAD_BYTES } from '$lib/services/backgroundRemoval.shared.js';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	return json({
		configured: Boolean(env.BG_REMOVAL_SERVICE_URL),
	});
};

export const POST: RequestHandler = async ({ request, fetch }) => {
	const serviceUrl = env.BG_REMOVAL_SERVICE_URL;
	if (!serviceUrl) {
		return json(
			{
				error: 'Server-side background removal is not configured. Set BG_REMOVAL_SERVICE_URL to the Python service.',
			},
			{ status: 503 },
		);
	}

	const formData = await request.formData();
	const file = formData.get('file');
	const modelId = formData.get('modelId');

	if (!(file instanceof File)) {
		return json({ error: 'Expected an image file upload.' }, { status: 400 });
	}
	if (typeof modelId !== 'string' || modelId.length === 0) {
		return json({ error: 'Expected a background removal model id.' }, { status: 400 });
	}
	if (!file.type.startsWith('image/')) {
		return json({ error: 'Only image uploads are supported.' }, { status: 415 });
	}
	if (file.size > MAX_SERVER_BG_UPLOAD_BYTES) {
		return json(
			{ error: `Image exceeds ${MAX_SERVER_BG_UPLOAD_BYTES / (1024 * 1024)}MB upload limit.` },
			{ status: 413 },
		);
	}

	const upstreamBody = new FormData();
	upstreamBody.set('file', file, file.name);
	upstreamBody.set('modelId', modelId);

	let upstream: Response;
	try {
		upstream = await fetch(resolveServiceUrl(serviceUrl), {
			method: 'POST',
			body: upstreamBody,
		});
	} catch (error) {
		console.error('Failed to reach background removal service', error);
		return json({ error: 'Background removal service is unreachable.' }, { status: 502 });
	}

	if (!upstream.ok) {
		return forwardError(upstream);
	}

	const blob = await upstream.blob();
	const headers = new Headers({
		'content-type': blob.type || 'image/png',
		'cache-control': 'no-store',
		'x-chromatic-model-id': upstream.headers.get('x-chromatic-model-id') ?? modelId,
	});

	return new Response(blob, {
		status: 200,
		headers,
	});
};

function resolveServiceUrl(baseUrl: string): string {
	return new URL('/remove-background', ensureTrailingSlash(baseUrl)).toString();
}

function ensureTrailingSlash(value: string): string {
	return value.endsWith('/') ? value : `${value}/`;
}

async function forwardError(response: Response): Promise<Response> {
	const contentType = response.headers.get('content-type') ?? '';
	if (contentType.includes('application/json')) {
		const payload = (await response.json()) as { error?: string; detail?: string };
		return json(
			{
				error: payload.error ?? payload.detail ?? 'Background removal service failed.',
			},
			{ status: response.status },
		);
	}

	const text = await response.text();
	return json(
		{
			error: text || 'Background removal service failed.',
		},
		{ status: response.status },
	);
}
