/**
 * Web proxy for the IE4 browser.
 *
 * Fetches external pages server-side, strips security headers that block
 * iframe embedding, injects a proxied navigation shim into full HTML
 * documents, and preserves per-session upstream cookies.
 */
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getProxySessionJar } from '$lib/server/proxy/sessionStore.js';
import {
	injectHead,
	rewriteDeferredSrc,
	rewriteLinks,
	shouldInjectHtmlShell,
} from '$lib/server/proxy/html.js';
import { fetchUpstream, UpstreamTimeoutError } from '$lib/server/proxy/upstream.js';

/** Handle CORS preflight requests from the fetch/XHR wrapper. */
export const OPTIONS: RequestHandler = async () => {
	return new Response(null, {
		status: 204,
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS',
			'Access-Control-Allow-Headers': '*',
			'Access-Control-Max-Age': '86400',
		},
	});
};

const handleProxy: RequestHandler = async ({ url, request, cookies }) => {
	const target = url.searchParams.get('url');
	if (!target) throw error(400, 'Missing url parameter');

	let parsed: URL;
	try {
		parsed = new URL(target);
	} catch {
		throw error(400, 'Invalid URL');
	}

	if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
		throw error(400, 'Only http/https URLs are supported');
	}

	const sessionJar = getProxySessionJar(cookies);

	try {
		const upstream = await fetchUpstream({
			target: parsed,
			request,
			cookieJar: sessionJar,
		});

		const contentType = upstream.headers.get('content-type') || '';

		if (!contentType.includes('text/html')) {
			return new Response(upstream.body, {
				status: upstream.status,
				headers: safeHeaders(upstream.headers, contentType),
			});
		}

		if (!shouldInjectHtmlShell(request, contentType)) {
			return new Response(upstream.body, {
				status: upstream.status,
				headers: safeHeaders(upstream.headers, contentType),
			});
		}

		const finalUrl = upstream.url || target;
		const final = new URL(finalUrl);
		const proxyBase = url.origin;
		const documentCookieHeader = sessionJar.getDocumentCookieHeader(final) ?? '';

		let html = await upstream.text();
		html = rewriteLinks(html, final.origin, proxyBase);
		html = rewriteDeferredSrc(html, final.origin, proxyBase);
		html = injectHead(html, final, proxyBase, documentCookieHeader);

		return new Response(html, {
			status: upstream.status,
			headers: {
				'content-type': 'text/html; charset=utf-8',
				'Access-Control-Allow-Origin': '*',
			},
		});
	} catch (e) {
		if (e instanceof UpstreamTimeoutError) {
			throw error(504, e.message);
		}
		if ('status' in (e as object)) throw e;
		const msg = e instanceof Error ? e.message : 'Unknown error';
		throw error(502, `Could not load page: ${msg}`);
	}
};

export const GET = handleProxy;
export const HEAD = handleProxy;
export const POST = handleProxy;
export const PUT = handleProxy;
export const PATCH = handleProxy;
export const DELETE = handleProxy;

function safeHeaders(source: Headers, contentType: string): Record<string, string> {
	const out: Record<string, string> = { 'content-type': contentType };
	for (const header of ['cache-control', 'etag', 'expires', 'last-modified', 'vary']) {
		const value = source.get(header);
		if (value) out[header] = value;
	}
	out['access-control-allow-origin'] = '*';
	return out;
}
