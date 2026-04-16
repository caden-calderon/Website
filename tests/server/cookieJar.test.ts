import { describe, expect, it } from 'vitest';
import { CookieJar } from '../../src/lib/server/cookieJar.js';

function setCookie(jar: CookieJar, requestUrl: string, rawCookie: string) {
	const headers = new Headers();
	headers.append('set-cookie', rawCookie);
	jar.setCookiesFromResponse(headers, new URL(requestUrl));
}

describe('cookieJar', () => {
	it('keeps host-only cookies on the original host', () => {
		const jar = new CookieJar();
		setCookie(jar, 'https://github.com/Caden-Calderon/Chromatic', 'session=abc123; Path=/');

		expect(jar.getCookieHeader(new URL('https://github.com/Caden-Calderon/Chromatic'))).toContain(
			'session=abc123',
		);
		expect(jar.getCookieHeader(new URL('https://api.github.com/repos/Caden-Calderon/Chromatic'))).toBeNull();
	});

	it('derives the RFC default cookie path from the request URL', () => {
		const jar = new CookieJar();
		setCookie(
			jar,
			'https://example.com/app/settings/profile',
			'tree_view=1; Secure',
		);

		expect(jar.getCookieHeader(new URL('https://example.com/app/settings/theme'))).toContain(
			'tree_view=1',
		);
		expect(jar.getCookieHeader(new URL('https://example.com/app/other'))).toBeNull();
	});

	it('uses path-boundary matching instead of a raw prefix check', () => {
		const jar = new CookieJar();
		setCookie(jar, 'https://example.com/repo', 'mode=compact; Path=/repo');

		expect(jar.getCookieHeader(new URL('https://example.com/repo/issues'))).toContain('mode=compact');
		expect(jar.getCookieHeader(new URL('https://example.com/repository'))).toBeNull();
	});

	it('hides HttpOnly cookies from document.cookie views', () => {
		const jar = new CookieJar();
		setCookie(jar, 'https://example.com/app', 'client=visible; Path=/');
		setCookie(jar, 'https://example.com/app', 'server=secret; Path=/; HttpOnly');

		expect(jar.getCookieHeader(new URL('https://example.com/app'))).toContain('client=visible');
		expect(jar.getCookieHeader(new URL('https://example.com/app'))).toContain('server=secret');
		expect(jar.getDocumentCookieHeader(new URL('https://example.com/app'))).toBe('client=visible');
	});

	it('accepts client-side cookie writes for later upstream requests', () => {
		const jar = new CookieJar();
		jar.setCookie('sg=challenge; Path=/search; Max-Age=60', new URL('https://www.google.com/search?q=chromatic'), true);

		expect(jar.getCookieHeader(new URL('https://www.google.com/search?q=chromatic'))).toContain(
			'sg=challenge',
		);
		expect(jar.getDocumentCookieHeader(new URL('https://www.google.com/search?q=chromatic'))).toContain(
			'sg=challenge',
		);
	});
});
