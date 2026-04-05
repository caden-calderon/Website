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

interface DemoSequenceAssetBase {
	id: string;
	label: string;
	description: string;
	initialClipId?: string;
}

export interface DemoPointSequenceAsset extends DemoSequenceAssetBase {
	kind: 'point-sequence';
	manifestUrl: string;
}

export interface DemoRgbdSequenceMotion {
	parallaxPixels: number;
	verticalPixels: number;
	depthDrift: number;
	alphaCutoff?: number;
}

export interface DemoManifestRgbdSequenceAsset extends DemoSequenceAssetBase {
	kind: 'rgbd-sequence';
	source: 'manifest';
	manifestUrl: string;
	motion?: DemoRgbdSequenceMotion;
}

export interface DemoDerivedRgbdSequenceAsset extends DemoSequenceAssetBase {
	kind: 'rgbd-sequence';
	source: 'derived-image';
	imageAssetId: string;
	frameCount: number;
	fps: number;
	useBackgroundRemoval?: boolean;
	useEstimatedDepth?: boolean;
	depthModelIndex?: number;
	motion: DemoRgbdSequenceMotion;
}

export interface DemoUploadedVideoRgbdSequenceAsset extends DemoSequenceAssetBase {
	kind: 'rgbd-sequence';
	source: 'uploaded-video';
	fps: number;
	maxFrameCount: number;
	maxEdge: number;
	useEstimatedDepth?: boolean;
	depthModelIndex?: number;
}

export type DemoRgbdSequenceAsset =
	| DemoManifestRgbdSequenceAsset
	| DemoDerivedRgbdSequenceAsset
	| DemoUploadedVideoRgbdSequenceAsset;
export type DemoSequenceAsset = DemoPointSequenceAsset | DemoRgbdSequenceAsset;

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

export const DEMO_POINT_SEQUENCE_ASSETS: DemoPointSequenceAsset[] = [
	{
		kind: 'point-sequence',
		id: 'synthetic-pulse',
		label: 'Synthetic Figure Study',
		manifestUrl: '/api/point-sequences/synthetic-pulse/manifest.json',
		description:
			'Generated multi-clip figure-study sequence with variable point counts, served from tmp/synthetic-point-sequence.',
		initialClipId: 'breathing_idle',
	},
	{
		kind: 'point-sequence',
		id: 'itop-side-test-short',
		label: 'ITOP Side Test Short',
		manifestUrl: '/api/point-sequences/itop-side-test-short/manifest.json',
		description:
			'Converted 24-frame ITOP side-view body clip for real-data startup rehearsal. Generate it with pnpm convert:itop first.',
		initialClipId: 'full_clip',
	},
	{
		kind: 'point-sequence',
		id: 'itop-side-test-medium',
		label: 'ITOP Side Test Medium',
		manifestUrl: '/api/point-sequences/itop-side-test-medium/manifest.json',
		description:
			'Converted 48-frame ITOP side-view body clip for eager preload stress testing. Generate it with pnpm convert:itop first.',
		initialClipId: 'full_clip',
	},
	{
		kind: 'point-sequence',
		id: 'itop-side-test-long',
		label: 'ITOP Side Test Long',
		manifestUrl: '/api/point-sequences/itop-side-test-long/manifest.json',
		description:
			'Converted 96-frame ITOP side-view body clip to probe the current eager full-sequence loading ceiling. Generate it with pnpm convert:itop first.',
		initialClipId: 'full_clip',
	},
	{
		kind: 'point-sequence',
		id: 'utd-kinect2-high-wave',
		label: 'UTD Kinect2 High Wave',
		manifestUrl: '/api/point-sequences/utd-kinect2-high-wave/manifest.json',
		description:
			'Converted UTD Kinect v2 depth+skeleton clip for right-hand high-wave rehearsal. Generate it with pnpm convert:utd first.',
		initialClipId: 'full_clip',
	},
	{
		kind: 'point-sequence',
		id: 'utd-kinect2-hand-clap',
		label: 'UTD Kinect2 Hand Clap',
		manifestUrl: '/api/point-sequences/utd-kinect2-hand-clap/manifest.json',
		description:
			'Converted UTD Kinect v2 depth+skeleton clip for two-hand clap rehearsal. Generate it with pnpm convert:utd first.',
		initialClipId: 'full_clip',
	},
	{
		kind: 'point-sequence',
		id: 'utd-multiview-front-throw',
		label: 'UTD Multiview Front Throw',
		manifestUrl: '/api/point-sequences/utd-multiview-front-throw/manifest.json',
		description:
			'Converted UTD multiview Kinect v2 front-view throw clip with skeleton-fitted depth unprojection. Generate it with pnpm convert:utd first.',
		initialClipId: 'full_clip',
	},
];

export const DEMO_RGBD_SEQUENCE_ASSETS: DemoRgbdSequenceAsset[] = [
	{
		kind: 'rgbd-sequence',
		source: 'uploaded-video',
		id: 'recorded-video-rgbd-study',
		label: 'Recorded Video RGBD Study',
		fps: 12,
		maxFrameCount: 48,
		maxEdge: 640,
		useEstimatedDepth: true,
		depthModelIndex: 3,
		description:
			'Upload a recorded video, sample a bounded clip offline in the browser, estimate per-frame depth, and route it through the existing RGBD sequence path.',
		initialClipId: 'uploaded_clip',
	},
	{
		kind: 'rgbd-sequence',
		source: 'derived-image',
		id: 'pearl-earring-rgbd-study',
		label: 'Pearl Earring RGBD Study',
		imageAssetId: 'girl-with-a-pearl-earring',
		frameCount: 36,
		fps: 12,
		useBackgroundRemoval: true,
		useEstimatedDepth: true,
		depthModelIndex: 0,
		motion: {
			parallaxPixels: 12,
			verticalPixels: 1.5,
			depthDrift: 0.06,
			alphaCutoff: 0.06,
		},
		description:
			'Image-derived RGBD rehearsal clip built from the portrait reference plus estimated depth, closer to the still-image art direction than the procedural blob test.',
		initialClipId: 'portrait_turn',
	},
	{
		kind: 'rgbd-sequence',
		source: 'manifest',
		id: 'procedural-rgbd-portrait',
		label: 'Procedural RGBD Portrait',
		manifestUrl: '/api/rgbd-sequences/procedural-rgbd-portrait/manifest.json',
		motion: {
			parallaxPixels: 8,
			verticalPixels: 1,
			depthDrift: 0.04,
			alphaCutoff: 0.12,
		},
		description:
			'Generated RGBD portrait-sequence mock that exercises image-style point sampling with real per-frame depth input.',
		initialClipId: 'portrait_turn',
	},
	{
		kind: 'rgbd-sequence',
		source: 'manifest',
		id: 'kinect-rgbd-registration-smoke',
		label: 'Kinect RGBD Registration Smoke',
		manifestUrl: '/api/rgbd-sequences/kinect-rgbd-registration-smoke/manifest.json',
		motion: {
			parallaxPixels: 7,
			verticalPixels: 0.8,
			depthDrift: 0.03,
			alphaCutoff: 0.08,
		},
		description:
			'Mock Kinect-style registered RGBD export using the same manifest/frame layout planned for real captured clips. Generate it with pnpm generate:test-kinect-rgbd first.',
		initialClipId: 'registration_smoke',
	},
];

export const DEMO_SEQUENCE_ASSETS: DemoSequenceAsset[] = [
	...DEMO_POINT_SEQUENCE_ASSETS,
	...DEMO_RGBD_SEQUENCE_ASSETS,
];
