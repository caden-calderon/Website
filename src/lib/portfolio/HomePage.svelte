<!--
  Portfolio homepage for http://chromatic.dev/
  Editorial OS-dashboard direction: dense rails, oversized name lockup,
  monochrome technical feature art, and compact project/status modules.
-->
<script lang="ts">
	import './HomePage.css';
	import { onMount, tick } from 'svelte';
	import HomeLeftRail from './HomeLeftRail.svelte';
	import HomeMainPanel from './HomeMainPanel.svelte';
	import HomeRightRail from './HomeRightRail.svelte';
	import { getFeaturedProject, getProjectIndex } from './projects.js';
	import {
		LEFT_PANEL_ORDER,
		type CollapsedPanels,
		type LeftPanelKey,
		type PanelKey,
		type Rail,
	} from './homePageTypes.js';
	import type { AppId } from '$lib/os/types.js';

	let { launchApp }: { launchApp?: (id: AppId) => void } = $props();

	const featured = getFeaturedProject();
	const projectIndex = getProjectIndex();
	const RAIL_COLLAPSED_WIDTH = 26;
	const LEFT_RAIL_MIN_WIDTH = 186;
	const LEFT_RAIL_MAX_WIDTH = 316;
	const LEFT_RAIL_SNAP_WIDTH = 148;
	const RIGHT_RAIL_MIN_WIDTH = 220;
	const RIGHT_RAIL_MAX_WIDTH = 340;
	const RIGHT_RAIL_SNAP_WIDTH = 176;

	let leftWidth = $state(230);
	let rightWidth = $state(260);
	let leftCollapsed = $state(false);
	let rightCollapsed = $state(false);
	let dragRail = $state<Rail | null>(null);
	let leftRailElement = $state<HTMLElement | null>(null);
	let expandedLeftPanels = $state<LeftPanelKey[]>([...LEFT_PANEL_ORDER]);
	let fitRequestId = 0;
	let collapsedPanels = $state<CollapsedPanels>({
		index: false,
		stack: false,
		notes: false,
		profile: false,
		focus: false,
		education: false,
		contact: false,
		update: false,
	});

	const homeStyle = $derived(
		`--left-width: ${leftCollapsed ? RAIL_COLLAPSED_WIDTH : leftWidth}px; --right-width: ${rightCollapsed ? RAIL_COLLAPSED_WIDTH : rightWidth}px;`,
	);

	function togglePanel(panel: PanelKey) {
		collapsedPanels = { ...collapsedPanels, [panel]: !collapsedPanels[panel] };
	}

	function isLeftPanelOpen(panel: LeftPanelKey) {
		return expandedLeftPanels.includes(panel);
	}

	async function fitsLeftRail() {
		await tick();
		return !leftRailElement || leftRailElement.scrollHeight <= leftRailElement.clientHeight + 1;
	}

	async function fitLeftPanelsTopDown() {
		const requestId = ++fitRequestId;
		expandedLeftPanels = [];

		for (const panel of LEFT_PANEL_ORDER) {
			if (requestId !== fitRequestId) return;
			const candidate = [...expandedLeftPanels, panel];
			expandedLeftPanels = candidate;

			if (!(await fitsLeftRail())) {
				expandedLeftPanels = candidate.filter((item) => item !== panel);
				await tick();
				return;
			}
		}
	}

	async function fitLeftPanelsAround(panel: LeftPanelKey, seed: LeftPanelKey[]) {
		const requestId = ++fitRequestId;
		expandedLeftPanels = LEFT_PANEL_ORDER.filter((item) => seed.includes(item));

		while (!(await fitsLeftRail())) {
			if (requestId !== fitRequestId) return;
			const panelIndex = LEFT_PANEL_ORDER.indexOf(panel);
			const lowerExpanded = LEFT_PANEL_ORDER.slice(panelIndex + 1).find((item) =>
				expandedLeftPanels.includes(item),
			);
			const fallbackExpanded = [...LEFT_PANEL_ORDER]
				.slice(0, panelIndex)
				.reverse()
				.find((item) => expandedLeftPanels.includes(item));
			const panelToCollapse = lowerExpanded ?? fallbackExpanded;
			if (!panelToCollapse) return;

			expandedLeftPanels = expandedLeftPanels.filter((item) => item !== panelToCollapse);
		}
	}

	function toggleLeftPanel(panel: LeftPanelKey) {
		if (isLeftPanelOpen(panel)) {
			expandedLeftPanels = expandedLeftPanels.filter((item) => item !== panel);
			return;
		}

		void fitLeftPanelsAround(panel, [...expandedLeftPanels, panel]);
	}

	function syncLeftPanelsToRail() {
		void fitLeftPanelsTopDown();
	}

	onMount(() => {
		if (!leftRailElement) return;

		const observer = new ResizeObserver(syncLeftPanelsToRail);
		observer.observe(leftRailElement);
		syncLeftPanelsToRail();

		return () => observer.disconnect();
	});

	function startRailDrag(event: PointerEvent, rail: Rail) {
		dragRail = rail;
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
		event.preventDefault();
	}

	function onRailDrag(event: PointerEvent) {
		if (!dragRail) return;
		const root = (event.currentTarget as HTMLElement).getBoundingClientRect();
		if (dragRail === 'left') {
			const nextWidth = event.clientX - root.left;
			leftCollapsed = nextWidth < LEFT_RAIL_SNAP_WIDTH;
			leftWidth = Math.round(Math.min(LEFT_RAIL_MAX_WIDTH, Math.max(LEFT_RAIL_MIN_WIDTH, nextWidth)));
		} else {
			const nextWidth = root.right - event.clientX;
			rightCollapsed = nextWidth < RIGHT_RAIL_SNAP_WIDTH;
			rightWidth = Math.round(Math.min(RIGHT_RAIL_MAX_WIDTH, Math.max(RIGHT_RAIL_MIN_WIDTH, nextWidth)));
		}
	}

	function stopRailDrag() {
		dragRail = null;
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="home"
	class:left-collapsed={leftCollapsed}
	class:right-collapsed={rightCollapsed}
	class:dragging={dragRail !== null}
	style={homeStyle}
	onpointermove={onRailDrag}
	onpointerup={stopRailDrag}
	onpointercancel={stopRailDrag}
>
	<HomeLeftRail
		collapsed={leftCollapsed}
		bind:railElement={leftRailElement}
		isPanelOpen={isLeftPanelOpen}
		onTogglePanel={toggleLeftPanel}
		onToggleCollapse={() => (leftCollapsed = !leftCollapsed)}
	/>

	<div
		class="rail-resizer left-resizer"
		role="separator"
		aria-orientation="vertical"
		onpointerdown={(event) => startRailDrag(event, 'left')}
	></div>

	<HomeMainPanel {featured} {projectIndex} {collapsedPanels} onTogglePanel={togglePanel} {launchApp} />

	<div
		class="rail-resizer right-resizer"
		role="separator"
		aria-orientation="vertical"
		onpointerdown={(event) => startRailDrag(event, 'right')}
	></div>

	<HomeRightRail
		collapsed={rightCollapsed}
		{collapsedPanels}
		onTogglePanel={togglePanel}
		onToggleCollapse={() => (rightCollapsed = !rightCollapsed)}
	/>
</div>
