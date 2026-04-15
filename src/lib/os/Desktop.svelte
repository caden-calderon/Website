<script lang="ts">
	import DesktopIcon from './DesktopIcon.svelte';
	import Window from './Window.svelte';
	import Taskbar from './Taskbar.svelte';
	import { windowManager } from './windowManager.svelte.js';
	import { TASKBAR_HEIGHT, type AppId } from './types.js';

	// Desktop icon definitions (later these come from the virtual filesystem)
	const desktopIcons: { label: string; icon: string; appId: AppId }[] = [
		{ label: 'My Projects', icon: '/os-assets/icons/explorer.png', appId: 'file-explorer' },
		{ label: 'Internet Explorer', icon: '/os-assets/icons/ie.png', appId: 'internet-explorer' },
		{ label: 'Chess', icon: '/os-assets/icons/chess.png', appId: 'chess' },
		{ label: 'Axial', icon: '/os-assets/icons/axial.png', appId: 'axial' },
		{ label: 'Point Engine', icon: '/os-assets/icons/point-engine.png', appId: 'point-engine' },
		{ label: 'Notepad', icon: '/os-assets/icons/notepad.png', appId: 'notepad' },
		{ label: 'Minesweeper', icon: '/os-assets/icons/minesweeper.png', appId: 'minesweeper' },
		{ label: 'Solitaire', icon: '/os-assets/icons/solitaire.png', appId: 'solitaire' },
		{ label: 'Calculator', icon: '/os-assets/icons/calculator.png', appId: 'calculator' },
	];

	let selectedIcon = $state<AppId | null>(null);
	let startMenuOpen = $state(false);

	function openApp(appId: AppId) {
		windowManager.open(appId);
		selectedIcon = null;
	}

	function selectIcon(appId: AppId) {
		selectedIcon = appId;
	}

	function desktopClick(e: MouseEvent) {
		// Click on the desktop background deselects icons and closes start menu
		if ((e.target as HTMLElement).classList.contains('desktop-area')) {
			selectedIcon = null;
			startMenuOpen = false;
		}
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
		// Escape closes start menu
		if (e.key === 'Escape' && startMenuOpen) {
			startMenuOpen = false;
			e.preventDefault();
		}
	}

	const windows = $derived(windowManager.windows);
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="desktop" onclick={desktopClick}>
	<!-- Icon grid -->
	<div class="desktop-area" style="padding-bottom: {TASKBAR_HEIGHT}px;">
		<div class="icon-grid">
			{#each desktopIcons as icon (icon.appId)}
				<DesktopIcon
					label={icon.label}
					icon={icon.icon}
					appId={icon.appId}
					selected={selectedIcon === icon.appId}
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

	<!-- Start menu (placeholder — will be a full component later) -->
	{#if startMenuOpen}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="start-menu-backdrop" onclick={() => (startMenuOpen = false)}>
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="window start-menu" onclick={(e) => e.stopPropagation()}>
				<div class="start-menu-banner">
					<span class="banner-text">Windows<span class="banner-95">95</span></span>
				</div>
				<div class="start-menu-items">
					<button class="start-menu-item" onclick={() => { openApp('internet-explorer'); startMenuOpen = false; }} type="button">
						Programs
					</button>
					<button class="start-menu-item" type="button" disabled>
						Settings
					</button>
					<button class="start-menu-item" type="button" disabled>
						Find
					</button>
					<button class="start-menu-item" type="button" disabled>
						Help
					</button>
					<button class="start-menu-item" onclick={() => { openApp('run-dialog'); startMenuOpen = false; }} type="button">
						Run...
					</button>
					<div class="start-menu-separator"></div>
					<button class="start-menu-item" type="button" disabled>
						Shut Down...
					</button>
				</div>
			</div>
		</div>
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

	/* Start menu */
	.start-menu-backdrop {
		position: fixed;
		inset: 0;
		z-index: 100000;
	}

	.start-menu {
		position: fixed;
		bottom: 30px;
		left: 0;
		display: flex;
		flex-direction: row;
		min-width: 180px;
		z-index: 100001;
	}

	.start-menu-banner {
		width: 24px;
		background: linear-gradient(to top, #000080, #1084d0);
		display: flex;
		align-items: flex-end;
		justify-content: center;
		padding-bottom: 8px;
		flex-shrink: 0;
	}

	.banner-text {
		color: white;
		font-weight: bold;
		font-size: 16px;
		writing-mode: vertical-rl;
		transform: rotate(180deg);
		letter-spacing: 1px;
		font-family: Arial, sans-serif;
	}

	.banner-95 {
		font-weight: 900;
		color: #c0c0c0;
	}

	.start-menu-items {
		display: flex;
		flex-direction: column;
		flex: 1;
		padding: 2px 0;
	}

	.start-menu-item {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 4px 24px 4px 8px;
		font-size: 11px;
		font-family: 'Pixelated MS Sans Serif', Arial, sans-serif;
		text-align: left;
		border: none;
		background: transparent;
		width: 100%;
		cursor: default;
		box-shadow: none;
	}

	.start-menu-item:hover:not(:disabled) {
		background: #000080;
		color: white;
	}

	.start-menu-item:disabled {
		color: #808080;
	}

	.start-menu-separator {
		height: 1px;
		margin: 2px 4px;
		border-top: 1px solid #808080;
		border-bottom: 1px solid white;
	}
</style>
