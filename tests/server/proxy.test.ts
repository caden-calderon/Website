import { describe, expect, it } from 'vitest';
import { injectHead, shouldInjectHtmlShell } from '../../src/lib/server/proxy/html.js';

describe('proxy helpers', () => {
	it('only injects the HTML shell for document-style requests', () => {
		const documentRequest = new Request('http://localhost/api/proxy?url=https://example.com', {
			headers: { 'sec-fetch-dest': 'iframe' },
		});
		const fragmentRequest = new Request('http://localhost/api/proxy?url=https://example.com', {
			headers: { 'sec-fetch-dest': 'empty' },
		});

		expect(shouldInjectHtmlShell(documentRequest, 'text/html; charset=utf-8')).toBe(true);
		expect(shouldInjectHtmlShell(fragmentRequest, 'text/html; charset=utf-8')).toBe(false);
	});

	it('uses the full page URL as the injected base href', () => {
		const html = '<html><head><title>Example</title></head><body>Hello</body></html>';
		const injected = injectHead(
			html,
			new URL('https://example.com/search?q=chromatic&page=2'),
			'http://localhost:5173',
		);

		expect(injected).toContain('<base href="https://example.com/search?q=chromatic&amp;page=2">');
		expect(injected).toContain('var thisPage="https://example.com/search?q=chromatic&page=2";');
	});

	it('injects script hooks for client cookies, form submits, and location redirects', () => {
		const html = '<html><head><title>Example</title></head><body>Hello</body></html>';
		const injected = injectHead(
			html,
			new URL('https://www.google.com/search?q=chromatic'),
			'http://localhost:5173',
			'sg=challenge',
		);

		expect(injected).toContain('var CU="http://localhost:5173/api/proxy/cookies"');
		expect(injected).toContain("Object.defineProperty(document,'cookie'");
		expect(injected).toContain("document.addEventListener('submit'");
		expect(injected).toContain('HTMLFormElement.prototype.submit=function()');
		expect(injected).toContain('window.Location.prototype.replace=function(u)');
		expect(injected).toContain('sg=challenge');
	});
});
