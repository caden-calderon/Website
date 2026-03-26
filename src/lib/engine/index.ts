// Core
export type { SampleSet } from './core/types.js';
export { createSampleSet, cloneSampleSet, mergeSampleSets } from './core/SampleSet.js';

// Ingest
export type { IngestAdapter, MeshAdapterOptions, ImageAdapterOptions } from './ingest/types.js';
export { MeshAdapter } from './ingest/MeshAdapter.js';
export { ImageAdapter } from './ingest/ImageAdapter.js';

// Algorithms
export type {
	StippleAlgorithm,
	AlgorithmInput,
	AlgorithmOptions,
	StippleResult,
} from './algorithms/types.js';
export { rejectionSampling } from './algorithms/rejection-sampling.js';
export { importanceSampling } from './algorithms/importance-sampling.js';
export { weightedVoronoiSampling, MAX_WEIGHTED_VORONOI_SAMPLES } from './algorithms/weighted-voronoi.js';

// Processing
export type { SampleProcessor, ProcessorParams } from './processing/types.js';
export { Pipeline } from './processing/Pipeline.js';
export { ColorProcessor } from './processing/ColorProcessor.js';
export { FrameGenerator, DEFAULT_FRAME_PARAMS, FRAME_STYLES } from './processing/FrameGenerator.js';
export type { FrameParams, FrameStyle } from './processing/FrameGenerator.js';

// Render
export type { RendererAdapter, RenderParams, BloomParams } from './render/types.js';
export { DEFAULT_RENDER_PARAMS, DEFAULT_BLOOM_PARAMS } from './render/types.js';
export { GLPointRenderer } from './render/adapters/GLPointRenderer.js';

// Preprocessing
export { removeImageBackground, BG_REMOVAL_MODELS } from './preprocessing/BackgroundRemoval.js';
export type { BgRemovalModelInfo, RemoveBackgroundOptions } from './preprocessing/BackgroundRemoval.js';
export { estimateDepth, depthToNormals, DEPTH_MODELS } from './preprocessing/DepthEstimation.js';
export type { DepthMap, DepthModelInfo, EstimateDepthOptions } from './preprocessing/DepthEstimation.js';
