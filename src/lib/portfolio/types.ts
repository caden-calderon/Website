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
	/** OS app to launch for live demos. */
	appId?: AppId;
}
