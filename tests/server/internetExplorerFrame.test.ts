import { describe, expect, it } from 'vitest';
import { inspectFrameLocation } from '../../src/lib/os/apps/internetExplorerFrame.js';

describe('inspectFrameLocation', () => {
	it('accepts same-origin proxy frame URLs', () => {
		const result = inspectFrameLocation(
			() => 'http://127.0.0.1:4173/api/proxy?url=https%3A%2F%2Fen.wikipedia.org%2F',
			'http://127.0.0.1:4173',
		);

		expect(result).toEqual({
			kind: 'proxied',
			href: 'http://127.0.0.1:4173/api/proxy?url=https%3A%2F%2Fen.wikipedia.org%2F',
		});
	});

	it('treats same-origin non-proxy navigations as escaped', () => {
		const result = inspectFrameLocation(
			() => 'http://127.0.0.1:4173/wiki/Hypertext_Transfer_Protocol',
			'http://127.0.0.1:4173',
		);

		expect(result).toEqual({
			kind: 'escaped',
			reason: 'same-origin-non-proxy',
		});
	});

	it('treats cross-origin access failures as escaped', () => {
		const result = inspectFrameLocation(() => {
			throw new DOMException(
				"Failed to read a named property 'href' from 'Location'",
				'SecurityError',
			);
		}, 'http://127.0.0.1:4173');

		expect(result).toEqual({
			kind: 'escaped',
			reason: 'cross-origin',
		});
	});
});
