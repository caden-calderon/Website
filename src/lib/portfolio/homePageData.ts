import type { AppId } from '$lib/os/types.js';

export const focusAreas = [
	'Computer Vision',
	'Interactive Systems',
	'Interface Design',
	'Full-Stack Engineering',
] as const;

export const stackMeters = [
	{ label: 'Python', value: 11 },
	{ label: 'C++', value: 10 },
	{ label: 'TypeScript', value: 9 },
	{ label: 'OpenCV', value: 9 },
	{ label: 'PyTorch', value: 8 },
	{ label: 'TensorFlow', value: 7 },
	{ label: 'Linux', value: 10 },
	{ label: 'UI/UX', value: 8 },
] as const;

type PortfolioNavItem = {
	label: string;
	href: string;
	icon: string;
	active?: boolean;
};

export const navItems: PortfolioNavItem[] = [
	{ label: 'Home', href: '/', icon: '/os-assets/icons/my-computer.png', active: true },
	{ label: 'Projects', href: '/projects', icon: '/os-assets/icons/folder-open.png' },
	{ label: 'Writings', href: '/writings', icon: '/os-assets/icons/notepad-file.png' },
	{ label: 'Experiments', href: '/projects/point-engine', icon: '/os-assets/icons/world-star.png' },
	{ label: 'About', href: '/about', icon: '/os-assets/icons/mii-head.png' },
	{ label: 'Contact', href: '/contact', icon: '/os-assets/icons/internet-wiz.png' },
];

export const quickLinks = [
	{ label: 'All Projects', href: '/projects' },
	{ label: 'Point Engine', href: '/projects/point-engine' },
	{ label: 'About Caden', href: '/about' },
	{ label: 'Email', href: 'mailto:hello@caden.dev' },
] as const;

export const buildQueue = [
	{ label: 'Portfolio OS', status: 'Active' },
	{ label: 'Vision demos', status: 'Next' },
	{ label: 'Agent UI', status: 'Sketch' },
] as const;

export const githubStats = [
	{ label: 'Repos', value: '23' },
	{ label: 'Focus', value: 'CV / 3D' },
	{ label: 'Latest', value: 'Chromatic' },
] as const;

export const availabilityItems = [
	{ label: 'Freelance', value: 'Selective' },
	{ label: 'Research', value: 'Open' },
	{ label: 'Relocation', value: 'Remote-first' },
] as const;

export const games: { label: string; appId: AppId; symbol: string }[] = [
	{ label: 'Chess', appId: 'chess', symbol: 'CHS' },
	{ label: 'Axial', appId: 'axial', symbol: 'AXL' },
	{ label: 'Solitaire', appId: 'solitaire', symbol: 'SOL' },
	{ label: 'Minesweeper', appId: 'minesweeper', symbol: 'MNS' },
];
