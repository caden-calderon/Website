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
	import { DEPTH_MODELS } from '$lib/engine/preprocessing/DepthEstimation.js';
	import { BG_REMOVAL_MODELS } from '$lib/engine/preprocessing/BackgroundRemoval.js';

	let renderParams = $state<RenderParams>({ ...DEFAULT_RENDER_PARAMS });
	let bloomParams = $state<BloomParams>({ ...DEFAULT_BLOOM_PARAMS });
	let mode = $state<'mesh' | 'image'>('mesh');
	let algorithm = $state<'rejection' | 'importance'>('importance');
	let sampleCount = $state(126000);
	let depthScale = $state(0.07);
	let densityGamma = $state(1.1);
	let radiusFromLuminance = $state(true);
	let outlierRadius = $state(0);
	let normalDisplacement = $state(0);
	let removeBg = $state(false);
	let bgModelIndex = $state(1); // BiRefNet Lite default
	let useDepthMap = $state(false);
	let depthModelIndex = $state(0);
	let processingStatus = $state('');
	let ready = $state(false);

	let glRenderer = $state<GLPointRenderer>(undefined!);
	let meshAdapter = $state<MeshAdapter>(undefined!);
	let imageAdapter = $state<ImageAdapter>(undefined!);
	let currentImage = $state<HTMLImageElement | null>(null);
	let originalImage = $state<HTMLImageElement | null>(null);
	let bgRemovedImage = $state<HTMLImageElement | null>(null);
	let currentDepthMap = $state<DepthMap | null>(null);
	let pendingObjectUrl = $state<string | null>(null);

	onMount(() => {
		// Request persistent storage so ML model cache survives browser pressure
		if (navigator.storage?.persist) {
			navigator.storage.persist().then((granted) => {
				if (!granted) console.warn('Persistent storage not granted — models may be evicted');
			});
		}

		glRenderer = new GLPointRenderer({ params: renderParams });
		meshAdapter = new MeshAdapter();
		imageAdapter = new ImageAdapter();

		generateMeshSamples();
		ready = true;

		return () => {
			if (pendingObjectUrl) {
				URL.revokeObjectURL(pendingObjectUrl);
				pendingObjectUrl = null;
			}
			glRenderer.dispose();
		};
	});

	function generateMeshSamples() {
		const geometry = new THREE.TorusKnotGeometry(0.6, 0.2, 128, 32);
		const material = new THREE.MeshStandardMaterial({ color: 0xe8c872 });
		const mesh = new THREE.Mesh(geometry, material);

		const samples = meshAdapter.sample(mesh, { count: sampleCount });
		glRenderer.setSamples(samples);

		geometry.dispose();
		material.dispose();
	}

	function generateImageSamples(img: HTMLImageElement) {
		const opts: ImageAdapterOptions = {
			count: sampleCount,
			algorithm,
			baseRadius: 1.0,
			seed: 42,
			depthScale,
			densityGamma,
			radiusFromLuminance,
			outlierRadius,
			depthMap: useDepthMap && currentDepthMap ? currentDepthMap : undefined,
			normalDisplacement,
		};
		const samples = imageAdapter.sample(img, opts);
		glRenderer.setSamples(samples);
	}

	/** Get the active image (bg-removed if enabled, otherwise original) */
	function getActiveImage(): HTMLImageElement | null {
		if (removeBg && bgRemovedImage) return bgRemovedImage;
		return originalImage;
	}

	function handleResample() {
		if (mode === 'mesh') {
			generateMeshSamples();
		} else {
			const img = getActiveImage();
			if (img) generateImageSamples(img);
		}
	}

	function handleModeChange(newMode: 'mesh' | 'image') {
		mode = newMode;
		if (newMode === 'mesh') {
			generateMeshSamples();
		} else {
			const img = getActiveImage();
			if (img) generateImageSamples(img);
		}
	}

	function handleAlgorithmChange(newAlgo: 'rejection' | 'importance') {
		algorithm = newAlgo;
		if (mode === 'image') {
			const img = getActiveImage();
			if (img) generateImageSamples(img);
		}
	}

	function handleSampleCountChange(count: number) {
		sampleCount = count;
	}

	function handleImageUpload(file: File) {
		if (pendingObjectUrl) {
			URL.revokeObjectURL(pendingObjectUrl);
			pendingObjectUrl = null;
		}

		// Reset preprocessing state
		bgRemovedImage = null;
		currentDepthMap = null;

		const img = new Image();
		const objectUrl = URL.createObjectURL(file);

		img.onload = () => {
			originalImage = img;
			currentImage = img;
			URL.revokeObjectURL(objectUrl);
			if (pendingObjectUrl === objectUrl) pendingObjectUrl = null;
			if (mode === 'image') generateImageSamples(img);
		};

		img.onerror = () => {
			URL.revokeObjectURL(objectUrl);
			if (pendingObjectUrl === objectUrl) pendingObjectUrl = null;
		};

		pendingObjectUrl = objectUrl;
		img.src = objectUrl;
	}

	async function handleRemoveBg() {
		if (!originalImage) return;

		if (!removeBg) {
			removeBg = false;
			currentImage = originalImage;
			bgRemovedImage = null;
			if (mode === 'image') generateImageSamples(originalImage);
			return;
		}

		await runBgRemoval(bgModelIndex);
	}

	async function handleBgModelChange(index: number) {
		bgModelIndex = index;
		if (!removeBg || !originalImage) return;
		bgRemovedImage = null; // clear cache for old model
		await runBgRemoval(index);
	}

	async function runBgRemoval(modelIdx: number) {
		if (!originalImage) return;
		const model = BG_REMOVAL_MODELS[modelIdx];
		processingStatus = `Removing background with ${model.label} (${model.size})...`;
		try {
			const { removeImageBackground } = await import(
				'$lib/engine/preprocessing/BackgroundRemoval.js'
			);
			const result = await removeImageBackground(originalImage, {
				modelIndex: modelIdx,
				onProgress: (p) => {
					processingStatus = `Removing background... ${Math.round(p * 100)}%`;
				},
			});
			bgRemovedImage = result.image;
			currentImage = result.image;
			if (mode === 'image') generateImageSamples(result.image);
		} catch (err) {
			console.error('Background removal failed:', err);
			removeBg = false;
		}
		processingStatus = '';
	}

	async function handleEstimateDepth() {
		const img = getActiveImage();
		if (!img) return;

		if (!useDepthMap) {
			currentDepthMap = null;
			if (mode === 'image') generateImageSamples(img);
			return;
		}

		if (currentDepthMap) {
			// Already have a cached result
			if (mode === 'image') generateImageSamples(img);
			return;
		}

		processingStatus = 'Estimating depth...';
		try {
			const { estimateDepth } = await import('$lib/engine/preprocessing/DepthEstimation.js');
			currentDepthMap = await estimateDepth(img, {
				modelIndex: depthModelIndex,
				onProgress: (s) => { processingStatus = s; },
			});
			if (mode === 'image') generateImageSamples(img);
		} catch (err) {
			console.error('Depth estimation failed:', err);
			useDepthMap = false;
		}
		processingStatus = '';
	}

	async function handleDepthModelChange(index: number) {
		depthModelIndex = index;
		if (!useDepthMap) return;

		// Re-run depth estimation with the new model
		const img = getActiveImage();
		if (!img) return;

		currentDepthMap = null; // clear cache
		processingStatus = 'Switching depth model...';
		try {
			const { estimateDepth } = await import('$lib/engine/preprocessing/DepthEstimation.js');
			currentDepthMap = await estimateDepth(img, {
				modelIndex: index,
				onProgress: (s) => { processingStatus = s; },
			});
			if (mode === 'image') generateImageSamples(img);
		} catch (err) {
			console.error('Depth estimation failed:', err);
		}
		processingStatus = '';
	}

	function handleRenderParamsChange(params: RenderParams) {
		renderParams = params;
		glRenderer?.updateUniforms(params);
	}
</script>

<svelte:head>
	<title>Chromatic — Point Engine</title>
</svelte:head>

<div class="relative h-screen w-screen bg-black">
	{#if ready}
		<Canvas>
			<PointCloudScene renderer={glRenderer} {bloomParams} />
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
			bind:outlierRadius
			bind:normalDisplacement
			bind:removeBg
			bind:bgModelIndex
			bind:useDepthMap
			bind:depthModelIndex
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
		/>

		{#if processingStatus}
			<div class="fixed bottom-4 left-4 z-50 rounded bg-black/80 px-4 py-2 font-mono text-xs text-white/80 backdrop-blur">
				{processingStatus}
			</div>
		{/if}
	{/if}
</div>
