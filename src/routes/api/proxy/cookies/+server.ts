import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getProxySessionJar } from '$lib/server/proxy/sessionStore.js';

export const OPTIONS: RequestHandler = async () => {
	return new Response(null, {
		status: 204,
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'POST, OPTIONS',
			'Access-Control-Allow-Headers': 'content-type',
			'Access-Control-Max-Age': '86400',
		},
	});
};

export const POST: RequestHandler = async ({ request, cookies }) => {
	let payload: unknown;

	try {
		payload = JSON.parse(await request.text());
	} catch {
		throw error(400, 'Invalid cookie payload');
	}

	const url = typeof payload === 'object' && payload !== null ? (payload as { url?: unknown }).url : null;
	const rawCookie =
		typeof payload === 'object' && payload !== null ? (payload as { cookie?: unknown }).cookie : null;

	if (typeof url !== 'string' || typeof rawCookie !== 'string') {
		throw error(400, 'Missing url or cookie');
	}

	let parsedUrl: URL;
	try {
		parsedUrl = new URL(url);
	} catch {
		throw error(400, 'Invalid URL');
	}

	if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
		throw error(400, 'Only http/https URLs are supported');
	}

	const sessionJar = getProxySessionJar(cookies);
	sessionJar.setCookie(rawCookie, parsedUrl, true);

	return new Response(null, {
		status: 204,
		headers: {
			'Access-Control-Allow-Origin': '*',
		},
	});
};
