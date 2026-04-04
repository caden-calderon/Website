import type { RenderParams } from '$lib/engine/render/types.js';

export type SequenceColorGradeId =
	| 'source'
	| 'studio-ivory'
	| 'painted-figure'
	| 'electric-duotone';

export interface SequenceLookPreset {
	id: string;
	label: string;
	description: string;
	colorGradeId: SequenceColorGradeId;
	renderParams: Partial<RenderParams>;
}

export const SEQUENCE_LOOK_PRESETS: readonly SequenceLookPreset[] = [
	{
		id: 'data-segmentation',
		label: 'Data Segmentation',
		description: 'Use source colors directly. Best for seeing the raw segmented ITOP body silhouette.',
		colorGradeId: 'source',
		renderParams: {
			pointSize: 3.0,
			sizeAttenuation: false,
			brightness: 0.78,
			saturation: 1.8,
			opacity: 0.6,
			depthFade: 1.8,
			edgeSharpness: 0.55,
			additiveBlending: false,
			darkCutoff: 0.0,
			hueShift: 0.0,
			warmth: 0.0,
			colorNoise: 0.02,
		},
	},
	{
		id: 'ivory-ghost',
		label: 'Ivory Ghost',
		description: 'Warm monochrome sculptural look for judging form, depth, and silhouette readability.',
		colorGradeId: 'studio-ivory',
		renderParams: {
			pointSize: 2.8,
			sizeAttenuation: false,
			brightness: 0.72,
			saturation: 0.35,
			opacity: 0.48,
			depthFade: 2.6,
			edgeSharpness: 0.42,
			additiveBlending: false,
			darkCutoff: 0.0,
			hueShift: 0.0,
			warmth: 0.22,
			colorNoise: 0.01,
		},
	},
	{
		id: 'painted-figure',
		label: 'Painted Figure',
		description: 'Warm painterly figure palette aimed at the image-demo aesthetic rather than the raw sensor look.',
		colorGradeId: 'painted-figure',
		renderParams: {
			pointSize: 3.2,
			sizeAttenuation: false,
			brightness: 0.95,
			saturation: 2.85,
			opacity: 0.62,
			depthFade: 1.6,
			edgeSharpness: 0.5,
			additiveBlending: false,
			darkCutoff: 0.0,
			hueShift: 0.0,
			warmth: 0.16,
			colorNoise: 0.08,
		},
	},
	{
		id: 'electric-duotone',
		label: 'Electric Duotone',
		description: 'Stylized cyan-magenta stage look for high-contrast motion and contour readability.',
		colorGradeId: 'electric-duotone',
		renderParams: {
			pointSize: 3.1,
			sizeAttenuation: false,
			brightness: 0.9,
			saturation: 2.6,
			opacity: 0.56,
			depthFade: 1.2,
			edgeSharpness: 0.58,
			additiveBlending: false,
			darkCutoff: 0.0,
			hueShift: 0.0,
			warmth: -0.08,
			colorNoise: 0.06,
		},
	},
];

export function getSequenceLookPreset(presetId: string): SequenceLookPreset | null {
	return SEQUENCE_LOOK_PRESETS.find((preset) => preset.id === presetId) ?? null;
}
