<script lang="ts">
	import { useThrelte, useTask } from '@threlte/core';
	import { onMount } from 'svelte';
	import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
	import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
	import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
	import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
	import { Vector2, type Camera } from 'three';
	import type { BloomParams } from '$lib/engine/render/types.js';

	interface Props {
		params: BloomParams;
	}

	let { params }: Props = $props();

	const { scene, renderer, camera, size, renderStage, autoRender } = useThrelte();

	const composer = new EffectComposer(renderer);
	let bloomPass: UnrealBloomPass;

	function setupPasses(cam: Camera) {
		while (composer.passes.length > 0) composer.removePass(composer.passes[0]);
		composer.addPass(new RenderPass(scene, cam));
		bloomPass = new UnrealBloomPass(
			new Vector2($size.width, $size.height),
			params.strength,
			params.radius,
			params.threshold,
		);
		composer.addPass(bloomPass);
		composer.addPass(new OutputPass());
	}

	$effect(() => {
		setupPasses($camera);
	});

	$effect(() => {
		composer.setSize($size.width, $size.height);
	});

	$effect(() => {
		if (bloomPass) {
			bloomPass.strength = params.strength;
			bloomPass.radius = params.radius;
			bloomPass.threshold = params.threshold;
		}
	});

	onMount(() => {
		const prev = autoRender.current;
		autoRender.set(false);
		return () => {
			autoRender.set(prev);
			composer.dispose();
		};
	});

	useTask(
		(delta) => {
			composer.render(delta);
		},
		{ stage: renderStage, autoInvalidate: false },
	);
</script>
