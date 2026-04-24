import { describe, expect, it } from 'vitest';
import {
	IE_HOME_URL,
	normalizeInternetExplorerUrl,
	proxyUrl,
	resolveInternetExplorerRoute,
	shortUrl,
} from '../../src/lib/os/apps/internetExplorerNavigation.js';

describe('internet explorer navigation helpers', () => {
	it('resolves internal portfolio routes', () => {
		expect(resolveInternetExplorerRoute('http://chromatic.dev/')).toMatchObject({
			page: 'home',
			title: 'Chromatic',
		});
		expect(resolveInternetExplorerRoute('/projects/point-engine')).toMatchObject({
			page: 'project-detail',
			title: 'Point Engine - Chromatic',
			params: { slug: 'point-engine' },
		});
		expect(resolveInternetExplorerRoute('chromatic.dev/search')).toMatchObject({
			page: 'search',
			title: 'Microsoft Network - Search',
		});
		expect(resolveInternetExplorerRoute('/projects?view=details#top')).toMatchObject({
			page: 'projects',
			title: 'Projects - Chromatic',
		});
	});

	it('classifies external URLs and unknown internal pages', () => {
		expect(resolveInternetExplorerRoute('https://example.com/path')).toEqual({
			page: 'external',
			title: 'example.com',
			params: { url: 'https://example.com/path' },
		});
		expect(resolveInternetExplorerRoute('/missing')).toEqual({
			page: 'error',
			title: 'The page cannot be displayed',
			params: { url: '/missing' },
		});
	});

	it('normalizes address-bar input', () => {
		expect(normalizeInternetExplorerUrl('')).toBe(IE_HOME_URL);
		expect(normalizeInternetExplorerUrl('/about')).toBe('http://chromatic.dev/about');
		expect(normalizeInternetExplorerUrl('github.com')).toBe('http://github.com');
		expect(normalizeInternetExplorerUrl('point cloud')).toBe(
			'https://www.google.com/search?q=point%20cloud',
		);
	});

	it('formats proxied and display URLs', () => {
		expect(proxyUrl('https://example.com/a?b=c')).toBe(
			'/api/proxy?url=https%3A%2F%2Fexample.com%2Fa%3Fb%3Dc',
		);
		expect(shortUrl('https://example.com/a/b?c=d')).toBe('example.com/a/b');
	});
});
