<script lang="ts">
	import {
		availabilityItems,
		buildQueue,
		githubStats,
		navItems,
		quickLinks,
	} from './homePageData.js';
	import type { LeftPanelKey } from './homePageTypes.js';

	let {
		collapsed,
		railElement = $bindable<HTMLElement | null>(),
		isPanelOpen,
		onTogglePanel,
		onToggleCollapse,
	}: {
		collapsed: boolean;
		railElement: HTMLElement | null;
		isPanelOpen: (panel: LeftPanelKey) => boolean;
		onTogglePanel: (panel: LeftPanelKey) => void;
		onToggleCollapse: () => void;
	} = $props();
</script>

<aside class="left-rail" bind:this={railElement}>
	<button
		class="rail-toggle left-toggle"
		type="button"
		onclick={onToggleCollapse}
		aria-label={collapsed ? 'Expand navigation rail' : 'Collapse navigation rail'}
	>
		{collapsed ? '>' : '<'}
	</button>

	<section class="rail-panel nav-panel">
		<h2>
			<button
				class="panel-heading"
				type="button"
				onclick={() => onTogglePanel('nav')}
				aria-expanded={isPanelOpen('nav')}
			>
				Navigation
			</button>
		</h2>
		{#if isPanelOpen('nav')}
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
			<button
				class="panel-heading"
				type="button"
				onclick={() => onTogglePanel('quick')}
				aria-expanded={isPanelOpen('quick')}
			>
				Quick Links
			</button>
		</h2>
		{#if isPanelOpen('quick')}
			<ul class="compact-links">
				{#each quickLinks as link}
					<li><a href={link.href}>{link.label} -&gt;</a></li>
				{/each}
			</ul>
		{/if}
	</section>

	<section class="rail-panel building-panel">
		<h2>
			<button
				class="panel-heading"
				type="button"
				onclick={() => onTogglePanel('building')}
				aria-expanded={isPanelOpen('building')}
			>
				Currently Building
			</button>
		</h2>
		{#if isPanelOpen('building')}
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
			<button
				class="panel-heading"
				type="button"
				onclick={() => onTogglePanel('github')}
				aria-expanded={isPanelOpen('github')}
			>
				GitHub Signal
			</button>
		</h2>
		{#if isPanelOpen('github')}
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
			<button
				class="panel-heading"
				type="button"
				onclick={() => onTogglePanel('availability')}
				aria-expanded={isPanelOpen('availability')}
			>
				Availability
			</button>
		</h2>
		{#if isPanelOpen('availability')}
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
			<button
				class="panel-heading"
				type="button"
				onclick={() => onTogglePanel('visitor')}
				aria-expanded={isPanelOpen('visitor')}
			>
				Visitor Counter
			</button>
		</h2>
		{#if isPanelOpen('visitor')}
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
			<button
				class="panel-heading"
				type="button"
				onclick={() => onTogglePanel('now')}
				aria-expanded={isPanelOpen('now')}
			>
				Now Playing
			</button>
		</h2>
		{#if isPanelOpen('now')}
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
