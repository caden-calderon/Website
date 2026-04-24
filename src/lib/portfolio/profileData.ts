export type ProfileMeter = {
	label: string;
	value: number;
	detail: string;
};

export type ProfileRow = {
	label: string;
	value: string;
};

export type ProfileLink = {
	label: string;
	href: string;
	value: string;
};

export const bioSignals = [
	'Computer vision systems that hold up outside demos',
	'Interfaces for tools, games, sensors, and real-time media',
	'Small, legible systems with clear state and fast feedback',
] as const;

export const focusRows: ProfileRow[] = [
	{ label: '01', value: 'Real-time point clouds and depth-camera pipelines' },
	{ label: '02', value: 'Windows 98 portfolio OS, browser shell, and desktop apps' },
	{ label: '03', value: 'Computer vision demos that connect models to physical controls' },
	{ label: '04', value: 'Agent-facing interfaces for games, tools, and creative systems' },
];

export const stackMatrix: ProfileMeter[] = [
	{ label: 'TypeScript / Svelte', value: 10, detail: 'Portfolio OS, window manager, app surfaces' },
	{ label: 'Python / ML', value: 9, detail: 'Vision models, capture tooling, data pipelines' },
	{ label: 'Computer Vision', value: 10, detail: 'OpenCV, depth sensing, segmentation, calibration' },
	{ label: 'Graphics / 3D', value: 8, detail: 'Three.js, WebGL/WebGPU, shader-heavy interfaces' },
	{ label: 'Systems', value: 8, detail: 'Linux, WASM, workers, performance-sensitive glue' },
	{ label: 'Product UI', value: 9, detail: 'Dense tools, dashboards, interaction design' },
];

export const currentWork: ProfileRow[] = [
	{ label: 'CHR-98', value: 'Chromatic portfolio OS and Internet Explorer content system' },
	{ label: 'PNT-01', value: 'Browser point-cloud engine and Kinect capture pipeline' },
	{ label: 'APR-02', value: 'Segmentation workflow for live subject extraction' },
	{ label: 'AGT-UI', value: 'Assistant-aware game and project surfaces' },
];

export const educationRows: ProfileRow[] = [
	{ label: 'Degree', value: 'B.S. Computer Science, AI/ML focus' },
	{ label: 'Mode', value: 'Research-minded builder; practical systems first' },
	{ label: 'Bias', value: 'Prototype quickly, then harden the architecture' },
];

export const operatingTraits = [
	'Likes tactile interfaces, clear constraints, and visible system state',
	'Comfortable moving between design detail and low-level implementation',
	'Prefers tools that feel specific, inspectable, and a little alive',
] as const;

export const contactLinks: ProfileLink[] = [
	{ label: 'Email', href: 'mailto:hello@caden.dev', value: 'hello@caden.dev' },
	{ label: 'GitHub', href: 'https://github.com/Caden-Calderon', value: 'github.com/Caden-Calderon' },
	{ label: 'Site', href: 'https://caden.dev', value: 'caden.dev' },
];

export const availabilityRows: ProfileRow[] = [
	{ label: 'Status', value: 'Open to selective collaborations' },
	{ label: 'Best fit', value: 'Computer vision, creative tools, interactive systems' },
	{ label: 'Format', value: 'Remote-first; async-friendly; technical depth welcome' },
];

export const collaborationInterests = [
	'Vision systems with real sensors, robots, cameras, or embodied interfaces',
	'Experimental software that needs both design taste and engineering discipline',
	'Portfolio, game, or agent interfaces where state and personality matter',
	'Research prototypes that need to become usable, explainable tools',
] as const;
