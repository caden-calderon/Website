import {
	PORTFOLIO_DOMAIN,
	PORTFOLIO_HOME_URL,
	resolvePortfolioRoute,
} from '$lib/portfolio/routes.js';
import type { PortfolioRoutePage } from '$lib/portfolio/types.js';

export const IE_HOME_URL = PORTFOLIO_HOME_URL;
export const IE_SEARCH_URL = 'http://chromatic.dev/search';
export const IE_DOMAIN = PORTFOLIO_DOMAIN;

export type InternetExplorerPageKind = PortfolioRoutePage | 'external' | 'error';

export interface InternetExplorerRoute {
	page: InternetExplorerPageKind;
	title: string;
	params: Record<string, string>;
}

export function isInternalBrowserUrl(url: string): boolean {
	if (url.startsWith('/')) return true;
	try {
		const u = new URL(url);
		return u.hostname === IE_DOMAIN || u.hostname === `www.${IE_DOMAIN}`;
	} catch {
		// Try as a schemeless URL below.
	}
	try {
		const u = new URL(`http://${url}`);
		return u.hostname === IE_DOMAIN || u.hostname === `www.${IE_DOMAIN}`;
	} catch {
		return false;
	}
}

export function parseInternalPath(url: string): string | null {
	if (url.startsWith('/')) return new URL(url, IE_HOME_URL).pathname;
	try {
		const u = new URL(url);
		if (u.hostname === IE_DOMAIN || u.hostname === `www.${IE_DOMAIN}`) return u.pathname;
	} catch {
		try {
			const u = new URL(`http://${url}`);
			if (u.hostname === IE_DOMAIN || u.hostname === `www.${IE_DOMAIN}`) return u.pathname;
		} catch {
			return null;
		}
	}
	return null;
}

export function extractDomain(url: string): string {
	try {
		return new URL(url).hostname;
	} catch {
		return url;
	}
}

export function resolveInternetExplorerRoute(url: string): InternetExplorerRoute {
	if (isInternalBrowserUrl(url)) {
		const pathname = parseInternalPath(url);
		if (pathname === null) {
			return { page: 'error', title: 'The page cannot be displayed', params: { url } };
		}

		const route = resolvePortfolioRoute(pathname);
		if (route) return route;

		return { page: 'error', title: 'The page cannot be displayed', params: { url } };
	}

	if (url.startsWith('http://') || url.startsWith('https://')) {
		return { page: 'external', title: extractDomain(url), params: { url } };
	}

	return { page: 'error', title: 'The page cannot be displayed', params: { url } };
}

export function isLikelyUrl(input: string): boolean {
	if (input.includes('://')) return true;
	if (input.startsWith('/')) return true;
	if (input.startsWith(IE_DOMAIN)) return true;
	return input.includes('.') && !input.includes(' ');
}

export function normalizeInternetExplorerUrl(url: string): string {
	const trimmed = url.trim();
	if (!trimmed) return IE_HOME_URL;
	if (trimmed.startsWith('/')) return `http://${IE_DOMAIN}${trimmed}`;
	if (trimmed.startsWith(IE_DOMAIN)) return `http://${trimmed}`;
	if (trimmed.includes('://')) return trimmed;
	if (isLikelyUrl(trimmed)) return `http://${trimmed}`;
	return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
}

export function proxyUrl(externalUrl: string): string {
	return `/api/proxy?url=${encodeURIComponent(externalUrl)}`;
}

export function shortUrl(url: string): string {
	try {
		const parsed = new URL(url);
		return parsed.hostname + (parsed.pathname === '/' ? '' : parsed.pathname);
	} catch {
		return url;
	}
}
