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
		type DemoImageAsset,
		type DemoMeshAsset,
	} from '$lib/demo/assets.js';
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
	let mode = $state<'mesh' | 'image'>('mesh');
	let selectedMeshAssetId = $state(DEMO_MESH_ASSETS[0]?.id ?? 'procedural');
	let selectedImageAssetId = $state(DEMO_IMAGE_ASSETS[0]?.id ?? '');
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
	let ready = $state(false);
	let glRenderer = $state<GLPointRenderer>(undefined!);
	let meshAdapter = $state<MeshAdapter>(undefined!);
	let imageAdapter = $state<ImageAdapter>(undefined!);
	let frameGenerator = $state<FrameGenerator>(undefined!);
	let originalImage = $state<HTMLImageElement | null>(null);
	let pendingObjectUrl = $state<string | null>(null);
	let imagePipelineVersion = 0;
	let imageLoadVersion = 0;
	let meshLoadVersion = 0;

	const bgRemovalCache = new WeakMap<HTMLImageElement, Map<string, HTMLImageElement>>();
	const depthMapCache = new WeakMap<HTMLImageElement, Map<number, DepthMap>>();
	const meshAssetCache = new Map<string, THREE.Mesh>();
	const imageAssetCache = new Map<string, HTMLImageElement>();

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
		selectedMeshAssetId: string;
		selectedImageAssetId: string;
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
		bgProvider: BgRemovalProvider;
		bgModelIndex: number;
		serverBgModelId: string;
		depthModelIndex: number;
	}

	function saveSettings() {
		const settings: SavedSettings = {
			renderParams, bloomParams, mode, selectedMeshAssetId, selectedImageAssetId, algorithm, sampleCount,
			depthScale, densityGamma, radiusFromLuminance, sizeVariation,
			outlierRadius, normalDisplacement, outerBackgroundColor,
			innerBackgroundColor, frameParams, bgProvider, bgModelIndex, serverBgModelId, depthModelIndex,
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
			if (s.bgProvider) bgProvider = s.bgProvider;
			if (s.bgModelIndex != null) bgModelIndex = s.bgModelIndex;
			if (s.serverBgModelId) serverBgModelId = s.serverBgModelId;
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
		bgProvider = 'browser';
		bgModelIndex = 2;
		serverBgModelId = SERVER_BG_REMOVAL_MODELS[0].id;
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

		if (mode === 'image' && selectedImageAssetId) {
			void loadImageAsset(selectedImageAssetId);
		} else {
			void generateMeshSamples();
		}
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

	// ── Pipeline ─────────────────────────────────────────────────────────
	function cancelImagePipeline() {
		imagePipelineVersion += 1;
		processingStatus = '';
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

		const asset = DEMO_IMAGE_ASSETS.find((entry) => entry.id === assetId);
		if (!asset) {
			if (version !== imageLoadVersion) return;
			console.error(`Unknown image asset: ${assetId}`);
			selectedImageAssetId = '';
			return;
		}

		try {
			const cached = imageAssetCache.get(asset.id);
			if (cached) {
				if (version !== imageLoadVersion) return;
				originalImage = cached;
				if (mode === 'image') void rebuildImagePipeline();
				return;
			}

			const image = await loadImageFromUrl(asset.src);
			if (version !== imageLoadVersion) return;
			imageAssetCache.set(asset.id, image);
			originalImage = image;
			if (mode === 'image') void rebuildImagePipeline();
		} catch (error) {
			if (version !== imageLoadVersion) return;
			console.error('Failed to load image asset.', error);
			selectedImageAssetId = '';
		}
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

	// ── Handlers ─────────────────────────────────────────────────────────
	function handleResample() {
		if (mode === 'mesh') {
			cancelImagePipeline();
			void generateMeshSamples();
		} else {
			void rebuildImagePipeline();
		}
	}

	function handleModeChange(newMode: 'mesh' | 'image') {
		mode = newMode;
		if (newMode === 'mesh') {
			cancelImagePipeline();
			void generateMeshSamples();
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
		if (!originalImage) return;
		await rebuildImagePipeline();
	}

	async function handleBgModelChange(index: number) {
		bgModelIndex = index;
		if (bgProvider !== 'browser' || !removeBg || !originalImage) return;
		await rebuildImagePipeline();
	}

	async function handleBgProviderChange(provider: BgRemovalProvider) {
		bgProvider = provider;
		if (!removeBg || !originalImage) return;
		await rebuildImagePipeline();
	}

	async function handleServerBgModelChange(modelId: string) {
		serverBgModelId = modelId;
		if (bgProvider !== 'server' || !removeBg || !originalImage) return;
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

	function handleMeshAssetChange(assetId: string) {
		selectedMeshAssetId = assetId;
		if (mode === 'mesh') void generateMeshSamples();
	}

	function handleImageAssetChange(assetId: string) {
		selectedImageAssetId = assetId;
		if (assetId) void loadImageAsset(assetId);
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
			/>
		</Canvas>

		<Controls
			bind:renderParams
			bind:bloomParams
			bind:mode
			{selectedMeshAssetId}
			{selectedImageAssetId}
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
			bgModels={BG_REMOVAL_MODELS}
			serverBgModels={SERVER_BG_REMOVAL_MODELS}
			depthModels={DEPTH_MODELS}
			{processingStatus}
			hasImage={originalImage !== null}
			onRenderParamsChange={handleRenderParamsChange}
			onModeChange={handleModeChange}
			onMeshAssetChange={handleMeshAssetChange}
			onImageAssetChange={handleImageAssetChange}
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
			<div class="fixed bottom-4 left-4 z-50 rounded bg-black/80 px-4 py-2 font-mono text-xs text-white/80 backdrop-blur">
				{processingStatus}
			</div>
		{/if}
	{/if}
</div>
