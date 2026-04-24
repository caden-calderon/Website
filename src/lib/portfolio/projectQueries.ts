import { projects } from './projectCatalog.js';
import type { PortfolioProject } from './types.js';

/** Look up a project by its URL slug. */
export function getProject(slug: string): PortfolioProject | undefined {
	return projects.find((project) => project.id === slug);
}

/** Get projects filtered by tag. */
export function getProjectsByTag(tag: string): PortfolioProject[] {
	return projects.filter((project) => project.tags.includes(tag));
}

export function getFeaturedProject(): PortfolioProject {
	return projects[0];
}

export function getProjectIndex(limit = 5): PortfolioProject[] {
	return projects.slice(0, limit);
}
