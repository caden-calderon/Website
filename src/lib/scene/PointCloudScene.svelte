<script lang="ts">
	import { T, useThrelte } from '@threlte/core';
	import { OrbitControls } from '@threlte/extras';
	import { Color, DoubleSide } from 'three';
	import Bloom from './Bloom.svelte';
	import type { RendererAdapter } from '$lib/engine/render/types.js';
	import type { BloomParams } from '$lib/engine/render/types.js';
	import { DEFAULT_BLOOM_PARAMS } from '$lib/engine/render/types.js';

	interface Props {
		renderer: RendererAdapter;
		bloomParams?: BloomParams;
		outerBackgroundColor?: string | null;
		innerBackgroundColor?: string | null;
		/** [width, height] of the inner background plane */
		innerPlaneSize?: [number, number] | null;
	}

	let {
		renderer,
		bloomParams = DEFAULT_BLOOM_PARAMS,
		outerBackgroundColor = null,
		innerBackgroundColor = null,
		innerPlaneSize = null,
	}: Props = $props();

	const { scene } = useThrelte();

	$effect(() => {
		scene.background = outerBackgroundColor ? new Color(outerBackgroundColor) : null;
	});

	const innerColor = $derived(innerBackgroundColor ? new Color(innerBackgroundColor) : null);
</script>

<T.PerspectiveCamera makeDefault position={[0, 0, 2.5]} fov={60}>
	<OrbitControls enableDamping dampingFactor={0.05} zoomToCursor maxDistance={10} />
</T.PerspectiveCamera>

{#if innerColor && innerPlaneSize}
	<T.Mesh position.z={-0.15}>
		<T.PlaneGeometry args={innerPlaneSize} />
		<T.MeshBasicMaterial color={innerColor} side={DoubleSide} depthWrite={false} />
	</T.Mesh>
{/if}

<T is={renderer.getPrimitive()} />

<Bloom params={bloomParams} />
