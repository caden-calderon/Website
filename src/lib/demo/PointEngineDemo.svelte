<script lang="ts">
	import { onMount } from 'svelte';
	import { Canvas } from '@threlte/core';
	import * as THREE from 'three';
	import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
	import PointCloudScene from '$lib/scene/PointCloudScene.svelte';
	import Controls from '$lib/ui/Controls.svelte';
	import {
		DEMO_IMAGE_ASSETS,
		DEMO_MESH_ASSETS,
		DEMO_SEQUENCE_ASSETS,
		type DemoDerivedRgbdSequenceAsset,
		type DemoImageAsset,
		type DemoMeshAsset,
		type DemoSequenceAsset,
	} from '$lib/demo/assets.js';
	import {
		loadPreparedPointSequence,
		resolveSequenceTransform,
		type PreparedPointSequenceBounds,
		type PreparedPointSequenceReport,
	} from '$lib/demo/pointSequencePlayback.js';
	import {
		buildRgbdSequenceLookStatus,
		estimateRgbdSequencePreparationMs,
		loadPreparedRgbdSequence,
		prepareRgbdSequenceData,
		type PreparedRgbdSequenceReport,
	} from '$lib/demo/rgbdSequencePlayback.js';
	import { prepareRgbdSequenceDataInWorker } from '$lib/demo/rgbdSequencePrepClient.js';
	import { buildDerivedRgbdSequence, extractRasterFromImage } from '$lib/demo/rgbdDerivedSequence.js';
	import {
		SEQUENCE_LOOK_PRESETS,
		getSequenceLookPreset,
	} from '$lib/demo/sequenceLooks.js';
	import { loadPointSequencePlaybackSource } from '$lib/demo/pointSequenceSources.js';
	import { loadRgbdSequencePlaybackSource, type RgbdSequenceFrameData } from '$lib/demo/rgbdSequenceSources.js';
	import { FrameSequenceLoader } from '$lib/engine/animation/FrameSequenceLoader.js';
	import type { FrameSequence } from '$lib/engine/animation/FrameSequence.js';
	import type { AnimationClip } from '$lib/engine/animation/types.js';
	import { GLPointRenderer } from '$lib/engine/render/adapters/GLPointRenderer.js';
	import { MeshAdapter } from '$lib/engine/ingest/MeshAdapter.js';
	import { ImageAdapter } from '$lib/engine/ingest/ImageAdapter.js';
	import { DEFAULT_RENDER_PARAMS, DEFAULT_BLOOM_PARAMS } from '$lib/engine/render/types.js';
	import type { RenderParams, BloomParams } from '$lib/engine/render/types.js';
	import type { ImageAdapterOptions } from '$lib/engine/ingest/types.js';
	import type { DepthMap } from '$lib/engine/preprocessing/DepthEstimation.js';
	import { DEPTH_MODELS } from '$lib/engine/preprocessing/DepthEstimation.js';
	import { BG_REMOVAL_MODELS } from '$lib/engine/preprocessing/BackgroundRemoval.js';
	import { FrameGenerator, DEFAULT_FRAME_PARAMS } from '$lib/engine/processing/FrameGenerator.js';
	import type { FrameParams } from '$lib/engine/processing/FrameGenerator.js';
	import { mergeSampleSets } from '$lib/engine/core/SampleSet.js';
	import {
		SERVER_BG_REMOVAL_MODELS,
		getBackgroundRemovalCacheKey,
		getBrowserBgRemovalModel,
		getServerBgRemovalModel,
		removeImageBackgroundWithProvider,
		type BgRemovalProvider,
	} from '$lib/services/backgroundRemoval.js';
	import { MAX_WEIGHTED_VORONOI_SAMPLES } from '$lib/engine/algorithms/weighted-voronoi.js';

	// ── Tunable state ────────────────────────────────────────────────────
	let renderParams = $state<RenderParams>({ ...DEFAULT_RENDER_PARAMS });
	let bloomParams = $state<BloomParams>({ ...DEFAULT_BLOOM_PARAMS });
	let mode = $state<'mesh' | 'image' | 'sequence'>('mesh');
	let selectedMeshAssetId = $state(DEMO_MESH_ASSETS[0]?.id ?? 'procedural');
	let selectedImageAssetId = $state(DEMO_IMAGE_ASSETS[0]?.id ?? '');
	let selectedSequenceAssetId = $state(DEMO_SEQUENCE_ASSETS[0]?.id ?? '');
	let selectedSequenceClipId = $state('');
	let selectedSequenceLookPresetId = $state('painted-figure');
	let sequenceMaxPointsPerFrame = $state(12000);
	let sequenceAutoCenter = $state(true);
	let sequenceFitHeightEnabled = $state(true);
	let sequenceFitHeight = $state(2.2);
	let sequenceScaleMultiplier = $state(1);
	let algorithm = $state<'rejection' | 'importance' | 'weighted-voronoi'>('importance');
	let sampleCount = $state(126000);
	let depthScale = $state(0.07);
	let densityGamma = $state(1.1);
	let radiusFromLuminance = $state(true);
	let sizeVariation = $state(0.4);
	let outlierRadius = $state(0);
	let normalDisplacement = $state(0);
	let outerBackgroundColor = $state<string | null>(null);
	let innerBackgroundColor = $state<string | null>(null);
	let frameParams = $state<FrameParams>({ ...DEFAULT_FRAME_PARAMS });
	let removeBg = $state(false);
	let bgProvider = $state<BgRemovalProvider>('browser');
	let bgModelIndex = $state(2); // ISNet fp16 — best quality without WebGPU
	let serverBgModelId = $state(SERVER_BG_REMOVAL_MODELS[0].id);
	let useDepthMap = $state(false);
	let depthModelIndex = $state(0);

	// ── Internal state ───────────────────────────────────────────────────
	let processingStatus = $state('');
	let processingProgress = $state<number | null>(null);
	let processingEstimatedRemainingMs = $state<number | null>(null);
	let sequenceStatus = $state('');
	let ready = $state(false);
	let glRenderer = $state<GLPointRenderer>(undefined!);
	let meshAdapter = $state<MeshAdapter>(undefined!);
	let imageAdapter = $state<ImageAdapter>(undefined!);
	let frameGenerator = $state<FrameGenerator>(undefined!);
	let frameSequenceLoader = $state<FrameSequenceLoader>(undefined!);
	let originalImage = $state<HTMLImageElement | null>(null);
	let activeSequence = $state<FrameSequence | null>(null);
	let availableSequenceClips = $state<readonly AnimationClip[]>([]);
	let sequenceBounds = $state<PreparedPointSequenceBounds | null>(null);
	let sequenceReport = $state<PreparedPointSequenceReport | PreparedRgbdSequenceReport | null>(null);
	let sequenceIsPlaying = $state(false);
	let pendingObjectUrl = $state<string | null>(null);
	let imagePipelineVersion = 0;
	let imageLoadVersion = 0;
	let meshLoadVersion = 0;
	let sequenceLoadVersion = 0;
	let activeRgbdPreparationCancel: (() => void) | null = null;

	const bgRemovalCache = new WeakMap<HTMLImageElement, Map<string, HTMLImageElement>>();
	const depthMapCache = new WeakMap<HTMLImageElement, Map<number, DepthMap>>();
	const meshAssetCache = new Map<string, THREE.Mesh>();
	const imageAssetCache = new Map<string, HTMLImageElement>();
	const rgbdSequenceFrameCache = new Map<string, readonly RgbdSequenceFrameData[]>();
	const derivedRgbdSequenceCache = new Map<string, ReturnType<typeof buildDerivedRgbdSequence>>();
	const selectedSequenceAsset = $derived(DEMO_SEQUENCE_ASSETS.find((asset) => asset.id === selectedSequenceAssetId) ?? null);
	const selectedSequenceAssetKind = $derived(selectedSequenceAsset?.kind ?? 'point-sequence');
	const selectedSequenceAssetSource = $derived(
		selectedSequenceAsset?.kind === 'rgbd-sequence' ? selectedSequenceAsset.source : null,
	);
	const availableSequenceClipIds = $derived(availableSequenceClips.map((clip) => clip.id));
	const sequenceAnimationActive = $derived(mode === 'sequence' && activeSequence !== null && sequenceIsPlaying);
	const sequenceTransform = $derived.by(() =>
		resolveSequenceTransform(sequenceBounds, {
			autoCenter: sequenceAutoCenter,
			fitHeightEnabled: sequenceFitHeightEnabled,
			fitHeight: sequenceFitHeight,
			scaleMultiplier: sequenceScaleMultiplier,
		}),
	);
	const pointCloudPosition = $derived(
		mode === 'sequence' ? sequenceTransform.position : ([0, 0, 0] satisfies [number, number, number]),
	);
	const pointCloudScale = $derived(mode === 'sequence' ? sequenceTransform.scale : 1);

	// ── Inner background plane size ──────────────────────────────────────
	const innerPlaneSize = $derived.by<[number, number] | null>(() => {
		if (!originalImage) return null;
		const aspect = originalImage.naturalWidth / originalImage.naturalHeight;
		const halfW = aspect / 2;
		const halfH = 0.5;
		const pad = frameParams.padding;
		return [(halfW + pad) * 2, (halfH + pad) * 2];
	});

	// ── Settings persistence ─────────────────────────────────────────────
	const SETTINGS_KEY = 'chromatic-settings';

	interface SavedSettings {
		renderParams: RenderParams;
		bloomParams: BloomParams;
		mode: 'mesh' | 'image' | 'sequence';
		selectedMeshAssetId: string;
		selectedImageAssetId: string;
		selectedSequenceAssetId: string;
		selectedSequenceClipId: string;
		selectedSequenceLookPresetId: string;
		sequenceMaxPointsPerFrame: number;
		sequenceAutoCenter: boolean;
		sequenceFitHeightEnabled: boolean;
		sequenceFitHeight: number;
		sequenceScaleMultiplier: number;
		algorithm: 'rejection' | 'importance' | 'weighted-voronoi';
		sampleCount: number;
		depthScale: number;
		densityGamma: number;
		radiusFromLuminance: boolean;
		sizeVariation: number;
		outlierRadius: number;
		normalDisplacement: number;
		outerBackgroundColor: string | null;
		innerBackgroundColor: string | null;
		frameParams: FrameParams;
		removeBg: boolean;
		bgProvider: BgRemovalProvider;
		bgModelIndex: number;
		serverBgModelId: string;
		useDepthMap: boolean;
		depthModelIndex: number;
	}

	function saveSettings() {
		const settings: SavedSettings = {
			renderParams, bloomParams, mode, selectedMeshAssetId, selectedImageAssetId, selectedSequenceAssetId,
			selectedSequenceClipId, selectedSequenceLookPresetId, sequenceMaxPointsPerFrame, sequenceAutoCenter,
			sequenceFitHeightEnabled, sequenceFitHeight, sequenceScaleMultiplier, algorithm, sampleCount,
			depthScale, densityGamma, radiusFromLuminance, sizeVariation,
			outlierRadius, normalDisplacement, outerBackgroundColor,
			innerBackgroundColor, frameParams, removeBg, bgProvider, bgModelIndex, serverBgModelId, useDepthMap, depthModelIndex,
		};
		localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
	}

	function loadSettings(): boolean {
		try {
			const raw = localStorage.getItem(SETTINGS_KEY);
			if (!raw) return false;
			const s = JSON.parse(raw) as Partial<SavedSettings>;

			if (s.renderParams) renderParams = { ...DEFAULT_RENDER_PARAMS, ...s.renderParams };
			if (s.bloomParams) bloomParams = { ...DEFAULT_BLOOM_PARAMS, ...s.bloomParams };
			if (s.mode) mode = s.mode;
			if (s.selectedMeshAssetId) selectedMeshAssetId = s.selectedMeshAssetId;
			if (s.selectedImageAssetId !== undefined) selectedImageAssetId = s.selectedImageAssetId;
			if (s.selectedSequenceAssetId !== undefined) selectedSequenceAssetId = s.selectedSequenceAssetId;
			if (s.selectedSequenceClipId !== undefined) selectedSequenceClipId = s.selectedSequenceClipId;
			if (s.selectedSequenceLookPresetId !== undefined) selectedSequenceLookPresetId = s.selectedSequenceLookPresetId;
			if (s.sequenceMaxPointsPerFrame != null) sequenceMaxPointsPerFrame = s.sequenceMaxPointsPerFrame;
			if (s.sequenceAutoCenter != null) sequenceAutoCenter = s.sequenceAutoCenter;
			if (s.sequenceFitHeightEnabled != null) sequenceFitHeightEnabled = s.sequenceFitHeightEnabled;
			if (s.sequenceFitHeight != null) sequenceFitHeight = s.sequenceFitHeight;
			if (s.sequenceScaleMultiplier != null) sequenceScaleMultiplier = s.sequenceScaleMultiplier;
			if (s.algorithm) algorithm = s.algorithm;
			if (s.sampleCount != null) sampleCount = s.sampleCount;
			if (s.depthScale != null) depthScale = s.depthScale;
			if (s.densityGamma != null) densityGamma = s.densityGamma;
			if (s.radiusFromLuminance != null) radiusFromLuminance = s.radiusFromLuminance;
			if (s.sizeVariation != null) sizeVariation = s.sizeVariation;
			if (s.outlierRadius != null) outlierRadius = s.outlierRadius;
			if (s.normalDisplacement != null) normalDisplacement = s.normalDisplacement;
			if (s.outerBackgroundColor !== undefined) outerBackgroundColor = s.outerBackgroundColor;
			if (s.innerBackgroundColor !== undefined) innerBackgroundColor = s.innerBackgroundColor;
			if (s.frameParams) frameParams = { ...DEFAULT_FRAME_PARAMS, ...s.frameParams };
			if (s.removeBg != null) removeBg = s.removeBg;
			if (s.bgProvider) bgProvider = s.bgProvider;
			if (s.bgModelIndex != null) bgModelIndex = s.bgModelIndex;
			if (s.serverBgModelId) serverBgModelId = s.serverBgModelId;
			if (s.useDepthMap != null) useDepthMap = s.useDepthMap;
			if (s.depthModelIndex != null) depthModelIndex = s.depthModelIndex;

			return true;
		} catch {
			return false;
		}
	}

	function resetSettings() {
		localStorage.removeItem(SETTINGS_KEY);
		renderParams = { ...DEFAULT_RENDER_PARAMS };
		bloomParams = { ...DEFAULT_BLOOM_PARAMS };
		mode = 'mesh';
		selectedMeshAssetId = DEMO_MESH_ASSETS[0]?.id ?? 'procedural';
		selectedImageAssetId = DEMO_IMAGE_ASSETS[0]?.id ?? '';
		selectedSequenceAssetId = DEMO_SEQUENCE_ASSETS[0]?.id ?? '';
		selectedSequenceClipId = '';
		selectedSequenceLookPresetId = 'painted-figure';
		sequenceMaxPointsPerFrame = 12000;
		sequenceAutoCenter = true;
		sequenceFitHeightEnabled = true;
		sequenceFitHeight = 2.2;
		sequenceScaleMultiplier = 1;
		algorithm = 'importance';
		sampleCount = 126000;
		depthScale = 0.07;
		densityGamma = 1.1;
		radiusFromLuminance = true;
		sizeVariation = 0.4;
		outlierRadius = 0;
		normalDisplacement = 0;
		outerBackgroundColor = null;
		innerBackgroundColor = null;
		frameParams = { ...DEFAULT_FRAME_PARAMS };
		removeBg = false;
		bgProvider = 'browser';
		bgModelIndex = 2;
		serverBgModelId = SERVER_BG_REMOVAL_MODELS[0].id;
		useDepthMap = false;
		depthModelIndex = 0;
		activeSequence = null;
		availableSequenceClips = [];
		sequenceBounds = null;
		sequenceReport = null;
		sequenceStatus = '';
		sequenceIsPlaying = false;
		glRenderer?.updateUniforms(renderParams);
		handleResample();
	}

	function clearProcessingIndicators() {
		processingStatus = '';
		processingProgress = null;
		processingEstimatedRemainingMs = null;
	}

	// ── Lifecycle ────────────────────────────────────────────────────────
	onMount(() => {
		if (navigator.storage?.persist) {
			navigator.storage.persist().then((granted) => {
				if (!granted) console.warn('Persistent storage not granted — models may be evicted');
			});
		}

		loadSettings();

		glRenderer = new GLPointRenderer({ params: renderParams });
		meshAdapter = new MeshAdapter();
		imageAdapter = new ImageAdapter();
		frameGenerator = new FrameGenerator();
		frameSequenceLoader = new FrameSequenceLoader();

		if (mode === 'sequence' && selectedSequenceAssetId) {
			void loadSequenceAsset(selectedSequenceAssetId);
		} else if (mode === 'image' && selectedImageAssetId) {
			void loadImageAsset(selectedImageAssetId);
		} else {
			void generateMeshSamples();
		}
		ready = true;

		return () => {
			cancelImagePipeline();
			activeRgbdPreparationCancel?.();
			activeRgbdPreparationCancel = null;
			if (pendingObjectUrl) {
				URL.revokeObjectURL(pendingObjectUrl);
				pendingObjectUrl = null;
			}
			glRenderer.dispose();
		};
	});

	// ── Sample generation ────────────────────────────────────────────────
	async function generateMeshSamples() {
		const version = ++meshLoadVersion;
		let shouldDisposeMesh = selectedMeshAssetId === 'procedural';
		let mesh: THREE.Mesh;
		try {
			mesh = await resolveDemoMesh();
		} catch (error) {
			console.error('Failed to load mesh asset, falling back to procedural mesh.', error);
			selectedMeshAssetId = 'procedural';
			shouldDisposeMesh = true;
			mesh = createProceduralMesh();
		}
		if (version !== meshLoadVersion) return;

		const samples = meshAdapter.sample(mesh, { count: sampleCount });
		glRenderer.setSamples(samples);

		if (shouldDisposeMesh) {
			mesh.geometry.dispose();
			const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
			for (const material of materials) {
				material.dispose();
			}
		}
	}

	function generateImageSamples(img: HTMLImageElement, depthMap: DepthMap | null = null) {
		if (algorithm === 'weighted-voronoi' && sampleCount > MAX_WEIGHTED_VORONOI_SAMPLES) {
			console.warn(
				`Weighted Voronoi is capped at ${MAX_WEIGHTED_VORONOI_SAMPLES} samples; requested ${sampleCount}.`,
			);
		}

		const opts: ImageAdapterOptions = {
			count: sampleCount,
			algorithm,
			baseRadius: 1.0,
			seed: 42,
			depthScale,
			densityGamma,
			radiusFromLuminance,
			sizeVariation,
			outlierRadius,
			depthMap: useDepthMap && depthMap ? depthMap : undefined,
			normalDisplacement,
		};
		const imageSamples = imageAdapter.sample(img, opts);

		if (frameParams.enabled) {
			const aspect = img.naturalWidth / img.naturalHeight;
			const frameSamples = frameGenerator.generate(aspect, imageSamples.count, frameParams, 42);
			glRenderer.setSamples(mergeSampleSets(imageSamples, frameSamples));
		} else {
			glRenderer.setSamples(imageSamples);
		}
	}

	async function loadSequenceAsset(assetId: string) {
		const version = ++sequenceLoadVersion;
		const requestedClipId = selectedSequenceClipId;
		activeRgbdPreparationCancel?.();
		activeRgbdPreparationCancel = null;
		clearProcessingIndicators();
		selectedSequenceAssetId = assetId;
		sequenceStatus = 'Loading sequence...';
		availableSequenceClips = [];
		activeSequence = null;
		sequenceBounds = null;
		sequenceReport = null;
		sequenceIsPlaying = false;

		const asset = DEMO_SEQUENCE_ASSETS.find((entry) => entry.id === assetId);
		if (!asset) {
			if (version !== sequenceLoadVersion) return;
			sequenceStatus = `Unknown sequence asset: ${assetId}`;
			return;
		}

		try {
			if (asset.kind === 'rgbd-sequence') {
				const { playbackSource, rawFrames, fetchMs } = asset.source === 'derived-image'
					? await resolveDerivedRgbdSequence(asset, version)
					: await resolveManifestRgbdSequence(asset);
				if (version !== sequenceLoadVersion) return;

				const initialClipId = resolveInitialSequenceClipId(
					playbackSource.manifest.clips,
					requestedClipId,
					asset,
				);
				const sampling = {
					sampleCount,
					algorithm,
					depthScale,
					densityGamma,
					radiusFromLuminance,
					sizeVariation,
					outlierRadius,
					normalDisplacement,
					alphaCutoff: asset.motion?.alphaCutoff,
					frameParams,
				} satisfies Parameters<typeof prepareRgbdSequenceData>[0]['sampling'];
				const preparedData = await prepareRgbdSequenceForPlayback({
					rawFrames,
					fetchMs,
					sampling,
					version,
				});
				if (version !== sequenceLoadVersion) return;
				const prepared = await loadPreparedRgbdSequence({
					source: playbackSource,
					preparedData,
					frameSequenceLoader,
					initialClipId,
					autoPlay: true,
				});
				if (version !== sequenceLoadVersion) return;

				activeSequence = prepared.sequence;
				availableSequenceClips = playbackSource.manifest.clips ?? [];
				selectedSequenceClipId = prepared.sequence.getCurrentClip().id;
				sequenceIsPlaying = prepared.sequence.isPlaying();
				sequenceBounds = prepared.bounds;
				sequenceReport = prepared.report;
				sequenceStatus = buildRgbdSequenceStatus(playbackSource.manifest, prepared.report);
				clearProcessingIndicators();
				glRenderer.setSamples(prepared.sequence.getPlaybackSamples());
			} else {
				const playbackSource = await loadPointSequencePlaybackSource(asset);
				if (version !== sequenceLoadVersion) return;

				const initialClipId = resolveInitialSequenceClipId(
					playbackSource.manifest.clips,
					requestedClipId,
					asset,
				);

				const prepared = await loadPreparedPointSequence({
					source: playbackSource,
					frameSequenceLoader,
					maxPointsPerFrame: sequenceMaxPointsPerFrame,
					colorGradeId: getSequenceLookPreset(selectedSequenceLookPresetId)?.colorGradeId ?? 'source',
					initialClipId,
					autoPlay: true,
				});
				if (version !== sequenceLoadVersion) return;

				activeSequence = prepared.sequence;
				availableSequenceClips = playbackSource.manifest.clips ?? [];
				selectedSequenceClipId = prepared.sequence.getCurrentClip().id;
				sequenceIsPlaying = prepared.sequence.isPlaying();
				sequenceBounds = prepared.bounds;
				sequenceReport = prepared.report;
				sequenceStatus = buildPointSequenceStatus(playbackSource.manifest, prepared.report);
				clearProcessingIndicators();
				glRenderer.setSamples(prepared.sequence.getPlaybackSamples());
			}
		} catch (error) {
			if (version !== sequenceLoadVersion) return;
			console.error('Failed to load sequence.', error);
			activeSequence = null;
			availableSequenceClips = [];
			sequenceBounds = null;
			sequenceReport = null;
			sequenceIsPlaying = false;
			clearProcessingIndicators();
			sequenceStatus = error instanceof Error ? error.message : 'Failed to load sequence.';
		}
	}

	async function resolveRgbdFrames(
		cacheKey: string,
		playbackSource: Awaited<ReturnType<typeof loadRgbdSequencePlaybackSource>>,
	): Promise<{ frames: readonly RgbdSequenceFrameData[]; fetchMs: number }> {
		const cached = rgbdSequenceFrameCache.get(cacheKey);
		if (cached) return { frames: cached, fetchMs: 0 };
		const fetchStart = performance.now();
		const frames = await Promise.all(
			Array.from({ length: playbackSource.manifest.frameCount }, (_, frameIndex) => playbackSource.loadFrame(frameIndex)),
		);
		rgbdSequenceFrameCache.set(cacheKey, frames);
		return { frames, fetchMs: performance.now() - fetchStart };
	}

	async function resolveManifestRgbdSequence(asset: Extract<DemoSequenceAsset, { kind: 'rgbd-sequence'; source: 'manifest' }>): Promise<{
		playbackSource: Awaited<ReturnType<typeof loadRgbdSequencePlaybackSource>>;
		rawFrames: readonly RgbdSequenceFrameData[];
		fetchMs: number;
	}> {
		const playbackSource = await loadRgbdSequencePlaybackSource(asset);
		const { frames: rawFrames, fetchMs } = await resolveRgbdFrames(asset.id, playbackSource);
		return { playbackSource, rawFrames, fetchMs };
	}

	async function resolveDerivedRgbdSequence(
		asset: DemoDerivedRgbdSequenceAsset,
		version: number,
	): Promise<{
		playbackSource: ReturnType<typeof buildDerivedRgbdSequence>['source'];
		rawFrames: readonly RgbdSequenceFrameData[];
		fetchMs: number;
	}> {
		const cacheKey = getDerivedRgbdSequenceCacheKey(asset);
		const cached = derivedRgbdSequenceCache.get(cacheKey);
		if (cached) {
			return { playbackSource: cached.source, rawFrames: cached.rawFrames, fetchMs: 0 };
		}

		let sourceImage = await resolveDemoImageAssetImage(asset.imageAssetId);
		if (version !== sequenceLoadVersion) {
			return Promise.reject(new Error('Sequence load superseded.'));
		}

		if (removeBg) {
			sourceImage = await loadBgRemovedImage(sourceImage, version);
			if (version !== sequenceLoadVersion) {
				return Promise.reject(new Error('Sequence load superseded.'));
			}
		}

		const depthMap = useDepthMap
			? await loadDepthMap(sourceImage, depthModelIndex, version)
			: null;
		if (version !== sequenceLoadVersion) {
			return Promise.reject(new Error('Sequence load superseded.'));
		}

		const derived = buildDerivedRgbdSequence({
			asset,
			raster: extractRasterFromImage(sourceImage),
			depthMap: depthMap ?? undefined,
		});
		derivedRgbdSequenceCache.set(cacheKey, derived);
		return {
			playbackSource: derived.source,
			rawFrames: derived.rawFrames,
			fetchMs: 0,
		};
	}

	function getDerivedRgbdSequenceCacheKey(asset: DemoDerivedRgbdSequenceAsset): string {
		const bgKey = removeBg
			? getBackgroundRemovalCacheKey(bgProvider, bgModelIndex, serverBgModelId)
			: 'bg-off';
		const depthKey = useDepthMap
			? `depth-${depthModelIndex}`
			: 'depth-luminance';
		return `${asset.id}::${bgKey}::${depthKey}`;
	}

	async function prepareRgbdSequenceForPlayback(options: {
		rawFrames: readonly RgbdSequenceFrameData[];
		fetchMs: number;
		sampling: Parameters<typeof prepareRgbdSequenceData>[0]['sampling'];
		version: number;
	}) {
		const estimateMs = estimateRgbdSequencePreparationMs({
			frameCount: options.rawFrames.length,
			sampling: options.sampling,
		});
		processingProgress = 0;
		processingEstimatedRemainingMs = estimateMs;
		processingStatus = buildPreparationStartStatus(options.sampling.algorithm, estimateMs);

		if (typeof Worker === 'undefined') {
			return prepareRgbdSequenceData({
				rawFrames: options.rawFrames,
				sampling: options.sampling,
				fetchMs: options.fetchMs,
				frameGenerator,
				onProgress: (progress) => {
					if (options.version !== sequenceLoadVersion) return;
					processingProgress = progress.overallProgress;
					processingEstimatedRemainingMs = progress.estimatedRemainingMs;
					processingStatus = buildPreparationProgressStatus(progress);
				},
			});
		}

		const task = prepareRgbdSequenceDataInWorker({
			rawFrames: options.rawFrames,
			sampling: options.sampling,
			fetchMs: options.fetchMs,
			onProgress: (progress) => {
				if (options.version !== sequenceLoadVersion) return;
				processingProgress = progress.overallProgress;
				processingEstimatedRemainingMs = progress.estimatedRemainingMs;
				processingStatus = buildPreparationProgressStatus(progress);
			},
		});
		activeRgbdPreparationCancel = task.cancel;

		try {
			return await task.promise;
		} finally {
			if (activeRgbdPreparationCancel === task.cancel) {
				activeRgbdPreparationCancel = null;
			}
		}
	}

	function buildPointSequenceStatus(
		manifest: { frameCount: number; fps: number },
		report: PreparedPointSequenceReport,
	): string {
		const pointRange = `${report.preparedPointCountRange[0].toLocaleString()}-${report.preparedPointCountRange[1].toLocaleString()} pts/frame`;
		const capSuffix = report.maxPointsPerFrame
			? `, cap ${report.maxPointsPerFrame.toLocaleString()}`
			: '';
		return `Loaded ${manifest.frameCount} frames at ${manifest.fps} fps in ${report.totalLoadMs.toFixed(0)} ms (${pointRange}${capSuffix}).`;
	}

	function buildRgbdSequenceStatus(
		manifest: { frameCount: number; fps: number },
		report: PreparedRgbdSequenceReport,
	): string {
		return `Loaded ${manifest.frameCount} RGBD frames at ${manifest.fps} fps in ${report.totalLoadMs.toFixed(0)} ms. ${buildRgbdSequenceLookStatus(report, renderParams)}`;
	}

	function buildPreparationStartStatus(
		sequenceAlgorithm: 'rejection' | 'importance' | 'weighted-voronoi',
		estimateMs: number,
	): string {
		if (estimateMs < 5_000) {
			return 'Preparing RGBD sequence...';
		}
		return `Preparing RGBD sequence with ${sequenceAlgorithm}... rough estimate ${formatDuration(estimateMs)}.`;
	}

	function buildPreparationProgressStatus(progress: {
		message: string;
		overallProgress: number;
		estimatedRemainingMs: number;
	}): string {
		const percent = Math.round(progress.overallProgress * 100);
		const remaining = progress.estimatedRemainingMs >= 5_000
			? ` ${formatDuration(progress.estimatedRemainingMs)} remaining.`
			: '';
		return `${progress.message} ${percent}% complete.${remaining}`;
	}

	function formatDuration(ms: number): string {
		const totalSeconds = Math.max(1, Math.round(ms / 1000));
		if (totalSeconds < 60) {
			return `~${totalSeconds}s`;
		}
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = totalSeconds % 60;
		return seconds === 0 ? `~${minutes}m` : `~${minutes}m ${seconds}s`;
	}

	// ── Pipeline ─────────────────────────────────────────────────────────
	function cancelImagePipeline() {
		imagePipelineVersion += 1;
		clearProcessingIndicators();
	}

	async function resolveDemoMesh(): Promise<THREE.Mesh> {
		if (selectedMeshAssetId === 'procedural') {
			return createProceduralMesh();
		}

		const cached = meshAssetCache.get(selectedMeshAssetId);
		if (cached) return cached;

		const asset = DEMO_MESH_ASSETS.find((entry) => entry.id === selectedMeshAssetId);
		if (!asset) {
			throw new Error(`Unknown mesh asset: ${selectedMeshAssetId}`);
		}

		const loader = new GLTFLoader();
		const gltf = await loader.loadAsync(asset.src);
		gltf.scene.updateMatrixWorld(true);

		const mesh = pickPrimaryMesh(gltf.scene);
		if (!mesh) {
			throw new Error(`No mesh found in asset: ${asset.src}`);
		}

		meshAssetCache.set(asset.id, mesh);
		return mesh;
	}

	function createProceduralMesh(): THREE.Mesh {
		return new THREE.Mesh(
			new THREE.TorusKnotGeometry(0.6, 0.2, 128, 32),
			new THREE.MeshStandardMaterial({ color: 0xe8c872 }),
		);
	}

	async function loadImageAsset(assetId: string) {
		const version = ++imageLoadVersion;
		cancelImagePipeline();
		selectedImageAssetId = assetId;
		if (!assetId) return;

		try {
			const image = await resolveDemoImageAssetImage(assetId);
			if (version !== imageLoadVersion) return;
			originalImage = image;
			if (mode === 'image') void rebuildImagePipeline();
		} catch (error) {
			if (version !== imageLoadVersion) return;
			console.error('Failed to load image asset.', error);
			selectedImageAssetId = '';
		}
	}

	async function resolveDemoImageAssetImage(assetId: string): Promise<HTMLImageElement> {
		const cached = imageAssetCache.get(assetId);
		if (cached) {
			return cached;
		}

		const asset = DEMO_IMAGE_ASSETS.find((entry) => entry.id === assetId);
		if (!asset) {
			throw new Error(`Unknown image asset: ${assetId}`);
		}

		const image = await loadImageFromUrl(asset.src);
		imageAssetCache.set(asset.id, image);
		return image;
	}

	function getCachedBgImage(source: HTMLImageElement, cacheKey: string): HTMLImageElement | null {
		return bgRemovalCache.get(source)?.get(cacheKey) ?? null;
	}

	function setCachedBgImage(source: HTMLImageElement, cacheKey: string, image: HTMLImageElement) {
		const byModel = bgRemovalCache.get(source) ?? new Map<string, HTMLImageElement>();
		byModel.set(cacheKey, image);
		bgRemovalCache.set(source, byModel);
	}

	function getCachedDepthMap(source: HTMLImageElement, modelIndex: number): DepthMap | null {
		return depthMapCache.get(source)?.get(modelIndex) ?? null;
	}

	function setCachedDepthMap(source: HTMLImageElement, modelIndex: number, depthMap: DepthMap) {
		const byModel = depthMapCache.get(source) ?? new Map<number, DepthMap>();
		byModel.set(modelIndex, depthMap);
		depthMapCache.set(source, byModel);
	}

	function isLatestImagePipeline(version: number): boolean {
		return version === imagePipelineVersion;
	}

	async function loadBgRemovedImage(
		source: HTMLImageElement,
		version: number,
	): Promise<HTMLImageElement> {
		const cacheKey = getBackgroundRemovalCacheKey(bgProvider, bgModelIndex, serverBgModelId);
		const cached = getCachedBgImage(source, cacheKey);
		if (cached) return cached;

		const model =
			bgProvider === 'server'
				? getServerBgRemovalModel(serverBgModelId)
				: getBrowserBgRemovalModel(bgModelIndex);
		if (!model) {
			throw new Error('Invalid background removal model selection');
		}
		processingStatus = `Removing background with ${model.label} (${model.size})...`;

		const result = await removeImageBackgroundWithProvider(source, {
			provider: bgProvider,
			browserModelIndex: bgModelIndex,
			serverModelId: serverBgModelId,
			onProgress: (progress) => {
				if (isLatestImagePipeline(version)) {
					processingStatus = `Removing background... ${Math.round(progress * 100)}%`;
				}
			},
		});

		if (!isLatestImagePipeline(version)) return result.image;

		if (result.usedFallback && bgProvider === 'browser') {
			// Don't cache fallback result under the requested model's key —
			// it's ISNet's output, not the requested model's
			processingStatus = `${model.label} unavailable on this device — used ISNet`;
			// Cache under ISNet's index (0) so it's reusable
			setCachedBgImage(source, getBackgroundRemovalCacheKey('browser', 0, serverBgModelId), result.image);
		} else {
			setCachedBgImage(source, cacheKey, result.image);
		}
		return result.image;
	}

	async function loadDepthMap(
		source: HTMLImageElement, modelIndex: number, version: number,
	): Promise<DepthMap> {
		const cached = getCachedDepthMap(source, modelIndex);
		if (cached) return cached;

		const { estimateDepth } = await import('$lib/engine/preprocessing/DepthEstimation.js');
		const depthMap = await estimateDepth(source, {
			modelIndex,
			onProgress: (status) => {
				if (isLatestImagePipeline(version)) processingStatus = status;
			},
		});

		if (!isLatestImagePipeline(version)) return depthMap;
		setCachedDepthMap(source, modelIndex, depthMap);
		return depthMap;
	}

	async function rebuildImagePipeline() {
		if (!originalImage) return;

		const version = ++imagePipelineVersion;
		let activeImage = originalImage;
		let depthMap: DepthMap | null = null;

		if (removeBg) {
			try {
				activeImage = await loadBgRemovedImage(originalImage, version);
			} catch (err) {
				if (!isLatestImagePipeline(version)) return;
				console.error('Background removal failed:', err);
				removeBg = false;
				activeImage = originalImage;
			}
		}

		if (useDepthMap) {
			try {
				depthMap = await loadDepthMap(activeImage, depthModelIndex, version);
			} catch (err) {
				if (!isLatestImagePipeline(version)) return;
				console.error('Depth estimation failed:', err);
				useDepthMap = false;
				depthMap = null;
			}
		}

		if (!isLatestImagePipeline(version)) return;

		processingStatus = '';
		if (mode === 'image') {
			generateImageSamples(activeImage, depthMap);
		}
	}

	function resolveInitialSequenceClipId(
		clips: readonly AnimationClip[] | undefined,
		requestedClipId: string,
		asset: DemoSequenceAsset,
	): string | undefined {
		if (!clips || clips.length === 0) {
			return undefined;
		}

		const clipIds = new Set(clips.map((clip) => clip.id));
		if (requestedClipId && clipIds.has(requestedClipId)) {
			return requestedClipId;
		}
		if (asset.initialClipId && clipIds.has(asset.initialClipId)) {
			return asset.initialClipId;
		}
		return clips[0]?.id;
	}

	// ── Handlers ─────────────────────────────────────────────────────────
	function handleResample() {
		if (mode === 'mesh') {
			cancelImagePipeline();
			void generateMeshSamples();
		} else if (mode === 'sequence') {
			void loadSequenceAsset(selectedSequenceAssetId);
		} else {
			void rebuildImagePipeline();
		}
	}

	function handleModeChange(newMode: 'mesh' | 'image' | 'sequence') {
		mode = newMode;
		if (newMode === 'mesh') {
			cancelImagePipeline();
			void generateMeshSamples();
		} else if (newMode === 'sequence') {
			const preset = selectedSequenceAssetKind === 'point-sequence'
				? getSequenceLookPreset(selectedSequenceLookPresetId)
				: null;
			if (preset) {
				handleRenderParamsChange({ ...renderParams, ...preset.renderParams });
			}
			cancelImagePipeline();
			if (activeSequence) {
				glRenderer.setSamples(activeSequence.getPlaybackSamples());
			} else if (selectedSequenceAssetId) {
				void loadSequenceAsset(selectedSequenceAssetId);
			}
		} else if (!originalImage && selectedImageAssetId) {
			void loadImageAsset(selectedImageAssetId);
		} else if (originalImage) {
			void rebuildImagePipeline();
		}
	}

	function handleAlgorithmChange(newAlgo: 'rejection' | 'importance' | 'weighted-voronoi') {
		algorithm = newAlgo;
		if (mode === 'image' && originalImage) void rebuildImagePipeline();
	}

	function handleSampleCountChange(count: number) {
		sampleCount = count;
	}

	function handleImageUpload(file: File) {
		imageLoadVersion += 1;
		cancelImagePipeline();
		if (pendingObjectUrl) {
			URL.revokeObjectURL(pendingObjectUrl);
			pendingObjectUrl = null;
		}
		selectedImageAssetId = '';

		const img = new Image();
		const objectUrl = URL.createObjectURL(file);

		img.onload = () => {
			originalImage = img;
			URL.revokeObjectURL(objectUrl);
			if (pendingObjectUrl === objectUrl) pendingObjectUrl = null;
			if (mode === 'image') void rebuildImagePipeline();
		};

		img.onerror = () => {
			URL.revokeObjectURL(objectUrl);
			if (pendingObjectUrl === objectUrl) pendingObjectUrl = null;
		};

		pendingObjectUrl = objectUrl;
		img.src = objectUrl;
	}

	async function handleRemoveBg(enabled: boolean) {
		removeBg = enabled;
		if (mode === 'sequence' && selectedSequenceAssetSource === 'derived-image' && selectedSequenceAssetId) {
			void loadSequenceAsset(selectedSequenceAssetId);
			return;
		}
		if (!originalImage) return;
		await rebuildImagePipeline();
	}

	async function handleBgModelChange(index: number) {
		bgModelIndex = index;
		if (mode === 'sequence' && selectedSequenceAssetSource === 'derived-image' && removeBg && selectedSequenceAssetId) {
			void loadSequenceAsset(selectedSequenceAssetId);
			return;
		}
		if (bgProvider !== 'browser' || !removeBg || !originalImage) return;
		await rebuildImagePipeline();
	}

	async function handleBgProviderChange(provider: BgRemovalProvider) {
		bgProvider = provider;
		if (mode === 'sequence' && selectedSequenceAssetSource === 'derived-image' && removeBg && selectedSequenceAssetId) {
			void loadSequenceAsset(selectedSequenceAssetId);
			return;
		}
		if (!removeBg || !originalImage) return;
		await rebuildImagePipeline();
	}

	async function handleServerBgModelChange(modelId: string) {
		serverBgModelId = modelId;
		if (mode === 'sequence' && selectedSequenceAssetSource === 'derived-image' && bgProvider === 'server' && removeBg && selectedSequenceAssetId) {
			void loadSequenceAsset(selectedSequenceAssetId);
			return;
		}
		if (bgProvider !== 'server' || !removeBg || !originalImage) return;
		await rebuildImagePipeline();
	}

	async function handleEstimateDepth(enabled: boolean) {
		useDepthMap = enabled;
		if (mode === 'sequence' && selectedSequenceAssetSource === 'derived-image' && selectedSequenceAssetId) {
			void loadSequenceAsset(selectedSequenceAssetId);
			return;
		}
		if (!originalImage) return;
		await rebuildImagePipeline();
	}

	async function handleDepthModelChange(index: number) {
		depthModelIndex = index;
		if (mode === 'sequence' && selectedSequenceAssetSource === 'derived-image' && useDepthMap && selectedSequenceAssetId) {
			void loadSequenceAsset(selectedSequenceAssetId);
			return;
		}
		if (!useDepthMap || !originalImage) return;
		await rebuildImagePipeline();
	}

	function handleOuterBackgroundColorChange(color: string | null) {
		outerBackgroundColor = color;
	}

	function handleInnerBackgroundColorChange(color: string | null) {
		innerBackgroundColor = color;
	}

	function handleFrameParamsChange(params: FrameParams) {
		frameParams = params;
		if (mode === 'image' && originalImage) void rebuildImagePipeline();
	}

	function handleRenderParamsChange(params: RenderParams) {
		renderParams = params;
		glRenderer?.updateUniforms(params);
	}

	function handleMeshAssetChange(assetId: string) {
		selectedMeshAssetId = assetId;
		if (mode === 'mesh') void generateMeshSamples();
	}

	function handleImageAssetChange(assetId: string) {
		selectedImageAssetId = assetId;
		if (assetId) void loadImageAsset(assetId);
	}

	function handleSequenceAssetChange(assetId: string) {
		selectedSequenceAssetId = assetId;
		selectedSequenceClipId = '';
		const asset = DEMO_SEQUENCE_ASSETS.find((entry) => entry.id === assetId);
		if (asset?.kind === 'point-sequence') {
			const preset = getSequenceLookPreset(selectedSequenceLookPresetId);
			if (preset) {
				handleRenderParamsChange({ ...renderParams, ...preset.renderParams });
			}
		}
		if (mode === 'sequence' && assetId) void loadSequenceAsset(assetId);
	}

	function handleSequenceLookPresetChange(presetId: string) {
		selectedSequenceLookPresetId = presetId;
		if (selectedSequenceAssetKind !== 'point-sequence') return;
		const preset = getSequenceLookPreset(presetId);
		if (preset) {
			handleRenderParamsChange({ ...renderParams, ...preset.renderParams });
		}
		if (mode === 'sequence' && selectedSequenceAssetId) {
			void loadSequenceAsset(selectedSequenceAssetId);
		}
	}

	function handleSequenceMaxPointsPerFrameChange(maxPointsPerFrame: number) {
		sequenceMaxPointsPerFrame = maxPointsPerFrame;
	}

	function handleSequenceAutoCenterChange(enabled: boolean) {
		sequenceAutoCenter = enabled;
	}

	function handleSequenceFitHeightEnabledChange(enabled: boolean) {
		sequenceFitHeightEnabled = enabled;
	}

	function handleSequenceFitHeightChange(height: number) {
		sequenceFitHeight = height;
	}

	function handleSequenceScaleMultiplierChange(scale: number) {
		sequenceScaleMultiplier = scale;
	}

	function handleSequenceClipChange(clipId: string) {
		if (!activeSequence) return;
		selectedSequenceClipId = clipId;
		activeSequence.setClip(clipId);
		activeSequence.play();
		sequenceIsPlaying = true;
		glRenderer.setSamples(activeSequence.getPlaybackSamples());
		sequenceStatus = `Playing clip "${clipId}".`;
	}

	function handleSequencePlaybackToggle() {
		if (!activeSequence) {
			if (selectedSequenceAssetId) void loadSequenceAsset(selectedSequenceAssetId);
			return;
		}

		if (sequenceIsPlaying) {
			activeSequence.pause();
			sequenceIsPlaying = false;
			sequenceStatus = 'Playback paused.';
		} else {
			activeSequence.play();
			sequenceIsPlaying = true;
			sequenceStatus = `Playing clip "${selectedSequenceClipId || activeSequence.getCurrentClip().id}".`;
		}
	}

	function handleSequenceRestart() {
		if (!activeSequence) {
			if (selectedSequenceAssetId) void loadSequenceAsset(selectedSequenceAssetId);
			return;
		}

		const clipId = selectedSequenceClipId || activeSequence.getCurrentClip().id;
		activeSequence.setClip(clipId);
		activeSequence.play();
		sequenceIsPlaying = true;
		sequenceStatus = `Restarted clip "${clipId}".`;
		glRenderer.setSamples(activeSequence.getPlaybackSamples());
	}

	function handleSequenceAnimationFrame(deltaMs: number): boolean {
		if (!activeSequence || mode !== 'sequence' || !sequenceIsPlaying) {
			return false;
		}

		const tick = activeSequence.tick(deltaMs);
		if (tick.copiedFrame) {
			glRenderer.setSamples(activeSequence.getPlaybackSamples());
		}
		if (!tick.playing) {
			sequenceIsPlaying = false;
			sequenceStatus = tick.ended
				? `Clip "${tick.clipId}" reached its endpoint.`
				: 'Playback paused.';
		}

		return tick.copiedFrame;
	}

	function pickPrimaryMesh(root: THREE.Object3D): THREE.Mesh | null {
		let bestMesh: THREE.Mesh | null = null;
		let bestVertexCount = -1;

		root.traverse((candidate) => {
			if (!(candidate instanceof THREE.Mesh)) return;
			const vertexCount = candidate.geometry.getAttribute('position')?.count ?? 0;
			if (vertexCount > bestVertexCount) {
				bestVertexCount = vertexCount;
				bestMesh = candidate;
			}
		});

		return bestMesh;
	}

	function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
		const image = new Image();
		return new Promise<HTMLImageElement>((resolve, reject) => {
			image.onload = () => resolve(image);
			image.onerror = () => reject(new Error(`Failed to load image asset: ${url}`));
			image.src = url;
		});
	}
</script>

<div class="relative h-screen w-screen" style:background-color={outerBackgroundColor ?? '#000000'}>
	{#if ready}
		<Canvas>
			<PointCloudScene
				renderer={glRenderer}
				{bloomParams}
				{outerBackgroundColor}
				{innerBackgroundColor}
				{innerPlaneSize}
				{pointCloudPosition}
				pointCloudScale={pointCloudScale}
				onAnimationFrame={handleSequenceAnimationFrame}
				animationActive={sequenceAnimationActive}
			/>
		</Canvas>

		<Controls
			bind:renderParams
			bind:bloomParams
			bind:mode
			{selectedMeshAssetId}
			{selectedImageAssetId}
			{selectedSequenceAssetId}
			{selectedSequenceAssetKind}
			{selectedSequenceAssetSource}
			{selectedSequenceClipId}
			{selectedSequenceLookPresetId}
			availableSequenceClipIds={availableSequenceClipIds}
			{sequenceMaxPointsPerFrame}
			{sequenceAutoCenter}
			{sequenceFitHeightEnabled}
			{sequenceFitHeight}
			{sequenceScaleMultiplier}
			{sequenceReport}
			{sequenceBounds}
			sequenceLookPresets={SEQUENCE_LOOK_PRESETS}
			{sequenceStatus}
			{sequenceIsPlaying}
			bind:algorithm
			bind:sampleCount
			bind:depthScale
			bind:densityGamma
			bind:radiusFromLuminance
			bind:sizeVariation
			bind:outlierRadius
			bind:normalDisplacement
			bind:removeBg
			bind:bgProvider
			bind:bgModelIndex
			bind:serverBgModelId
			bind:useDepthMap
			bind:depthModelIndex
			bind:outerBackgroundColor
			bind:innerBackgroundColor
			bind:frameParams
			meshAssets={DEMO_MESH_ASSETS}
			imageAssets={DEMO_IMAGE_ASSETS}
			sequenceAssets={DEMO_SEQUENCE_ASSETS}
			bgModels={BG_REMOVAL_MODELS}
			serverBgModels={SERVER_BG_REMOVAL_MODELS}
			depthModels={DEPTH_MODELS}
			{processingStatus}
			hasImage={originalImage !== null}
			onRenderParamsChange={handleRenderParamsChange}
			onModeChange={handleModeChange}
			onMeshAssetChange={handleMeshAssetChange}
			onImageAssetChange={handleImageAssetChange}
			onSequenceAssetChange={handleSequenceAssetChange}
			onSequenceLookPresetChange={handleSequenceLookPresetChange}
			onSequenceMaxPointsPerFrameChange={handleSequenceMaxPointsPerFrameChange}
			onSequenceAutoCenterChange={handleSequenceAutoCenterChange}
			onSequenceFitHeightEnabledChange={handleSequenceFitHeightEnabledChange}
			onSequenceFitHeightChange={handleSequenceFitHeightChange}
			onSequenceScaleMultiplierChange={handleSequenceScaleMultiplierChange}
			onSequenceClipChange={handleSequenceClipChange}
			onSequencePlaybackToggle={handleSequencePlaybackToggle}
			onSequenceRestart={handleSequenceRestart}
			onAlgorithmChange={handleAlgorithmChange}
			onSampleCountChange={handleSampleCountChange}
			onImageUpload={handleImageUpload}
			onResample={handleResample}
			onRemoveBg={handleRemoveBg}
			onBgProviderChange={handleBgProviderChange}
			onBgModelChange={handleBgModelChange}
			onServerBgModelChange={handleServerBgModelChange}
			onEstimateDepth={handleEstimateDepth}
			onDepthModelChange={handleDepthModelChange}
			onOuterBackgroundColorChange={handleOuterBackgroundColorChange}
			onInnerBackgroundColorChange={handleInnerBackgroundColorChange}
			onFrameParamsChange={handleFrameParamsChange}
			onSaveSettings={saveSettings}
			onResetSettings={resetSettings}
		/>

		{#if processingStatus}
			<div class="fixed bottom-4 left-4 z-50 flex min-w-[18rem] max-w-[24rem] flex-col gap-2 rounded bg-black/80 px-4 py-3 font-mono text-xs text-white/80 backdrop-blur">
				<div>{processingStatus}</div>
				{#if processingProgress !== null}
					<div class="h-1.5 overflow-hidden rounded bg-white/10">
						<div
							class="h-full bg-blue-400/80 transition-[width] duration-150"
							style={`width: ${Math.max(2, Math.round(processingProgress * 100))}%`}
						></div>
					</div>
					<div class="text-white/45">
						{Math.round(processingProgress * 100)}%
						{#if processingEstimatedRemainingMs !== null && processingEstimatedRemainingMs >= 5_000}
							· {formatDuration(processingEstimatedRemainingMs)} remaining
						{/if}
					</div>
				{/if}
			</div>
		{/if}
	{/if}
</div>
