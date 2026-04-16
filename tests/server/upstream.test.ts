import { describe, expect, it, vi } from 'vitest';
import { CookieJar } from '../../src/lib/server/cookieJar.js';
import { fetchUpstream } from '../../src/lib/server/proxy/upstream.js';

describe('fetchUpstream', () => {
	it('captures intermediate redirect cookies and replays them on the next hop', async () => {
		const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
			const url = String(input);
			if (url === 'https://example.com/start') {
				const headers = new Headers({
					location: '/next',
					'content-type': 'text/html; charset=utf-8',
				});
				headers.append('set-cookie', 'redirect_step=1; Path=/');
				return withUrl(new Response(null, { status: 302, headers }), url);
			}

			const headers = new Headers({ 'content-type': 'text/html; charset=utf-8' });
			expect(readHeader(init?.headers, 'cookie')).toContain('redirect_step=1');
			return withUrl(new Response('<html><body>ok</body></html>', { status: 200, headers }), url);
		}) as unknown as typeof fetch;

		const response = await fetchUpstream({
			target: new URL('https://example.com/start'),
			request: new Request('http://localhost/api/proxy?url=https://example.com/start'),
			cookieJar: new CookieJar(),
			fetchImpl: fetchMock,
			assertPublicHostnameFn: async () => {},
		});

		expect(await response.text()).toContain('ok');
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it('forwards X-PJAX on fragment-style requests so PJAX-aware servers return the fragment', async () => {
		const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
			expect(readHeader(init?.headers, 'x-pjax')).toBe('true');
			expect(readHeader(init?.headers, 'x-requested-with')).toBe('XMLHttpRequest');
			return withUrl(
				new Response('<div>fragment</div>', {
					status: 200,
					headers: { 'content-type': 'text/html; charset=utf-8' },
				}),
				String(input),
			);
		}) as unknown as typeof fetch;

		await fetchUpstream({
			target: new URL('https://github.com/user?action=show'),
			request: new Request('http://localhost/api/proxy?url=https://github.com/user?action=show', {
				headers: { 'sec-fetch-dest': 'empty' },
			}),
			cookieJar: new CookieJar(),
			fetchImpl: fetchMock,
			assertPublicHostnameFn: async () => {},
		});

		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('does not forward X-PJAX on document-style requests', async () => {
		const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
			expect(readHeader(init?.headers, 'x-pjax')).toBeNull();
			expect(readHeader(init?.headers, 'x-requested-with')).toBeNull();
			return withUrl(
				new Response('<!DOCTYPE html><html><body>full page</body></html>', {
					status: 200,
					headers: { 'content-type': 'text/html; charset=utf-8' },
				}),
				String(input),
			);
		}) as unknown as typeof fetch;

		await fetchUpstream({
			target: new URL('https://github.com/user'),
			request: new Request('http://localhost/api/proxy?url=https://github.com/user', {
				headers: { 'sec-fetch-dest': 'iframe' },
			}),
			cookieJar: new CookieJar(),
			fetchImpl: fetchMock,
			assertPublicHostnameFn: async () => {},
		});

		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('switches POST redirects to GET on 303 responses', async () => {
		const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
			const url = String(input);
			if (url === 'https://example.com/form') {
				return withUrl(
					new Response(null, {
						status: 303,
						headers: { location: '/done', 'content-type': 'text/html; charset=utf-8' },
					}),
					url,
				);
			}

			expect(init?.method).toBe('GET');
			expect(init?.body).toBeUndefined();
			expect(readHeader(init?.headers, 'content-type')).toBeNull();
			return withUrl(
				new Response('<html><body>done</body></html>', {
					status: 200,
					headers: { 'content-type': 'text/html; charset=utf-8' },
				}),
				url,
			);
		}) as unknown as typeof fetch;

		const response = await fetchUpstream({
			target: new URL('https://example.com/form'),
			request: new Request('http://localhost/api/proxy?url=https://example.com/form', {
				method: 'POST',
				headers: { 'content-type': 'application/x-www-form-urlencoded' },
				body: 'q=chromatic',
			}),
			cookieJar: new CookieJar(),
			fetchImpl: fetchMock,
			assertPublicHostnameFn: async () => {},
		});

		expect(await response.text()).toContain('done');
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});
});

function withUrl(response: Response, url: string): Response {
	Object.defineProperty(response, 'url', {
		value: url,
		configurable: true,
	});
	return response;
}

function readHeader(headers: HeadersInit | undefined, name: string): string | null {
	if (!headers) return null;
	return new Headers(headers).get(name);
}
