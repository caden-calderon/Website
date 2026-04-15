<script lang="ts">
	import DesktopIcon from './DesktopIcon.svelte';
	import Window from './Window.svelte';
	import Taskbar from './Taskbar.svelte';
	import StartMenu from './StartMenu.svelte';
	import ContextMenu from './ContextMenu.svelte';
	import { windowManager } from './windowManager.svelte.js';
	import { getIcon } from './icons.js';
	import { TASKBAR_HEIGHT, type AppId, type ContextMenuItem } from './types.js';

	// Desktop icon definitions (later these come from the virtual filesystem)
	const desktopIcons: { label: string; icon: string; appId: AppId }[] = [
		{ label: 'My Computer', icon: getIcon('my-computer'), appId: 'file-explorer' },
		{ label: 'My Documents', icon: getIcon('my-documents'), appId: 'file-explorer' },
		{ label: 'Internet Explorer', icon: getIcon('internet-explorer'), appId: 'internet-explorer' },
		{ label: 'My Projects', icon: getIcon('file-explorer'), appId: 'file-explorer' },
		{ label: 'Chess', icon: getIcon('chess'), appId: 'chess' },
		{ label: 'Axial', icon: getIcon('axial'), appId: 'axial' },
		{ label: 'Point Engine', icon: getIcon('point-engine'), appId: 'point-engine' },
		{ label: 'Recycle Bin', icon: getIcon('recycle-bin'), appId: 'file-explorer' },
	];

	let selectedIcon = $state<string | null>(null);
	let startMenuOpen = $state(false);
	let contextMenu = $state<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);

	// Desktop right-click menu items
	const desktopContextItems: ContextMenuItem[] = [
		{
			label: 'Arrange Icons',
			children: [
				{ label: 'by Name', action: () => {} },
				{ label: 'by Type', action: () => {} },
				{ separator: true, label: '' },
				{ label: 'Auto Arrange', action: () => {} },
			],
		},
		{ label: 'Line up Icons', action: () => {} },
		{ separator: true, label: '' },
		{ label: 'Paste', disabled: true },
		{ label: 'Paste Shortcut', disabled: true },
		{ separator: true, label: '' },
		{
			label: 'New',
			children: [
				{ label: 'Folder', disabled: true },
				{ label: 'Shortcut', disabled: true },
				{ separator: true, label: '' },
				{ label: 'Text Document', disabled: true },
			],
		},
		{ separator: true, label: '' },
		{ label: 'Properties', disabled: true },
	];

	function openApp(appId: AppId) {
		windowManager.open(appId);
		selectedIcon = null;
	}

	function selectIcon(label: string) {
		selectedIcon = label;
	}

	function desktopClick(e: MouseEvent) {
		// Click on the desktop background deselects icons and closes menus
		if ((e.target as HTMLElement).classList.contains('desktop-area')) {
			selectedIcon = null;
			startMenuOpen = false;
			contextMenu = null;
		}
	}

	function desktopContextMenu(e: MouseEvent) {
		if (!(e.target as HTMLElement).classList.contains('desktop-area')) return;
		e.preventDefault();
		contextMenu = { x: e.clientX, y: e.clientY, items: desktopContextItems };
		startMenuOpen = false;
	}

	function toggleStartMenu() {
		startMenuOpen = !startMenuOpen;
	}

	function handleKeydown(e: KeyboardEvent) {
		// Alt+F4 closes the focused window
		if (e.altKey && e.key === 'F4') {
			const focused = windowManager.focusedWindow;
			if (focused) {
				windowManager.close(focused.id);
				e.preventDefault();
			}
		}
		// Escape closes start menu and context menu
		if (e.key === 'Escape') {
			if (contextMenu) { contextMenu = null; e.preventDefault(); return; }
			if (startMenuOpen) { startMenuOpen = false; e.preventDefault(); return; }
		}
	}

	const windows = $derived(windowManager.windows);
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="desktop" onclick={desktopClick} oncontextmenu={desktopContextMenu}>
	<!-- Icon grid -->
	<div class="desktop-area" style="padding-bottom: {TASKBAR_HEIGHT}px;">
		<div class="icon-grid">
			{#each desktopIcons as icon, i (icon.label)}
				<DesktopIcon
					label={icon.label}
					icon={icon.icon}
					appId={icon.appId}
					selected={selectedIcon === icon.label}
					onopen={openApp}
					onselect={selectIcon}
				/>
			{/each}
		</div>
	</div>

	<!-- Windows -->
	{#each windows as win (win.id)}
		<Window windowState={win} />
	{/each}

	<!-- Start menu -->
	{#if startMenuOpen}
		<StartMenu onclose={() => (startMenuOpen = false)} />
	{/if}

	<!-- Context menu -->
	{#if contextMenu}
		<ContextMenu
			x={contextMenu.x}
			y={contextMenu.y}
			items={contextMenu.items}
			onclose={() => (contextMenu = null)}
		/>
	{/if}

	<!-- Taskbar -->
	<Taskbar onStartClick={toggleStartMenu} />
</div>

<style>
	.desktop {
		width: 100%;
		height: 100%;
		position: relative;
	}

	.desktop-area {
		position: absolute;
		inset: 0;
		overflow: hidden;
	}

	.icon-grid {
		display: flex;
		flex-direction: column;
		flex-wrap: wrap;
		align-content: flex-start;
		gap: 4px;
		padding: 8px;
		height: 100%;
	}

</style>
