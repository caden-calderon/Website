/** Runtime type for project showcase presentation. */
export type ShowcaseType = 'interactive' | 'walkthrough' | 'terminal';

/** Metadata for a portfolio project. */
export interface ProjectManifest {
	id: string;
	title: string;
	description: string;
	type: ShowcaseType;
	/** Svelte component path for the showcase */
	entry: string;
	/** Thumbnail image path */
	thumbnail: string;
	/** Whether a live demo is available */
	demoAvailable: boolean;
	tags: string[];
	stack: string[];
}

/** Connects a train-scene prop to a piece of website content. */
export interface ContentMapping {
	/** Identifier of the train scene prop/object */
	trainPropId: string;
	/** Identifier of the project or content section */
	contentId: string;
	/** Website route for this content */
	route: string;
	/** Brief description surfaced to the AI character */
	aiContext: string;
}

/** Top-level content graph combining projects and their mappings. */
export interface ContentGraph {
	projects: ProjectManifest[];
	mappings: ContentMapping[];
}
