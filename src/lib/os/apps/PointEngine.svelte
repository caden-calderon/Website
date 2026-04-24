<script lang="ts">
	import '$lib/demo/point-engine-utilities.css';
	import PointEngineDemo from '$lib/demo/PointEngineDemo.svelte';

	let { title = 'Point Engine' }: { title?: string } = $props();

	const statusText = 'Ready';
</script>

<div class="point-engine-app" aria-label={title}>
	<nav class="point-engine-menu" aria-label="Point Engine menu">
		<button type="button">File</button>
		<button type="button">View</button>
		<button type="button">Sequence</button>
		<button type="button">Render</button>
		<button type="button">Help</button>
	</nav>

	<div class="point-engine-toolbar" role="toolbar" aria-label="Point Engine tools">
		<span class="toolbar-grip" aria-hidden="true"></span>
		<span class="toolbar-label">Point Engine Runtime</span>
		<span class="toolbar-divider" aria-hidden="true"></span>
		<span class="toolbar-hint">Mesh, image, and RGBD sequence editor</span>
	</div>

	<div class="point-engine-content">
		<PointEngineDemo presentation="embedded" />
	</div>

	<footer class="point-engine-status" aria-label="Point Engine status">
		<span>{statusText}</span>
		<span>WebGL point renderer</span>
		<span>Resize the window to inspect layout</span>
	</footer>
</div>

<style>
	.point-engine-app {
		display: flex;
		width: 100%;
		height: 100%;
		min-width: 0;
		min-height: 0;
		flex-direction: column;
		overflow: hidden;
		background: var(--surface, #c0c0c0);
		color: #000000;
	}

	.point-engine-menu {
		display: flex;
		flex: 0 0 auto;
		gap: 2px;
		height: 20px;
		align-items: center;
		padding: 1px 2px;
		border-bottom: 1px solid #808080;
		background: var(--surface, #c0c0c0);
	}

	.point-engine-menu button {
		height: 18px;
		padding: 1px 7px 2px;
		border: 1px solid transparent;
		background: transparent;
		color: #000000;
		font: inherit;
	}

	.point-engine-menu button:hover,
	.point-engine-menu button:focus-visible {
		border-color: #ffffff #808080 #808080 #ffffff;
		outline: none;
	}

	.point-engine-menu button:active {
		border-color: #808080 #ffffff #ffffff #808080;
	}

	.point-engine-toolbar {
		display: flex;
		flex: 0 0 auto;
		min-width: 0;
		height: 26px;
		align-items: center;
		gap: 6px;
		padding: 3px 6px;
		border-top: 1px solid #ffffff;
		border-bottom: 1px solid #808080;
		background: var(--surface, #c0c0c0);
		white-space: nowrap;
	}

	.toolbar-grip {
		width: 4px;
		height: 18px;
		border-left: 1px solid #ffffff;
		border-right: 1px solid #808080;
	}

	.toolbar-label {
		font-weight: 700;
	}

	.toolbar-divider {
		width: 1px;
		height: 18px;
		border-left: 1px solid #808080;
		border-right: 1px solid #ffffff;
	}

	.toolbar-hint {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		color: #404040;
	}

	.point-engine-content {
		position: relative;
		flex: 1 1 auto;
		min-width: 0;
		min-height: 0;
		overflow: hidden;
		border-top: 1px solid #ffffff;
		border-right: 1px solid #808080;
		border-bottom: 1px solid #808080;
		border-left: 1px solid #ffffff;
		background: #000000;
	}

	.point-engine-status {
		display: grid;
		flex: 0 0 auto;
		grid-template-columns: minmax(72px, 0.7fr) minmax(110px, 1fr) minmax(140px, 1.3fr);
		gap: 2px;
		min-width: 0;
		padding: 2px;
		background: var(--surface, #c0c0c0);
	}

	.point-engine-status span {
		min-width: 0;
		overflow: hidden;
		padding: 2px 4px;
		border-top: 1px solid #808080;
		border-right: 1px solid #ffffff;
		border-bottom: 1px solid #ffffff;
		border-left: 1px solid #808080;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	@media (max-width: 640px) {
		.point-engine-toolbar {
			height: 24px;
		}

		.toolbar-hint,
		.toolbar-divider {
			display: none;
		}

		.point-engine-status {
			grid-template-columns: minmax(0, 1fr);
		}

		.point-engine-status span:nth-child(n + 2) {
			display: none;
		}
	}
</style>
