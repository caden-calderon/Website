<script>
	import '98.css';

	let { children } = $props();
</script>

<div class="os-root">
	{@render children()}
</div>

<style>
	/*
	 * Override 98.css's inaccurate defaults to match real Win98 colors.
	 * See src/lib/os/palette.ts for the source values.
	 */
	:global(.os-root) {
		--surface: #c0c0c0;
		--button-face: #c0c0c0;
		--button-highlight: #ffffff;
		--button-shadow: #808080;
		--window-frame: #000000;
		--text-color: #000000;
		--dialog-blue: #000080;
		--dialog-blue-light: #1084d0;
		--dialog-gray: #808080;
		--dialog-gray-light: #b5b5b5;
	}

	:global(.os-root),
	:global(.os-root *) {
		box-sizing: border-box;
		-webkit-font-smoothing: none;
		-moz-osx-font-smoothing: unset;
	}

	:global(.os-root) {
		width: 100vw;
		height: 100vh;
		overflow: hidden;
		background: #008080;
		position: fixed;
		inset: 0;
		font-family: 'Pixelated MS Sans Serif', 'MS Sans Serif', 'Microsoft Sans Serif', Arial, sans-serif;
		font-size: 11px;
		color: #000000;
		user-select: none;
		-webkit-user-select: none;
		-webkit-tap-highlight-color: transparent;
		-webkit-touch-callout: none;
	}
</style>
