<script lang="ts">
	import { focusAreas } from './homePageData.js';
	import type { CollapsedPanels, PanelKey } from './homePageTypes.js';

	let {
		collapsed,
		collapsedPanels,
		onTogglePanel,
		onToggleCollapse,
	}: {
		collapsed: boolean;
		collapsedPanels: CollapsedPanels;
		onTogglePanel: (panel: PanelKey) => void;
		onToggleCollapse: () => void;
	} = $props();
</script>

<aside class="right-rail">
	<button
		class="rail-toggle right-toggle"
		type="button"
		onclick={onToggleCollapse}
		aria-label={collapsed ? 'Expand about rail' : 'Collapse about rail'}
	>
		{collapsed ? '<' : '>'}
	</button>

	<section class="profile-card">
		<h2>
			<button class="panel-heading" type="button" onclick={() => onTogglePanel('profile')}>
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
			<button class="panel-heading" type="button" onclick={() => onTogglePanel('focus')}>
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
			<button class="panel-heading" type="button" onclick={() => onTogglePanel('education')}>
				Education
			</button>
		</h2>
		{#if !collapsedPanels.education}
			<p>B.S. Computer Science</p>
		{/if}
	</section>

	<section class="side-section">
		<h2>
			<button class="panel-heading" type="button" onclick={() => onTogglePanel('contact')}>
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
			<button class="panel-heading" type="button" onclick={() => onTogglePanel('update')}>
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
