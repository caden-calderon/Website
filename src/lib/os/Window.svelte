<script lang="ts">
	import { onMount } from 'svelte';
	import { windowManager } from './windowManager.svelte.js';
	import { getAppDef } from './appRegistry.js';
	import type { WindowState } from './types.js';

	let { windowState }: { windowState: WindowState } = $props();

	// App component loaded lazily
	let AppComponent = $state<import('svelte').Component | null>(null);

	onMount(async () => {
		const def = getAppDef(windowState.appId);
		if (def) {
			const mod = await def.component();
			AppComponent = mod.default;
		}
	});

	// -----------------------------------------------------------------------
	// Drag (title bar)
	// -----------------------------------------------------------------------

	let dragging = $state(false);
	let dragOffset = { x: 0, y: 0 };
	let pendingDragPosition: { x: number; y: number } | null = null;
	let dragFrame = 0;

	function onTitlePointerDown(e: PointerEvent) {
		if (windowState.maximized) return;
		const target = e.target as HTMLElement;
		if (target.closest('button')) return; // don't drag from control buttons

		dragging = true;
		dragOffset = {
			x: e.clientX - windowState.position.x,
			y: e.clientY - windowState.position.y,
		};
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		windowManager.focus(windowState.id);
		e.preventDefault();
	}

	function onTitlePointerMove(e: PointerEvent) {
		if (!dragging) return;
		pendingDragPosition = {
			x: e.clientX - dragOffset.x,
			y: e.clientY - dragOffset.y,
		};

		if (dragFrame) return;
		dragFrame = requestAnimationFrame(() => {
			dragFrame = 0;
			if (!pendingDragPosition) return;
			windowManager.updatePosition(
				windowState.id,
				pendingDragPosition.x,
				pendingDragPosition.y,
			);
			pendingDragPosition = null;
		});
	}

	function onTitlePointerUp() {
		if (pendingDragPosition) {
			windowManager.updatePosition(
				windowState.id,
				pendingDragPosition.x,
				pendingDragPosition.y,
			);
			pendingDragPosition = null;
		}
		if (dragFrame) {
			cancelAnimationFrame(dragFrame);
			dragFrame = 0;
		}
		dragging = false;
	}

	// -----------------------------------------------------------------------
	// Resize (edge/corner handles)
	// -----------------------------------------------------------------------

	let resizing = $state(false);
	let resizeEdge = '';
	let resizeStart = { x: 0, y: 0, width: 0, height: 0, winX: 0, winY: 0 };
	let pendingResize:
		| { width: number; height: number; anchorX: number | undefined; anchorY: number | undefined }
		| null = null;
	let resizeFrame = 0;

	function onResizePointerDown(e: PointerEvent, edge: string) {
		if (windowState.maximized) return;
		resizing = true;
		resizeEdge = edge;
		resizeStart = {
			x: e.clientX,
			y: e.clientY,
			width: windowState.size.width,
			height: windowState.size.height,
			winX: windowState.position.x,
			winY: windowState.position.y,
		};
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		windowManager.focus(windowState.id);
		e.preventDefault();
	}

	function onResizePointerMove(e: PointerEvent) {
		if (!resizing) return;
		const dx = e.clientX - resizeStart.x;
		const dy = e.clientY - resizeStart.y;

		let newWidth = resizeStart.width;
		let newHeight = resizeStart.height;
		let anchorX: number | undefined;
		let anchorY: number | undefined;

		if (resizeEdge.includes('e')) newWidth = resizeStart.width + dx;
		if (resizeEdge.includes('w')) {
			newWidth = resizeStart.width - dx;
			anchorX = resizeStart.winX + dx;
			// Prevent the anchor from jumping past min size
			if (newWidth < windowState.minSize.width) {
				anchorX = resizeStart.winX + (resizeStart.width - windowState.minSize.width);
			}
		}
		if (resizeEdge.includes('s')) newHeight = resizeStart.height + dy;
		if (resizeEdge.includes('n')) {
			newHeight = resizeStart.height - dy;
			anchorY = resizeStart.winY + dy;
			if (newHeight < windowState.minSize.height) {
				anchorY = resizeStart.winY + (resizeStart.height - windowState.minSize.height);
			}
		}

		pendingResize = {
			width: newWidth,
			height: newHeight,
			anchorX,
			anchorY,
		};

		if (resizeFrame) return;
		resizeFrame = requestAnimationFrame(() => {
			resizeFrame = 0;
			if (!pendingResize) return;
			windowManager.updateSize(
				windowState.id,
				pendingResize.width,
				pendingResize.height,
				pendingResize.anchorX,
				pendingResize.anchorY,
			);
			pendingResize = null;
		});
	}

	function onResizePointerUp() {
		if (pendingResize) {
			windowManager.updateSize(
				windowState.id,
				pendingResize.width,
				pendingResize.height,
				pendingResize.anchorX,
				pendingResize.anchorY,
			);
			pendingResize = null;
		}
		if (resizeFrame) {
			cancelAnimationFrame(resizeFrame);
			resizeFrame = 0;
		}
		resizing = false;
		resizeEdge = '';
	}

	// -----------------------------------------------------------------------
	// Handlers
	// -----------------------------------------------------------------------

	function onWindowPointerDown() {
		windowManager.focus(windowState.id);
	}

	function onMinimize() {
		windowManager.minimize(windowState.id);
	}

	function onMaximizeRestore() {
		windowManager.toggleMaximize(windowState.id);
	}

	function onClose() {
		windowManager.close(windowState.id);
	}

	function onTitleDblClick() {
		windowManager.toggleMaximize(windowState.id);
	}

	// -----------------------------------------------------------------------
	// Computed styles
	// -----------------------------------------------------------------------

	const isFocused = $derived(windowManager.focusedWindow?.id === windowState.id);

	const containerStyle = $derived(
		windowState.minimized
			? 'display: none;'
			: `left: ${windowState.position.x}px; top: ${windowState.position.y}px; width: ${windowState.size.width}px; height: ${windowState.size.height}px; z-index: ${windowState.zIndex};`,
	);

	// Resize edges
	const HANDLE_SIZE = 6;
	const edges = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'] as const;
	type Edge = (typeof edges)[number];

	const cursorMap: Record<Edge, string> = {
		n: 'n-resize',
		ne: 'ne-resize',
		e: 'e-resize',
		se: 'se-resize',
		s: 's-resize',
		sw: 'sw-resize',
		w: 'w-resize',
		nw: 'nw-resize',
	};

	function edgeStyle(edge: Edge): string {
		const h = HANDLE_SIZE;
		const base = `position: absolute; cursor: ${cursorMap[edge]};`;
		switch (edge) {
			case 'n':
				return `${base} top: -${h / 2}px; left: ${h}px; right: ${h}px; height: ${h}px;`;
			case 's':
				return `${base} bottom: -${h / 2}px; left: ${h}px; right: ${h}px; height: ${h}px;`;
			case 'e':
				return `${base} right: -${h / 2}px; top: ${h}px; bottom: ${h}px; width: ${h}px;`;
			case 'w':
				return `${base} left: -${h / 2}px; top: ${h}px; bottom: ${h}px; width: ${h}px;`;
			case 'ne':
				return `${base} top: -${h / 2}px; right: -${h / 2}px; width: ${h * 2}px; height: ${h * 2}px;`;
			case 'nw':
				return `${base} top: -${h / 2}px; left: -${h / 2}px; width: ${h * 2}px; height: ${h * 2}px;`;
			case 'se':
				return `${base} bottom: -${h / 2}px; right: -${h / 2}px; width: ${h * 2}px; height: ${h * 2}px;`;
			case 'sw':
				return `${base} bottom: -${h / 2}px; left: -${h / 2}px; width: ${h * 2}px; height: ${h * 2}px;`;
		}
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="window"
	class:inactive={!isFocused}
	style="{containerStyle} position: absolute; display: {windowState.minimized ? 'none' : 'flex'}; flex-direction: column;"
	onpointerdown={onWindowPointerDown}
>
	<!-- Title bar -->
	<div
		class="title-bar"
		onpointerdown={onTitlePointerDown}
		onpointermove={onTitlePointerMove}
		onpointerup={onTitlePointerUp}
		ondblclick={onTitleDblClick}
		role="toolbar"
		tabindex="-1"
	>
		<div class="title-bar-text">{windowState.title}</div>
		<div class="title-bar-controls">
			<button aria-label="Minimize" onclick={onMinimize}></button>
			<button aria-label="Maximize" onclick={onMaximizeRestore}></button>
			<button aria-label="Close" onclick={onClose}></button>
		</div>
	</div>

	<!-- Content area -->
	<div class="window-body" style="flex: 1; overflow: auto; margin: 0; padding: 0;">
		{#if AppComponent}
			<AppComponent
				appId={windowState.appId}
				title={windowState.title}
				windowId={windowState.id}
				{...windowState.props}
			/>
		{:else}
			<div style="padding: 8px;">Loading...</div>
		{/if}
	</div>

	<!-- Resize handles (not shown when maximized) -->
	{#if !windowState.maximized}
		{#each edges as edge}
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				style={edgeStyle(edge)}
				onpointerdown={(e) => onResizePointerDown(e, edge)}
				onpointermove={onResizePointerMove}
				onpointerup={onResizePointerUp}
			></div>
		{/each}
	{/if}
</div>

<style>
	/* 98.css handles the window chrome. We only add layout and behavior styles. */
	.title-bar {
		cursor: default;
		flex-shrink: 0;
	}

	.window-body {
		position: relative;
	}
</style>
