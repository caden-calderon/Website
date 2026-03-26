export interface DemoMeshAsset {
	id: string;
	label: string;
	src: string;
	description: string;
}

export interface DemoImageAsset {
	id: string;
	label: string;
	src: string;
	description: string;
}

export const DEMO_MESH_ASSETS: DemoMeshAsset[] = [
	{
		id: 'damaged-helmet',
		label: 'Damaged Helmet',
		src: '/demo-assets/meshes/damaged-helmet.glb',
		description: 'Khronos glTF sample asset with real hard-surface geometry for mesh sampling.',
	},
];

export const DEMO_IMAGE_ASSETS: DemoImageAsset[] = [
	{
		id: 'girl-with-a-pearl-earring',
		label: 'Girl With a Pearl Earring',
		src: '/demo-assets/images/girl-with-a-pearl-earring.jpg',
		description: 'Portrait reference for face, cloth, and edge-quality testing.',
	},
	{
		id: 'vase-with-irises',
		label: 'Vase With Irises',
		src: '/demo-assets/images/vase-with-irises.jpg',
		description: 'Floral still-life reference for color and fine-detail sampling.',
	},
	{
		id: 'dance-of-apollo',
		label: 'Dance of Apollo',
		src: '/demo-assets/images/dance-of-apollo.jpg',
		description: 'Multi-figure composition for motion, silhouettes, and density distribution.',
	},
	{
		id: 'david-michelangelo-buonarroti',
		label: 'David, Michelangelo Buonarroti',
		src: '/demo-assets/images/david-michelangelo-buonarroti.jpg',
		description: 'Classical sculpture reference for anatomy, lighting gradients, and form.',
	},
	{
		id: 'death-and-violinist',
		label: 'Death & Violinist',
		src: '/demo-assets/images/death-and-violinist.jpg',
		description: 'High-contrast figure study for edge separation and dark-ground composition.',
	},
	{
		id: 'la-joven-de-la-perla',
		label: 'La Joven de la Perla',
		src: '/demo-assets/images/la-joven-de-la-perla.jpg',
		description: 'Alternate portrait reference for skin, cloth, and facial feature readability.',
	},
	{
		id: 'mountain',
		label: 'Mountain',
		src: '/demo-assets/images/mountain.jpg',
		description: 'Landscape reference for atmospheric depth and large-form sampling.',
	},
	{
		id: 'red-jester',
		label: 'Red Jester',
		src: '/demo-assets/images/red-jester.jpg',
		description: 'Saturated character study for palette stress-testing and costume detail.',
	},
	{
		id: 'skeleton',
		label: 'Skeleton',
		src: '/demo-assets/images/skeleton.jpg',
		description: 'Graphic figure reference for structure, contrast, and negative space.',
	},
	{
		id: 'spiderman',
		label: 'Spiderman',
		src: '/demo-assets/images/spiderman.jpg',
		description: 'Dynamic comic-style figure reference for bold color blocking and pose readability.',
	},
	{
		id: 'extra-1',
		label: 'Extra 1',
		src: '/demo-assets/images/extra-1.jpg',
		description: 'Additional custom preset from the local image library.',
	},
	{
		id: 'final-supp',
		label: 'Final Supp',
		src: '/demo-assets/images/final-supp.jpg',
		description: 'Additional custom preset from the local image library.',
	},
	{
		id: 'mona-lisa',
		label: 'Mona Lisa',
		src: '/demo-assets/images/mona-lisa.jpg',
		description: 'Portrait reference for facial detail, tonal softness, and low-contrast structure.',
	},
];
