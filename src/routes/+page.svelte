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

	let renderParams = $state<RenderParams>({ ...DEFAULT_RENDER_PARAMS });
	let bloomParams = $state<BloomParams>({ ...DEFAULT_BLOOM_PARAMS });
	let mode = $state<'mesh' | 'image'>('mesh');
	let algorithm = $state<'rejection' | 'importance'>('importance');
	let sampleCount = $state(126000);
	let depthScale = $state(0.07);
	let densityGamma = $state(1.1);
	let radiusFromLuminance = $state(true);
	let outlierRadius = $state(0);
	let ready = $state(false);

	let glRenderer = $state<GLPointRenderer>(undefined!);
	let meshAdapter = $state<MeshAdapter>(undefined!);
	let imageAdapter = $state<ImageAdapter>(undefined!);
	let currentImage = $state<HTMLImageElement | null>(null);
	let pendingObjectUrl = $state<string | null>(null);

	onMount(() => {
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
		};
		const samples = imageAdapter.sample(img, opts);
		glRenderer.setSamples(samples);
	}

	function handleResample() {
		if (mode === 'mesh') {
			generateMeshSamples();
		} else if (currentImage) {
			generateImageSamples(currentImage);
		}
	}

	function handleModeChange(newMode: 'mesh' | 'image') {
		mode = newMode;
		if (newMode === 'mesh') {
			generateMeshSamples();
		} else if (currentImage) {
			generateImageSamples(currentImage);
		}
	}

	function handleAlgorithmChange(newAlgo: 'rejection' | 'importance') {
		algorithm = newAlgo;
		if (mode === 'image' && currentImage) {
			generateImageSamples(currentImage);
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

		const img = new Image();
		const objectUrl = URL.createObjectURL(file);

		img.onload = () => {
			currentImage = img;
			URL.revokeObjectURL(objectUrl);
			if (pendingObjectUrl === objectUrl) {
				pendingObjectUrl = null;
			}
			if (mode === 'image') generateImageSamples(img);
		};

		img.onerror = () => {
			URL.revokeObjectURL(objectUrl);
			if (pendingObjectUrl === objectUrl) {
				pendingObjectUrl = null;
			}
		};

		pendingObjectUrl = objectUrl;
		img.src = objectUrl;
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
			onRenderParamsChange={handleRenderParamsChange}
			onModeChange={handleModeChange}
			onAlgorithmChange={handleAlgorithmChange}
			onSampleCountChange={handleSampleCountChange}
			onImageUpload={handleImageUpload}
			onResample={handleResample}
		/>
	{/if}
</div>
