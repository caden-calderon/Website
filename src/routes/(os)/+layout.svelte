<script>
	import '98.css';

	let { children } = $props();
</script>

<div class="os-root">
	{@render children()}
</div>

<style>
	:global(.os-root),
	:global(.os-root *) {
		box-sizing: border-box;
	}

	:global(.os-root) {
		width: 100vw;
		height: 100vh;
		overflow: hidden;
		background: #008080;
		position: fixed;
		inset: 0;
		font-family: 'Pixelated MS Sans Serif', Arial, sans-serif;
		font-size: 11px;
		user-select: none;
		-webkit-user-select: none;
		-webkit-tap-highlight-color: transparent;
		-webkit-touch-callout: none;
	}
</style>
