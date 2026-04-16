import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { error } from '@sveltejs/kit';
import type { CookieJar } from '$lib/server/cookieJar.js';

const PRIVATE_NET = /^(127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|0\.|169\.254\.)/;
const BLOCKED_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '[::1]']);
const UPSTREAM_TIMEOUT_MS = 15_000;
const MAX_REDIRECTS = 10;
const DOCUMENT_DESTS = new Set(['document', 'iframe', 'frame']);

export class UpstreamTimeoutError extends Error {
	constructor() {
		super('Upstream request timed out');
	}
}

interface FetchUpstreamOptions {
	target: URL;
	request: Request;
	cookieJar: CookieJar;
	fetchImpl?: typeof fetch;
	assertPublicHostnameFn?: (hostname: string) => Promise<void>;
}

export async function fetchUpstream({
	target,
	request,
	cookieJar,
	fetchImpl = fetch,
	assertPublicHostnameFn = assertPublicHostname,
}: FetchUpstreamOptions): Promise<Response> {
	await assertPublicHostnameFn(target.hostname);

	const accept =
		request.headers.get('accept') ||
		'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8';
	const acceptLanguage = request.headers.get('accept-language') || 'en-US,en;q=0.5';
	const initialBody = await readRequestBody(request);
	const fragmentRequest = isFragmentRequest(request);
	let currentUrl = new URL(target);
	let method = request.method.toUpperCase();
	let contentType = request.headers.get('content-type') || undefined;
	let body = methodAllowsBody(method) ? initialBody : undefined;

	for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount++) {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

		try {
			const cookieHeader = cookieJar.getCookieHeader(currentUrl);
			const response = await fetchImpl(currentUrl, {
				method,
				headers: {
					'User-Agent':
						'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
					Accept: accept,
					'Accept-Language': acceptLanguage,
					...(contentType ? { 'Content-Type': contentType } : {}),
					...(cookieHeader ? { Cookie: cookieHeader } : {}),
					// Some Rails-style endpoints (notably GitHub's profile contributions
					// fragment) only return a real fragment when the request looks like
					// a PJAX/XHR call. Without this header, github.com serves the full
					// HTML document, which include-fragment-element then inserts into
					// itself and the page renders twice. Other sites ignore X-PJAX.
					...(fragmentRequest ? { 'X-PJAX': 'true', 'X-Requested-With': 'XMLHttpRequest' } : {}),
				},
				...(body ? { body } : {}),
				redirect: 'manual',
				signal: controller.signal,
			});

			cookieJar.setCookiesFromResponse(response.headers, currentUrl);

			if (!isRedirect(response.status)) {
				return response;
			}

			if (redirectCount === MAX_REDIRECTS) {
				throw new Error('Too many upstream redirects');
			}

			const location = response.headers.get('location');
			if (!location) return response;

			currentUrl = new URL(location, currentUrl);
			if (currentUrl.protocol !== 'http:' && currentUrl.protocol !== 'https:') {
				throw error(400, 'Only http/https URLs are supported');
			}
			await assertPublicHostnameFn(currentUrl.hostname);

			if (shouldSwitchToGet(method, response.status)) {
				method = 'GET';
				body = undefined;
				contentType = undefined;
			}
		} catch (e) {
			if (e instanceof DOMException && e.name === 'AbortError') {
				throw new UpstreamTimeoutError();
			}
			throw e;
		} finally {
			clearTimeout(timeoutId);
		}
	}

	throw new Error('Too many upstream redirects');
}

export async function assertPublicHostname(hostname: string): Promise<void> {
	if (BLOCKED_HOSTS.has(hostname) || hostname.endsWith('.local') || PRIVATE_NET.test(hostname)) {
		throw error(403, 'Cannot proxy private network addresses');
	}

	if (isIP(hostname)) {
		if (isPrivateAddress(hostname)) {
			throw error(403, 'Cannot proxy private network addresses');
		}
		return;
	}

	const addresses = await lookup(hostname, { all: true, verbatim: true });
	if (addresses.some((entry) => isPrivateAddress(entry.address))) {
		throw error(403, 'Cannot proxy private network addresses');
	}
}

async function readRequestBody(request: Request): Promise<ArrayBuffer | undefined> {
	if (!methodAllowsBody(request.method)) return undefined;
	const body = await request.arrayBuffer();
	return body.byteLength > 0 ? body : undefined;
}

function methodAllowsBody(method: string): boolean {
	const normalized = method.toUpperCase();
	return normalized !== 'GET' && normalized !== 'HEAD';
}

function isRedirect(status: number): boolean {
	return status >= 300 && status < 400;
}

function shouldSwitchToGet(method: string, status: number): boolean {
	return status === 303 || ((status === 301 || status === 302) && method === 'POST');
}

function isFragmentRequest(request: Request): boolean {
	const dest = request.headers.get('sec-fetch-dest');
	if (!dest) return false; // be conservative: treat unknown as document load
	return !DOCUMENT_DESTS.has(dest);
}

function isPrivateAddress(address: string): boolean {
	const normalized = address.toLowerCase();
	if (normalized.includes(':')) {
		return (
			normalized === '::1' ||
			normalized.startsWith('fc') ||
			normalized.startsWith('fd') ||
			normalized.startsWith('fe80:')
		);
	}

	return BLOCKED_HOSTS.has(normalized) || PRIVATE_NET.test(normalized);
}
