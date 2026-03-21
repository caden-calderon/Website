<script lang="ts">
	import { T } from '@threlte/core';
	import { OrbitControls } from '@threlte/extras';
	import Bloom from './Bloom.svelte';
	import type { RendererAdapter } from '$lib/engine/render/types.js';
	import type { BloomParams } from '$lib/engine/render/types.js';
	import { DEFAULT_BLOOM_PARAMS } from '$lib/engine/render/types.js';

	interface Props {
		renderer: RendererAdapter;
		bloomParams?: BloomParams;
	}

	let { renderer, bloomParams = DEFAULT_BLOOM_PARAMS }: Props = $props();
</script>

<T.PerspectiveCamera makeDefault position={[0, 0, 2.5]} fov={60}>
	<OrbitControls enableDamping dampingFactor={0.05} />
</T.PerspectiveCamera>

<T is={renderer.getPrimitive()} />

<Bloom params={bloomParams} />
