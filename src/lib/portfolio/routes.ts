import { getProject } from './projectQueries.js';
import type { PortfolioRouteMatch, PortfolioRoutePage } from './types.js';

type StaticRoute = {
	page: Exclude<PortfolioRoutePage, 'project-detail'>;
	title: string;
	params?: Record<string, string>;
};

export const PORTFOLIO_DOMAIN = 'chromatic.dev';
export const PORTFOLIO_HOME_URL = `http://${PORTFOLIO_DOMAIN}/`;

export const portfolioStaticRoutes = {
	'/': { page: 'home', title: 'Chromatic', params: {} },
	'/projects': { page: 'projects', title: 'Projects - Chromatic', params: {} },
	'/about': { page: 'about', title: 'About - Chromatic', params: {} },
	'/search': { page: 'search', title: 'Microsoft Network - Search', params: {} },
	'/writings': {
		page: 'placeholder',
		title: 'Writings - Chromatic',
		params: { section: 'Writings', status: 'Draft shelf coming online' },
	},
	'/contact': {
		page: 'placeholder',
		title: 'Contact - Chromatic',
		params: { section: 'Contact', status: 'Contact panel coming online' },
	},
} satisfies Record<string, StaticRoute>;

export function normalizePortfolioPath(pathname: string): string {
	const path = pathname === '/' ? '/' : pathname.replace(/\/$/, '');
	return path || '/';
}

export function resolvePortfolioRoute(pathname: string): PortfolioRouteMatch | null {
	const path = normalizePortfolioPath(pathname);
	const staticRoute = portfolioStaticRoutes[path as keyof typeof portfolioStaticRoutes];

	if (staticRoute) {
		return {
			page: staticRoute.page,
			title: staticRoute.title,
			params: staticRoute.params ?? {},
		};
	}

	if (path.startsWith('/projects/')) {
		const slug = decodeURIComponent(path.slice('/projects/'.length));
		if (slug.includes('/')) return null;

		const project = getProject(slug);
		if (!project) return null;

		return {
			page: 'project-detail',
			title: `${project.title} - Chromatic`,
			params: { slug },
		};
	}

	return null;
}
