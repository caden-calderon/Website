import type { AppId } from '$lib/os/types.js';

/** A portfolio project displayed inside the IE browser. */
export interface PortfolioProject {
	id: string;
	title: string;
	tagline: string;
	description: string;
	stack: string[];
	tags: string[];
	year: string;
	type: 'interactive' | 'walkthrough';
	status?: 'active' | 'research' | 'archived' | 'shipping';
	role?: string;
	code?: string;
	accent?: 'blue' | 'orange' | 'cyan' | 'black';
	links?: {
		label: string;
		href: string;
	}[];
	/** OS app to launch for live demos. */
	appId?: AppId;
}

export type PortfolioRoutePage =
	| 'home'
	| 'projects'
	| 'project-detail'
	| 'about'
	| 'search'
	| 'placeholder';

export interface PortfolioRouteMatch {
	page: PortfolioRoutePage;
	title: string;
	params: Record<string, string>;
}
