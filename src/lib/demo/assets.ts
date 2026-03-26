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
];
