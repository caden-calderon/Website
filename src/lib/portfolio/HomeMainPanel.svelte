<script lang="ts">
	import { focusAreas, games, stackMeters } from './homePageData.js';
	import type { CollapsedPanels, PanelKey } from './homePageTypes.js';
	import type { PortfolioProject } from './types.js';
	import type { AppId } from '$lib/os/types.js';

	let {
		featured,
		projectIndex,
		collapsedPanels,
		onTogglePanel,
		launchApp,
	}: {
		featured: PortfolioProject;
		projectIndex: PortfolioProject[];
		collapsedPanels: CollapsedPanels;
		onTogglePanel: (panel: PanelKey) => void;
		launchApp?: (id: AppId) => void;
	} = $props();
</script>

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
			<p>A computer vision toolkit and research platform for robust perception in dynamic environments.</p>
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
				<button class="panel-heading" type="button" onclick={() => onTogglePanel('index')}>
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
				<button class="panel-heading" type="button" onclick={() => onTogglePanel('stack')}>
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
				<button class="panel-heading" type="button" onclick={() => onTogglePanel('notes')}>
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
