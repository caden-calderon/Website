import type { PortfolioProject } from './types.js';

export const projects: PortfolioProject[] = [
	{
		id: 'point-engine',
		title: 'Point Engine',
		tagline: 'Real-time 3D point cloud rendering in the browser',
		description:
			'A WebGL/WebGPU rendering engine built for real-time visualization of dense point clouds. ' +
			'Streams depth data from a Kinect sensor, reconstructs 3D geometry on the fly, and renders ' +
			'millions of points at interactive frame rates. The engine powers the 3D scene on this website — ' +
			'the character sitting across from you is a live point cloud.',
		stack: ['TypeScript', 'WebGL', 'WebGPU', 'Three.js', 'GLSL'],
		tags: ['graphics', '3d', 'real-time'],
		year: '2025',
		type: 'interactive',
		status: 'active',
		role: 'Render systems, capture pipeline, interaction model',
		code: 'PNT-01',
		accent: 'blue',
		links: [{ label: 'Case notes', href: '/projects/point-engine' }],
		appId: 'point-engine',
	},
	{
		id: 'axial',
		title: 'Axial',
		tagline: '3D Connect-4 with an AI opponent',
		description:
			'A three-dimensional Connect Four game played on a 4×4×4 grid. The AI opponent uses ' +
			'minimax search with alpha-beta pruning and a hand-tuned evaluation function. Difficulty ' +
			'scales from beginner to expert. Built as an exploration of adversarial game tree search ' +
			'in a higher-dimensional space.',
		stack: ['TypeScript', 'Three.js', 'Svelte'],
		tags: ['games', 'ai', '3d'],
		year: '2025',
		type: 'interactive',
		status: 'active',
		role: 'Game rules, AI search, 3D board interface',
		code: 'AXL-04',
		accent: 'orange',
		links: [{ label: 'Open dossier', href: '/projects/axial' }],
		appId: 'axial',
	},
	{
		id: 'chess',
		title: 'Chess',
		tagline: 'Play chess against Stockfish in your browser',
		description:
			'A full chess implementation with Stockfish 16 running as a WASM web worker. ' +
			'Adjustable difficulty from casual play (~1300 Elo) to grandmaster-level (~3190 Elo). ' +
			'The AI character can watch your game, comment on positions, and offer hints — the game ' +
			'state API is designed for external integration.',
		stack: ['TypeScript', 'chess.js', 'Stockfish WASM', 'Svelte'],
		tags: ['games', 'ai'],
		year: '2025',
		type: 'interactive',
		status: 'shipping',
		role: 'Game state API, engine bridge, assistant hooks',
		code: 'CHS-16',
		accent: 'black',
		links: [{ label: 'Open dossier', href: '/projects/chess' }],
		appId: 'chess',
	},
	{
		id: 'aperture',
		title: 'Aperture',
		tagline: 'Intelligent background removal and image segmentation',
		description:
			'A real-time image segmentation pipeline that isolates subjects from their backgrounds ' +
			'using ISNet and U²-Net models. Runs inference in the browser via ONNX Runtime where ' +
			'WebGPU is available, with a server-side fallback for broader compatibility. Processes ' +
			'video frames fast enough for live use in the Point Engine capture pipeline.',
		stack: ['Python', 'TypeScript', 'ONNX Runtime', 'PyTorch', 'WebGPU'],
		tags: ['ml', 'computer-vision', 'real-time'],
		year: '2025',
		type: 'walkthrough',
		status: 'research',
		role: 'Segmentation models, browser inference, fallback service',
		code: 'APR-02',
		accent: 'cyan',
		links: [{ label: 'Read walkthrough', href: '/projects/aperture' }],
	},
	{
		id: 'argus',
		title: 'Argus',
		tagline: 'Multi-camera depth fusion and scene reconstruction',
		description:
			'A system for fusing depth streams from multiple Kinect Azure sensors into a unified ' +
			'3D scene representation. Handles sensor calibration, temporal alignment, and point cloud ' +
			'registration across viewpoints. Named after the hundred-eyed giant — it sees from every angle.',
		stack: ['Rust', 'C++', 'Azure Kinect SDK', 'PCL', 'TypeScript'],
		tags: ['systems', 'computer-vision', '3d'],
		year: '2024',
		type: 'walkthrough',
		status: 'research',
		role: 'Calibration, temporal alignment, depth fusion',
		code: 'ARG-09',
		accent: 'orange',
		links: [{ label: 'Read field log', href: '/projects/argus' }],
	},
	{
		id: 'chromatic',
		title: 'Chromatic',
		tagline: 'This website — a portfolio that lives inside Windows 98',
		description:
			'The site you\'re browsing right now. A faithful Windows 98 desktop running in the browser, ' +
			'sitting on a virtual ThinkPad laptop in a 3D scene. An AI character sits across the table ' +
			'and can interact with everything you do — play chess, discuss projects, or just chat. ' +
			'The OS shell, window manager, and all apps are built from scratch with Svelte 5.',
		stack: ['SvelteKit', 'Three.js', 'TypeScript', '98.css', 'WebGL'],
		tags: ['web', 'creative', '3d'],
		year: '2026',
		type: 'interactive',
		status: 'active',
		role: 'OS shell, browser proxy, portfolio system',
		code: 'CHR-98',
		accent: 'blue',
		links: [{ label: 'Browse system', href: '/' }],
	},
];
