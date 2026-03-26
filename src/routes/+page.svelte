<script lang="ts">
	import { onMount } from 'svelte';
	import { Canvas } from '@threlte/core';
	import * as THREE from 'three';
	import PointCloudScene from '$lib/scene/PointCloudScene.svelte';
	import Controls from '$lib/ui/Controls.svelte';
	import { GLPointRenderer } from '$lib/engine/render/adapters/GLPointRenderer.js';
	import { MeshAdapter } from '$lib/engine/ingest/MeshAdapter.js';
	import { ImageAdapter } from '$lib/engine/ingest/ImageAdapter.js';
	import { DEFAULT_RENDER_PARAMS, DEFAULT_BLOOM_PARAMS } from '$lib/engine/render/types.js';
	import type { RenderParams, BloomParams } from '$lib/engine/render/types.js';
	import type { ImageAdapterOptions } from '$lib/engine/ingest/types.js';
	import type { DepthMap } from '$lib/engine/preprocessing/DepthEstimation.js';
	import type { BackgroundRemovalResult } from '$lib/engine/preprocessing/BackgroundRemoval.js';
	import { DEPTH_MODELS } from '$lib/engine/preprocessing/DepthEstimation.js';
	import { BG_REMOVAL_MODELS } from '$lib/engine/preprocessing/BackgroundRemoval.js';
	import { FrameGenerator, DEFAULT_FRAME_PARAMS } from '$lib/engine/processing/FrameGenerator.js';
	import type { FrameParams } from '$lib/engine/processing/FrameGenerator.js';
	import { mergeSampleSets } from '$lib/engine/core/SampleSet.js';

	// ── Tunable state ────────────────────────────────────────────────────
	let renderParams = $state<RenderParams>({ ...DEFAULT_RENDER_PARAMS });
	let bloomParams = $state<BloomParams>({ ...DEFAULT_BLOOM_PARAMS });
	let mode = $state<'mesh' | 'image'>('mesh');
	let algorithm = $state<'rejection' | 'importance'>('importance');
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
	let bgModelIndex = $state(2); // ISNet fp16 — best quality without WebGPU
	let useDepthMap = $state(false);
	let depthModelIndex = $state(0);

	// ── Internal state ───────────────────────────────────────────────────
	let processingStatus = $state('');
	let ready = $state(false);
	let glRenderer = $state<GLPointRenderer>(undefined!);
	let meshAdapter = $state<MeshAdapter>(undefined!);
	let imageAdapter = $state<ImageAdapter>(undefined!);
	let frameGenerator = $state<FrameGenerator>(undefined!);
	let originalImage = $state<HTMLImageElement | null>(null);
	let pendingObjectUrl = $state<string | null>(null);
	let imagePipelineVersion = 0;

	const bgRemovalCache = new WeakMap<HTMLImageElement, Map<number, HTMLImageElement>>();
	const depthMapCache = new WeakMap<HTMLImageElement, Map<number, DepthMap>>();

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
		mode: 'mesh' | 'image';
		algorithm: 'rejection' | 'importance';
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
		bgModelIndex: number;
		depthModelIndex: number;
	}

	function saveSettings() {
		const settings: SavedSettings = {
			renderParams, bloomParams, mode, algorithm, sampleCount,
			depthScale, densityGamma, radiusFromLuminance, sizeVariation,
			outlierRadius, normalDisplacement, outerBackgroundColor,
			innerBackgroundColor, frameParams, bgModelIndex, depthModelIndex,
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
			if (s.bgModelIndex != null) bgModelIndex = s.bgModelIndex;
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
		bgModelIndex = 2;
		depthModelIndex = 0;
		glRenderer?.updateUniforms(renderParams);
		handleResample();
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

		generateMeshSamples();
		ready = true;

		return () => {
			cancelImagePipeline();
			if (pendingObjectUrl) {
				URL.revokeObjectURL(pendingObjectUrl);
				pendingObjectUrl = null;
			}
			glRenderer.dispose();
		};
	});

	// ── Sample generation ────────────────────────────────────────────────
	function generateMeshSamples() {
		const geometry = new THREE.TorusKnotGeometry(0.6, 0.2, 128, 32);
		const material = new THREE.MeshStandardMaterial({ color: 0xe8c872 });
		const mesh = new THREE.Mesh(geometry, material);

		const samples = meshAdapter.sample(mesh, { count: sampleCount });
		glRenderer.setSamples(samples);

		geometry.dispose();
		material.dispose();
	}

	function generateImageSamples(img: HTMLImageElement, depthMap: DepthMap | null = null) {
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

	// ── Pipeline ─────────────────────────────────────────────────────────
	function cancelImagePipeline() {
		imagePipelineVersion += 1;
		processingStatus = '';
	}

	function getCachedBgImage(source: HTMLImageElement, modelIndex: number): HTMLImageElement | null {
		return bgRemovalCache.get(source)?.get(modelIndex) ?? null;
	}

	function setCachedBgImage(source: HTMLImageElement, modelIndex: number, image: HTMLImageElement) {
		const byModel = bgRemovalCache.get(source) ?? new Map<number, HTMLImageElement>();
		byModel.set(modelIndex, image);
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
		source: HTMLImageElement, modelIndex: number, version: number,
	): Promise<HTMLImageElement> {
		const cached = getCachedBgImage(source, modelIndex);
		if (cached) return cached;

		const model = BG_REMOVAL_MODELS[modelIndex];
		processingStatus = `Removing background with ${model.label} (${model.size})...`;

		const { removeImageBackground } = await import('$lib/engine/preprocessing/BackgroundRemoval.js');
		const result: BackgroundRemovalResult = await removeImageBackground(source, {
			modelIndex,
			onProgress: (progress) => {
				if (isLatestImagePipeline(version)) {
					processingStatus = `Removing background... ${Math.round(progress * 100)}%`;
				}
			},
		});

		if (!isLatestImagePipeline(version)) return result.image;

		if (result.usedFallback) {
			// Don't cache fallback result under the requested model's key —
			// it's ISNet's output, not the requested model's
			processingStatus = `${model.label} unavailable on this device — used ISNet`;
			// Cache under ISNet's index (0) so it's reusable
			setCachedBgImage(source, 0, result.image);
		} else {
			setCachedBgImage(source, modelIndex, result.image);
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
				activeImage = await loadBgRemovedImage(originalImage, bgModelIndex, version);
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

	// ── Handlers ─────────────────────────────────────────────────────────
	function handleResample() {
		if (mode === 'mesh') {
			cancelImagePipeline();
			generateMeshSamples();
		} else {
			void rebuildImagePipeline();
		}
	}

	function handleModeChange(newMode: 'mesh' | 'image') {
		mode = newMode;
		if (newMode === 'mesh') {
			cancelImagePipeline();
			generateMeshSamples();
		} else if (originalImage) {
			void rebuildImagePipeline();
		}
	}

	function handleAlgorithmChange(newAlgo: 'rejection' | 'importance') {
		algorithm = newAlgo;
		if (mode === 'image' && originalImage) void rebuildImagePipeline();
	}

	function handleSampleCountChange(count: number) {
		sampleCount = count;
	}

	function handleImageUpload(file: File) {
		if (pendingObjectUrl) {
			URL.revokeObjectURL(pendingObjectUrl);
			pendingObjectUrl = null;
		}

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
		if (!originalImage) return;
		await rebuildImagePipeline();
	}

	async function handleBgModelChange(index: number) {
		bgModelIndex = index;
		if (!removeBg || !originalImage) return;
		await rebuildImagePipeline();
	}

	async function handleEstimateDepth(enabled: boolean) {
		useDepthMap = enabled;
		if (!originalImage) return;
		await rebuildImagePipeline();
	}

	async function handleDepthModelChange(index: number) {
		depthModelIndex = index;
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
</script>

<svelte:head>
	<title>Chromatic — Point Engine</title>
</svelte:head>

<div class="relative h-screen w-screen" style:background-color={outerBackgroundColor ?? '#000000'}>
	{#if ready}
		<Canvas>
			<PointCloudScene
				renderer={glRenderer}
				{bloomParams}
				{outerBackgroundColor}
				{innerBackgroundColor}
				{innerPlaneSize}
			/>
		</Canvas>

		<Controls
			bind:renderParams
			bind:bloomParams
			bind:mode
			bind:algorithm
			bind:sampleCount
			bind:depthScale
			bind:densityGamma
			bind:radiusFromLuminance
			bind:sizeVariation
			bind:outlierRadius
			bind:normalDisplacement
			bind:removeBg
			bind:bgModelIndex
			bind:useDepthMap
			bind:depthModelIndex
			bind:outerBackgroundColor
			bind:innerBackgroundColor
			bind:frameParams
			bgModels={BG_REMOVAL_MODELS}
			depthModels={DEPTH_MODELS}
			{processingStatus}
			hasImage={originalImage !== null}
			onRenderParamsChange={handleRenderParamsChange}
			onModeChange={handleModeChange}
			onAlgorithmChange={handleAlgorithmChange}
			onSampleCountChange={handleSampleCountChange}
			onImageUpload={handleImageUpload}
			onResample={handleResample}
			onRemoveBg={handleRemoveBg}
			onBgModelChange={handleBgModelChange}
			onEstimateDepth={handleEstimateDepth}
			onDepthModelChange={handleDepthModelChange}
			onOuterBackgroundColorChange={handleOuterBackgroundColorChange}
			onInnerBackgroundColorChange={handleInnerBackgroundColorChange}
			onFrameParamsChange={handleFrameParamsChange}
			onSaveSettings={saveSettings}
			onResetSettings={resetSettings}
		/>

		{#if processingStatus}
			<div class="fixed bottom-4 left-4 z-50 rounded bg-black/80 px-4 py-2 font-mono text-xs text-white/80 backdrop-blur">
				{processingStatus}
			</div>
		{/if}
	{/if}
</div>
