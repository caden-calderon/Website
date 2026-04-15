<script lang="ts">
	import { onMount } from 'svelte';

	type DemoComponent = typeof import('$lib/demo/PointEngineDemo.svelte').default;

	let Demo = $state<DemoComponent | null>(null);
	let loadError = $state<string | null>(null);

	onMount(async () => {
		try {
			Demo = (await import('$lib/demo/PointEngineDemo.svelte')).default;
		} catch (error) {
			console.error('Failed to load point runtime demo', error);
			loadError = 'Failed to load the point runtime.';
		}
	});
</script>

<svelte:head>
	<title>Chromatic — Point Engine</title>
</svelte:head>

{#if Demo}
	<Demo />
{:else if loadError}
	<div class="flex min-h-screen items-center justify-center bg-black px-6 text-center font-mono text-sm text-red-300">
		{loadError}
	</div>
{:else}
	<div class="flex min-h-screen items-center justify-center bg-black px-6 text-center font-mono text-sm text-white/70">
		Loading point runtime…
	</div>
{/if}
