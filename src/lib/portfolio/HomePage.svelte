<!--
  Portfolio homepage for http://chromatic.dev/
  Editorial OS-dashboard direction: dense rails, oversized name lockup,
  monochrome technical feature art, and compact project/status modules.
-->
<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { projects } from './projects.js';
	import {
		availabilityItems,
		buildQueue,
		focusAreas,
		games,
		githubStats,
		navItems,
		quickLinks,
		stackMeters,
	} from './homePageData.js';
	import type { AppId } from '$lib/os/types.js';

	let { launchApp }: { launchApp?: (id: AppId) => void } = $props();

	const featured = projects[0];
	const projectIndex = projects.slice(0, 5);
	const RAIL_COLLAPSED_WIDTH = 26;
	const LEFT_RAIL_MIN_WIDTH = 186;
	const LEFT_RAIL_MAX_WIDTH = 316;
	const LEFT_RAIL_SNAP_WIDTH = 148;
	const RIGHT_RAIL_MIN_WIDTH = 220;
	const RIGHT_RAIL_MAX_WIDTH = 340;
	const RIGHT_RAIL_SNAP_WIDTH = 176;
	const ALL_LEFT_PANELS = ['nav', 'quick', 'building', 'github', 'availability', 'visitor', 'now'] as const;

	type Rail = 'left' | 'right';
	type LeftPanelKey = 'nav' | 'quick' | 'building' | 'github' | 'availability' | 'visitor' | 'now';
	type PanelKey = 'index' | 'stack' | 'notes' | 'profile' | 'focus' | 'education' | 'contact' | 'update';

	let leftWidth = $state(230);
	let rightWidth = $state(260);
	let leftCollapsed = $state(false);
	let rightCollapsed = $state(false);
	let dragRail = $state<Rail | null>(null);
	let leftRailElement = $state<HTMLElement | null>(null);
	let expandedLeftPanels = $state<LeftPanelKey[]>([...ALL_LEFT_PANELS]);
	let fitRequestId = 0;
	let collapsedPanels = $state<Record<PanelKey, boolean>>({
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

		for (const panel of ALL_LEFT_PANELS) {
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
		expandedLeftPanels = ALL_LEFT_PANELS.filter((item) => seed.includes(item));

		while (!(await fitsLeftRail())) {
			if (requestId !== fitRequestId) return;
			const panelIndex = ALL_LEFT_PANELS.indexOf(panel);
			const lowerExpanded = ALL_LEFT_PANELS.slice(panelIndex + 1).find((item) =>
				expandedLeftPanels.includes(item),
			);
			const fallbackExpanded = [...ALL_LEFT_PANELS]
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
	<aside class="left-rail" bind:this={leftRailElement}>
		<button class="rail-toggle left-toggle" type="button" onclick={() => (leftCollapsed = !leftCollapsed)} aria-label={leftCollapsed ? 'Expand navigation rail' : 'Collapse navigation rail'}>
			{leftCollapsed ? '>' : '<'}
		</button>
		<section class="rail-panel nav-panel">
			<h2>
				<button class="panel-heading" type="button" onclick={() => toggleLeftPanel('nav')} aria-expanded={isLeftPanelOpen('nav')}>
					Navigation
				</button>
			</h2>
			{#if isLeftPanelOpen('nav')}
				<nav class="nav-list" aria-label="Portfolio sections">
					{#each navItems as item}
						<a class:active={item.active} href={item.href}>
							<img src={item.icon} alt="" width="20" height="20" draggable="false" />
							<span>{item.label}</span>
							{#if item.active}<b></b>{/if}
						</a>
					{/each}
				</nav>
			{/if}
		</section>

		<section class="rail-panel link-panel">
			<h2>
				<button class="panel-heading" type="button" onclick={() => toggleLeftPanel('quick')} aria-expanded={isLeftPanelOpen('quick')}>
					Quick Links
				</button>
			</h2>
			{#if isLeftPanelOpen('quick')}
				<ul class="compact-links">
					{#each quickLinks as link}
						<li><a href={link.href}>{link.label} -&gt;</a></li>
					{/each}
				</ul>
			{/if}
		</section>

		<section class="rail-panel building-panel">
			<h2>
				<button class="panel-heading" type="button" onclick={() => toggleLeftPanel('building')} aria-expanded={isLeftPanelOpen('building')}>
					Currently Building
				</button>
			</h2>
			{#if isLeftPanelOpen('building')}
				<ol class="build-list">
					{#each buildQueue as item, i}
						<li>
							<span>{String(i + 1).padStart(2, '0')}</span>
							<b>{item.label}</b>
							<em>{item.status}</em>
						</li>
					{/each}
				</ol>
			{/if}
		</section>

		<section class="rail-panel github-panel">
			<h2>
				<button class="panel-heading" type="button" onclick={() => toggleLeftPanel('github')} aria-expanded={isLeftPanelOpen('github')}>
					GitHub Signal
				</button>
			</h2>
			{#if isLeftPanelOpen('github')}
				<dl class="stat-list">
					{#each githubStats as stat}
						<div>
							<dt>{stat.label}</dt>
							<dd>{stat.value}</dd>
						</div>
					{/each}
				</dl>
				<a class="panel-link" href="https://github.com/Caden-Calderon">Open profile -&gt;</a>
			{/if}
		</section>

		<section class="rail-panel availability-panel">
			<h2>
				<button class="panel-heading" type="button" onclick={() => toggleLeftPanel('availability')} aria-expanded={isLeftPanelOpen('availability')}>
					Availability
				</button>
			</h2>
			{#if isLeftPanelOpen('availability')}
				<dl class="stat-list">
					{#each availabilityItems as item}
						<div>
							<dt>{item.label}</dt>
							<dd>{item.value}</dd>
						</div>
					{/each}
				</dl>
				<a class="panel-link orange" href="mailto:hello@caden.dev">Start a thread -&gt;</a>
			{/if}
		</section>

		<section class="rail-panel visitor-panel">
			<h2>
				<button class="panel-heading" type="button" onclick={() => toggleLeftPanel('visitor')} aria-expanded={isLeftPanelOpen('visitor')}>
					Visitor Counter
				</button>
			</h2>
			{#if isLeftPanelOpen('visitor')}
				<div class="visitor-counter" aria-label="Visitor count 00012098">
					<span>0</span><span>0</span><span>0</span><span>1</span><span>2</span><span>0</span><span>9</span><span>8</span>
				</div>
				<a class="microcopy review-link" href="/reviews">
					Thanks for stopping by! <span aria-hidden="true">&#9733;</span>
				</a>
			{/if}
		</section>

		<section class="rail-panel now-panel">
			<h2>
				<button class="panel-heading" type="button" onclick={() => toggleLeftPanel('now')} aria-expanded={isLeftPanelOpen('now')}>
					Now Playing
				</button>
			</h2>
			{#if isLeftPanelOpen('now')}
				<div class="album-row">
					<div class="album-art" aria-hidden="true">
						<span></span><span></span><span></span><span></span>
					</div>
					<p><b>Boards of Canada</b><br />Telephasic Workshop<br />1998</p>
				</div>
				<div class="track-bar"><span></span></div>
				<div class="player-buttons" aria-label="Decorative media controls">
					<button type="button">|&lt;</button>
					<button type="button">&gt;|</button>
					<button type="button">||</button>
					<button type="button">[]</button>
				</div>
			{/if}
		</section>
	</aside>
	<div class="rail-resizer left-resizer" role="separator" aria-orientation="vertical" onpointerdown={(event) => startRailDrag(event, 'left')}></div>

	<main class="main-panel">
		<header class="hero">
			<div class="hero-meta">
				<span>// Software Engineer</span>
				<span>Issue 01<br /><b>May 1998</b></span>
			</div>
			<h1><span>Caden</span><span>Calderon</span></h1>
			<div class="hero-bottom">
				<p>I build computer vision systems, interactive software, and weird interfaces that make hardware feel alive.</p>
				<ul>
					{#each focusAreas as area}
						<li>// {area}</li>
					{/each}
				</ul>
			</div>
		</header>

		<section class="feature">
			<div class="module-label">Featured Project</div>
			<div class="feature-art" aria-hidden="true">
				<div class="road-grid"></div>
				<div class="scan scan-a"></div>
				<div class="scan scan-b"></div>
				<div class="scan scan-c"></div>
				<div class="scan scan-d"></div>
				<div class="scan scan-e"></div>
				<div class="target target-a"></div>
				<div class="target target-b"></div>
				<div class="target target-c"></div>
			</div>
			<div class="feature-copy">
				<h2>Vision.Lab <small>v1.2</small></h2>
				<h3>Real-world perception for robotic systems</h3>
				<p>
					A computer vision toolkit and research platform for robust perception in dynamic environments.
				</p>
				<div class="tag-row">
					{#each featured.stack.slice(0, 4) as tag}
						<span>{tag}</span>
					{/each}
				</div>
				<a href="/projects/{featured.id}" class="text-link">View project -&gt;</a>
			</div>
		</section>

		<section class="lower-grid">
			<div class="data-block project-index">
				<h2>
					<button class="panel-heading" type="button" onclick={() => togglePanel('index')}>
						// Project Index
					</button>
				</h2>
				{#if !collapsedPanels.index}
					<ol>
						{#each projectIndex as project, index}
							<li>
								<span>{String(index + 1).padStart(2, '0')}</span>
								<a href="/projects/{project.id}">{project.title}</a>
								<em>{project.year}</em>
							</li>
						{/each}
					</ol>
					<a href="/projects" class="text-link">View all projects -&gt;</a>
				{/if}
			</div>

			<div class="data-block stack-block">
				<h2>
					<button class="panel-heading" type="button" onclick={() => togglePanel('stack')}>
						// Stack
					</button>
				</h2>
				{#if !collapsedPanels.stack}
					{#each stackMeters as meter}
						<div class="stack-row">
							<span>{meter.label}</span>
							<i style="--value: {meter.value}"></i>
						</div>
					{/each}
				{/if}
			</div>

			<div class="data-block note-block">
				<h2>
					<button class="panel-heading" type="button" onclick={() => togglePanel('notes')}>
						// Notes
					</button>
				</h2>
				{#if !collapsedPanels.notes}
					<p class="quote-mark">"</p>
					<p>The best interfaces make complexity feel simple. The best systems earn trust in the real world.</p>
					<p class="signature">- Caden Calderon</p>
					{#if launchApp}
						<div class="game-launchers">
							{#each games as game}
								<button type="button" onclick={() => launchApp?.(game.appId)} title={game.label}>
									{game.symbol}
								</button>
							{/each}
						</div>
					{/if}
				{/if}
			</div>
		</section>
	</main>

	<div class="rail-resizer right-resizer" role="separator" aria-orientation="vertical" onpointerdown={(event) => startRailDrag(event, 'right')}></div>
	<aside class="right-rail">
		<button class="rail-toggle right-toggle" type="button" onclick={() => (rightCollapsed = !rightCollapsed)} aria-label={rightCollapsed ? 'Expand about rail' : 'Collapse about rail'}>
			{rightCollapsed ? '<' : '>'}
		</button>
		<section class="profile-card">
			<h2>
				<button class="panel-heading" type="button" onclick={() => togglePanel('profile')}>
					About
				</button>
			</h2>
			{#if !collapsedPanels.profile}
				<div class="portrait-wrap">
					<img src="/os-assets/icons/mii-head.png" alt="Caden's Mii" draggable="false" />
					<span></span>
				</div>
				<p><b>Builder. Problem solver.</b><br />Systems thinker.</p>
			{/if}
		</section>

		<section class="side-section">
			<h2>
				<button class="panel-heading" type="button" onclick={() => togglePanel('focus')}>
					Current Focus
				</button>
			</h2>
			{#if !collapsedPanels.focus}
				<ul class="focus-list">
					{#each focusAreas as area, i}
						<li><span>{String(i + 1).padStart(2, '0')}</span>{area}</li>
					{/each}
				</ul>
			{/if}
		</section>

		<section class="side-section">
			<h2>
				<button class="panel-heading" type="button" onclick={() => togglePanel('education')}>
					Education
				</button>
			</h2>
			{#if !collapsedPanels.education}
				<p>B.S. Computer Science</p>
			{/if}
		</section>

		<section class="side-section">
			<h2>
				<button class="panel-heading" type="button" onclick={() => togglePanel('contact')}>
					Contact
				</button>
			</h2>
			{#if !collapsedPanels.contact}
				<p><a href="mailto:hello@caden.dev">hello@caden.dev</a></p>
				<p><a href="https://github.com/Caden-Calderon">github.com/Caden-Calderon</a></p>
			{/if}
		</section>

		<section class="side-section update-card">
			<h2>
				<button class="panel-heading" type="button" onclick={() => togglePanel('update')}>
					Latest Update
				</button>
			</h2>
			{#if !collapsedPanels.update}
				<p class="date">05.12.98</p>
				<p>Added Hand Gesture Smart Home and system optimizations.</p>
				<a href="/projects">View update -&gt;</a>
			{/if}
		</section>
	</aside>
</div>

<style>
	.home {
		--blue: #1238f2;
		--cyan: #27b6d6;
		--orange: #e86f22;
		--paper: #eeeeec;
		--ink: #111111;
		--line: #8e8e8a;
		--soft-line: #c7c7c1;
		display: grid;
		grid-template-columns: var(--left-width) 4px 1fr 4px var(--right-width);
		min-width: 1180px;
		height: 100%;
		min-height: 0;
		max-height: 100%;
		overflow: hidden;
		background:
			linear-gradient(rgba(18, 56, 242, 0.055) 1px, transparent 1px),
			linear-gradient(90deg, rgba(18, 56, 242, 0.045) 1px, transparent 1px),
			var(--paper);
		background-size: 12px 12px, 12px 12px, auto;
		color: var(--ink);
		font-family: 'Pixelated MS Sans Serif', 'MS Sans Serif', monospace;
		font-size: 11px;
		line-height: 1.35;
	}

	.left-rail,
	.right-rail,
	.main-panel {
		min-width: 0;
		min-height: 0;
		height: 100%;
		overflow: hidden;
	}

	.home.dragging {
		cursor: col-resize;
		user-select: none;
	}

	.left-rail,
	.right-rail {
		border: 2px ridge #c0c0c0;
		background: rgba(238, 238, 236, 0.96);
	}

	.left-rail {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 6px;
		border-right-color: #777;
	}

	.right-rail {
		position: relative;
		grid-column: 5;
		padding: 32px 16px 16px;
		border-left-color: #777;
	}

	.main-panel {
		grid-column: 3;
	}

	.rail-resizer {
		background:
			linear-gradient(90deg, #808080 0 1px, #ffffff 1px 2px, #c0c0c0 2px 100%);
		cursor: col-resize;
		z-index: 2;
	}

	.left-resizer {
		grid-column: 2;
	}

	.right-resizer {
		grid-column: 4;
	}

	.rail-toggle {
		position: absolute;
		top: 4px;
		z-index: 3;
		width: 20px;
		height: 18px;
		min-width: 0;
		min-height: 0;
		padding: 0;
		color: #000;
		background: #c0c0c0;
		font-family: inherit;
		font-size: 10px;
		line-height: 1;
		text-shadow: none;
	}

	.left-toggle {
		right: 4px;
	}

	.right-toggle {
		left: 4px;
	}

	.left-collapsed .left-rail,
	.right-collapsed .right-rail {
		padding: 24px 4px 4px;
	}

	.left-collapsed .left-rail::after,
	.right-collapsed .right-rail::after {
		position: absolute;
		top: 52px;
		left: 50%;
		color: var(--blue);
		font-weight: 700;
		text-transform: uppercase;
		transform: translateX(-50%) rotate(90deg);
		transform-origin: center;
	}

	.left-collapsed .left-rail::after {
		content: 'Nav';
	}

	.right-collapsed .right-rail::after {
		content: 'About';
	}

	.left-collapsed .left-rail .rail-panel,
	.right-collapsed .right-rail section {
		display: none;
	}

	.rail-panel {
		border: 1px solid var(--line);
		background: rgba(255, 255, 255, 0.34);
	}

	.rail-panel h2,
	.side-section h2,
	.profile-card h2 {
		margin: 0;
		background: var(--blue);
		color: #fff;
		font-size: 11px;
		line-height: 1;
		text-transform: uppercase;
		letter-spacing: 0;
	}

	.panel-heading {
		display: block;
		width: 100%;
		min-width: 0;
		min-height: 0;
		padding: 4px 9px;
		border: 0;
		color: inherit;
		background: transparent;
		font-family: inherit;
		font-size: inherit;
		font-weight: 700;
		line-height: 1;
		text-align: left;
		text-transform: inherit;
		text-shadow: none;
		box-shadow: none;
		cursor: pointer;
	}

	.panel-heading:hover,
	.panel-heading:focus-visible {
		color: var(--orange);
		outline: 1px dotted currentColor;
		outline-offset: -2px;
	}

	.nav-list {
		display: flex;
		flex-direction: column;
		padding: 9px 10px;
	}

	.nav-list a {
		position: relative;
		display: grid;
		grid-template-columns: 24px 1fr 8px;
		align-items: center;
		gap: 8px;
		min-height: 34px;
		border-bottom: 1px dotted var(--soft-line);
		color: #4c4c48;
		text-decoration: none;
		text-transform: uppercase;
		font-weight: 700;
	}

	.nav-list a:hover,
	.nav-list a:focus-visible {
		color: var(--orange);
		outline: 1px dotted currentColor;
		outline-offset: -2px;
	}

	.nav-list a.active {
		color: var(--blue);
	}

	.nav-list img {
		width: 20px;
		height: 20px;
		object-fit: contain;
		image-rendering: pixelated;
		filter: grayscale(1) contrast(1.3);
	}

	.nav-list a.active img,
	.nav-list a:hover img {
		filter: none;
	}

	.nav-list b {
		width: 0;
		height: 0;
		border-top: 6px solid transparent;
		border-bottom: 6px solid transparent;
		border-left: 6px solid #e21f26;
	}

	.link-panel,
	.building-panel,
	.github-panel,
	.availability-panel,
	.visitor-panel,
	.now-panel {
		padding-bottom: 9px;
	}

	.compact-links,
	.build-list {
		list-style: none;
		margin: 0;
		padding: 8px 10px 2px;
	}

	.compact-links li {
		border-bottom: 1px dotted var(--soft-line);
	}

	.compact-links a,
	.panel-link {
		display: block;
		padding: 5px 0;
		color: #4c4c48;
		text-decoration: none;
		text-transform: uppercase;
		font-weight: 700;
	}

	.compact-links a:hover,
	.compact-links a:focus-visible,
	.panel-link:hover,
	.panel-link:focus-visible {
		color: var(--orange);
		outline: none;
		text-decoration: underline;
	}

	.build-list li {
		display: grid;
		grid-template-columns: 20px minmax(0, 1fr);
		gap: 4px 6px;
		padding: 5px 0;
		border-bottom: 1px dotted var(--soft-line);
	}

	.build-list span {
		grid-row: span 2;
		color: var(--orange);
		font-weight: 700;
	}

	.build-list b {
		text-transform: uppercase;
	}

	.build-list em {
		color: var(--cyan);
		font-style: normal;
		text-transform: uppercase;
	}

	.stat-list {
		margin: 9px 10px 5px;
	}

	.stat-list div {
		display: flex;
		justify-content: space-between;
		gap: 8px;
		margin: 7px 0;
	}

	.panel-link {
		margin: 4px 10px 0;
		padding: 0;
		color: var(--blue);
	}

	.panel-link.orange {
		color: var(--orange);
	}

	dt,
	dd {
		margin: 0;
	}

	dt {
		text-transform: uppercase;
		font-weight: 700;
	}

	.stack-row i {
		--value: 8;
		position: relative;
		display: block;
		height: 9px;
		background: repeating-linear-gradient(90deg, #d2d2cd 0 7px, transparent 7px 10px);
		border: 1px solid #d7d7d2;
	}

	.stack-row i::before {
		content: '';
		position: absolute;
		inset: 0 auto 0 0;
		width: calc(var(--value) * 6.25%);
		background: repeating-linear-gradient(90deg, var(--blue) 0 7px, transparent 7px 10px);
	}

	.visitor-counter {
		display: grid;
		grid-template-columns: repeat(8, 1fr);
		gap: 2px;
		margin: 10px;
	}

	.visitor-counter span {
		display: grid;
		place-items: center;
		height: 20px;
		border: 1px solid #777;
		background: #101010;
		color: #f0f0ec;
		font-size: 13px;
		font-weight: 700;
	}

	.microcopy {
		display: block;
		margin: 0 10px;
		color: #4c4c48;
		text-decoration: none;
	}

	.review-link:hover,
	.review-link:focus-visible {
		color: var(--orange);
		outline: none;
		text-decoration: underline;
	}

	.review-link span {
		color: #4c4c48;
	}

	.review-link:hover span,
	.review-link:focus-visible span {
		color: #ffd51d;
	}

	.album-row {
		display: grid;
		grid-template-columns: 52px 1fr;
		gap: 9px;
		padding: 11px 10px 4px;
	}

	.album-row p {
		margin: 0;
	}

	.album-art {
		position: relative;
		width: 52px;
		height: 52px;
		overflow: hidden;
		background: #020405;
		border: 1px solid #111;
	}

	.album-art span {
		position: absolute;
		inset: 11px;
		border: 1px solid #00a9c9;
		border-radius: 50%;
		transform: rotate(calc(var(--i, 0) * 18deg)) scale(calc(1 + var(--i, 0) * 0.12));
	}

	.album-art span:nth-child(1) { --i: 1; }
	.album-art span:nth-child(2) { --i: 2; }
	.album-art span:nth-child(3) { --i: 3; }
	.album-art span:nth-child(4) { --i: 4; }

	.track-bar {
		height: 4px;
		margin: 7px 10px 12px;
		background: #c8c8c4;
	}

	.track-bar span {
		display: block;
		width: 44%;
		height: 100%;
		background: var(--blue);
	}

	.player-buttons {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 6px;
		padding: 0 10px;
	}

	.player-buttons button,
	.game-launchers button {
		min-width: 0;
		height: 24px;
		padding: 0;
		color: #000;
		font-family: inherit;
		font-size: 10px;
	}

	.main-panel {
		padding: 18px 18px 0;
		border-top: 2px ridge #c0c0c0;
		border-bottom: 2px ridge #c0c0c0;
		background: rgba(238, 238, 236, 0.86);
		container: main-panel / inline-size;
	}

	.hero {
		border-bottom: 1px solid var(--line);
		padding-bottom: 18px;
	}

	.hero-meta {
		display: flex;
		justify-content: space-between;
		gap: 16px;
		color: var(--blue);
		text-transform: uppercase;
		font-weight: 700;
		font-size: 13px;
	}

	.hero-meta b {
		color: var(--orange);
	}

	h1 {
		margin: 7px 0 10px;
		overflow: hidden;
		font-family: Impact, Haettenschweiler, 'Arial Narrow Bold', 'Arial Black', sans-serif;
		font-size: 166px;
		font-weight: 900;
		line-height: 0.79;
		letter-spacing: 0;
		text-transform: uppercase;
	}

	h1 span {
		display: block;
		width: 146%;
		transform: scaleX(0.68);
		transform-origin: left center;
	}

	h1 span:first-child {
		color: #090909;
	}

	h1 span:last-child {
		color: var(--blue);
	}

	.hero-bottom {
		display: grid;
		grid-template-columns: minmax(230px, 1fr) minmax(180px, 0.65fr);
		gap: 24px;
		align-items: end;
	}

	.hero-bottom p {
		max-width: 520px;
		margin: 0;
		font-size: 14px;
		line-height: 1.15;
		text-transform: uppercase;
		font-weight: 700;
	}

	.hero-bottom ul,
	.focus-list {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.hero-bottom li {
		color: var(--cyan);
		text-transform: uppercase;
		font-weight: 700;
	}

	.feature {
		display: grid;
		grid-template-columns: minmax(260px, 1.25fr) minmax(210px, 0.9fr);
		gap: 16px;
		position: relative;
		padding: 20px 0 14px;
		border-bottom: 1px solid var(--line);
	}

	.module-label {
		position: absolute;
		top: 7px;
		left: 0;
		color: var(--blue);
		text-transform: uppercase;
		font-weight: 700;
	}

	.feature-art {
		position: relative;
		min-height: 160px;
		margin-top: 12px;
		overflow: hidden;
		border: 1px solid #222;
		background:
			radial-gradient(circle at 18% 30%, rgba(255, 255, 255, 0.95) 0 1px, transparent 2px),
			radial-gradient(circle at 42% 22%, rgba(255, 255, 255, 0.7) 0 1px, transparent 2px),
			radial-gradient(circle at 74% 38%, rgba(255, 255, 255, 0.75) 0 1px, transparent 2px),
			linear-gradient(180deg, #101010 0%, #050505 100%);
		background-size: 10px 10px, 13px 13px, 8px 8px, auto;
	}

	.road-grid {
		position: absolute;
		inset: 48% -20% -8% -20%;
		background:
			linear-gradient(90deg, transparent 49%, rgba(255, 255, 255, 0.5) 50%, transparent 51%),
			repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.22) 0 1px, transparent 1px 40px),
			repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.28) 0 1px, transparent 1px 18px);
		transform: perspective(180px) rotateX(56deg);
		transform-origin: top center;
	}

	.scan {
		position: absolute;
		border: 1px solid rgba(39, 182, 214, 0.9);
		box-shadow: 0 0 0 1px rgba(39, 182, 214, 0.22) inset;
	}

	.scan-a { left: 4%; bottom: 22%; width: 28%; height: 36%; }
	.scan-b { left: 36%; bottom: 28%; width: 12%; height: 20%; }
	.scan-c { left: 50%; bottom: 25%; width: 18%; height: 28%; }
	.scan-d { right: 10%; bottom: 20%; width: 16%; height: 42%; }
	.scan-e { right: 3%; bottom: 18%; width: 10%; height: 28%; }

	.target {
		position: absolute;
		width: 9px;
		height: 9px;
		border: 1px solid var(--cyan);
	}

	.target-a { left: 22%; top: 36%; }
	.target-b { left: 57%; top: 42%; }
	.target-c { right: 21%; top: 31%; }

	.feature-copy {
		align-self: center;
		padding-top: 16px;
	}

	.feature-copy h2 {
		margin: 0;
		font-size: 30px;
		line-height: 0.95;
		text-transform: uppercase;
		letter-spacing: 0;
	}

	.feature-copy small,
	.date,
	.update-card a {
		color: var(--orange);
	}

	.feature-copy h3 {
		margin: 8px 0;
		color: var(--cyan);
		font-size: 14px;
		line-height: 1.1;
		text-transform: uppercase;
	}

	.feature-copy p {
		margin: 0 0 10px;
		max-width: 280px;
	}

	.tag-row {
		display: flex;
		flex-wrap: wrap;
		gap: 5px;
		margin-bottom: 12px;
	}

	.tag-row span {
		padding: 3px 8px;
		border: 1px solid #999;
		background: #e2e2dd;
		text-transform: uppercase;
		font-size: 10px;
		font-weight: 700;
	}

	.text-link,
	.update-card a {
		color: var(--blue);
		text-decoration: none;
		text-transform: uppercase;
		font-weight: 700;
	}

	.text-link:hover,
	.text-link:focus-visible,
	.right-rail a:hover,
	.right-rail a:focus-visible,
	.nav-list a:hover {
		color: var(--orange);
		text-decoration: underline;
		outline: none;
	}

	.lower-grid {
		display: grid;
		grid-template-columns: 1.25fr 0.9fr 0.9fr;
		gap: 14px;
		padding: 12px 0;
	}

	.data-block + .data-block {
		border-left: 1px dotted var(--line);
		padding-left: 14px;
	}

	.data-block h2 {
		margin: 0 0 8px;
		color: var(--blue);
		font-size: 11px;
		text-transform: uppercase;
	}

	.data-block .panel-heading {
		padding: 0;
		color: var(--blue);
	}

	.project-index ol {
		list-style: none;
		margin: 0 0 8px;
		padding: 0;
	}

	.project-index li {
		display: grid;
		grid-template-columns: 18px minmax(0, 1fr) 38px;
		gap: 8px;
		margin: 2px 0;
	}

	.project-index span {
		color: var(--orange);
	}

	.project-index a,
	.right-rail a {
		color: #4c4c48;
		text-decoration: none;
	}

	.project-index a:hover,
	.project-index a:focus-visible {
		color: var(--orange);
		outline: none;
	}

	.project-index em {
		font-style: normal;
		text-align: right;
	}

	.stack-row {
		display: grid;
		grid-template-columns: 70px 1fr;
		align-items: center;
		gap: 8px;
		margin: 2px 0;
	}

	.stack-row i {
		height: 8px;
	}

	.note-block p {
		margin: 0 0 8px;
	}

	.quote-mark {
		color: var(--blue);
		font-family: Georgia, serif;
		font-size: 34px;
		line-height: 0.6;
	}

	.signature {
		color: var(--blue);
		font-weight: 700;
	}

	.game-launchers {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 4px;
		margin-top: 10px;
	}

	.profile-card {
		padding-bottom: 12px;
		border-bottom: 1px dotted var(--line);
	}

	.profile-card h2,
	.side-section h2 {
		padding: 0;
		background: transparent;
		color: var(--blue);
	}

	.profile-card .panel-heading,
	.side-section .panel-heading {
		padding: 0;
		color: var(--blue);
	}

	.portrait-wrap {
		position: relative;
		margin: 9px 0 10px;
		min-height: 136px;
		background:
			linear-gradient(rgba(18, 56, 242, 0.12) 1px, transparent 1px),
			linear-gradient(90deg, rgba(18, 56, 242, 0.12) 1px, transparent 1px);
		background-size: 8px 8px;
	}

	.portrait-wrap img {
		width: 136px;
		height: 136px;
		object-fit: cover;
		filter: grayscale(1) contrast(1.25);
		border: 1px solid #111;
		background: #d7d7d2;
	}

	.portrait-wrap span {
		position: absolute;
		right: 18px;
		top: 58%;
		width: 17px;
		height: 17px;
		background: var(--blue);
	}

	.profile-card p,
	.side-section p {
		margin: 8px 0 0;
	}

	.side-section {
		padding: 14px 0;
		border-bottom: 1px dotted var(--line);
	}

	.focus-list li {
		display: grid;
		grid-template-columns: 28px 1fr;
		gap: 8px;
		margin: 8px 0;
	}

	.focus-list span {
		color: var(--blue);
		font-weight: 700;
	}

	.date {
		font-size: 14px;
		font-weight: 700;
	}
</style>
