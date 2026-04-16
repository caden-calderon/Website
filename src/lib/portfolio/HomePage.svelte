<!--
  Portal-style homepage for http://chromatic.dev/
  Early-2000s tech site aesthetic: gradient section headers, gel buttons,
  rounded widget boxes, warm sidebar panels.
-->
<script lang="ts">
	import { projects } from './projects.js';
	import type { AppId } from '$lib/os/types.js';

	let { launchApp }: { launchApp?: (id: AppId) => void } = $props();

	const featured = projects.filter((p) => p.type === 'interactive');
	const tools = projects.filter((p) => p.tags.includes('ml') || p.tags.includes('systems'));
</script>

<div class="home">
	<!-- ── Hero banner ──────────────────────────────────────────────────── -->
	<div class="banner">
		<img src="/os-assets/icons/mii-head.png" alt="" class="banner-mii" />
		<div class="banner-inner">
			<h1>Chromatic</h1>
			<p class="subtitle">The portfolio of Caden Calderon</p>
			<p class="tagline">Graphics &middot; AI/ML &middot; Interactive Systems</p>
		</div>
	</div>

	<div class="body">
		<!-- ── Main column ──────────────────────────────────────────────── -->
		<div class="main-col">
			<!-- Featured Projects -->
			<div class="section">
				<div class="section-header">
					<span class="section-icon">&#9733;</span>
					Featured Projects
				</div>
				<div class="section-body">
					<div class="project-grid">
						{#each featured as project (project.id)}
							<a href="/projects/{project.id}" class="project-card">
								<div class="card-header">{project.title}</div>
								<div class="card-body">
									<p class="card-desc">{project.tagline}</p>
									{#if project.appId}
										<span class="card-badge">&#9654; Live Demo</span>
									{/if}
								</div>
							</a>
						{/each}
					</div>
				</div>
			</div>

			<!-- Tools & Research -->
			{#if tools.length > 0}
				<div class="section">
					<div class="section-header section-header-alt">
						<span class="section-icon">&#9881;</span>
						Tools &amp; Research
					</div>
					<div class="section-body">
						<div class="project-grid">
							{#each tools as project (project.id)}
								<a href="/projects/{project.id}" class="project-card">
									<div class="card-header">{project.title}</div>
									<div class="card-body">
										<p class="card-desc">{project.tagline}</p>
									</div>
								</a>
							{/each}
						</div>
					</div>
				</div>
			{/if}
		</div>

		<!-- ── Sidebar ──────────────────────────────────────────────────── -->
		<div class="sidebar">
			<!-- Quick Links -->
			<div class="widget">
				<div class="widget-header">Quick Links</div>
				<div class="widget-body">
					<ul>
						<li><a href="/projects">&#9658; All Projects</a></li>
						<li><a href="/about">&#9658; About Me</a></li>
					</ul>
				</div>
			</div>

			<!-- Play a Game -->
			<div class="widget">
				<div class="widget-header widget-header-green">Play a Game</div>
				<div class="widget-body">
					<ul>
						{#if launchApp}
							<li><button class="link-btn" onclick={() => launchApp?.('chess')}>&#9823; Chess</button></li>
							<li><button class="link-btn" onclick={() => launchApp?.('axial')}>&#9679; Axial</button></li>
							<li><button class="link-btn" onclick={() => launchApp?.('solitaire')}>&#9830; Solitaire</button></li>
							<li><button class="link-btn" onclick={() => launchApp?.('minesweeper')}>&#9646; Minesweeper</button></li>
						{/if}
					</ul>
				</div>
			</div>

			<!-- About This Site -->
			<div class="widget">
				<div class="widget-header widget-header-teal">About This Site</div>
				<div class="widget-body">
					<p>You're inside a Windows 98 desktop running in the browser.</p>
					<p>Try the <b>Start</b> menu, open some apps, or <a href="/about">learn more</a>.</p>
				</div>
			</div>
		</div>
	</div>

	<!-- ── Footer ──────────────────────────────────────────────────────── -->
	<div class="footer">
		&copy; 2026 Caden Calderon &middot; Built with SvelteKit, Three.js, and too much nostalgia
	</div>
</div>

<style>
	.home {
		font-family: 'Pixelated MS Sans Serif', Arial, sans-serif;
		font-size: 11px;
		line-height: 1.5;
		color: #000;
		background: #eef2f7;
	}

	/* ═══════════════════════════════════════════════════════════════════════
	   Banner
	   ═══════════════════════════════════════════════════════════════════ */

	.banner {
		background: linear-gradient(135deg, #0a1a44 0%, #1a4488 35%, #2266aa 65%, #1a7a8a 100%);
		padding: 16px 24px;
		color: #fff;
		border-bottom: 3px solid #0a3060;
		display: flex;
		align-items: center;
		gap: 16px;
	}

	.banner-mii {
		width: 52px;
		height: 52px;
		border-radius: 50%;
		border: 2px solid rgba(255, 255, 255, 0.6);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
		object-fit: cover;
		flex-shrink: 0;
	}

	.banner h1 {
		font-size: 22px;
		margin: 0;
		letter-spacing: 2px;
		text-shadow: 1px 2px 3px rgba(0, 0, 0, 0.4);
	}

	.subtitle {
		margin: 2px 0 0;
		font-size: 11px;
		opacity: 0.9;
	}

	.tagline {
		margin: 4px 0 0;
		font-size: 10px;
		letter-spacing: 1px;
		color: #a0d0ff;
	}

	/* ═══════════════════════════════════════════════════════════════════════
	   Body layout
	   ═══════════════════════════════════════════════════════════════════ */

	.body {
		display: flex;
		gap: 0;
	}

	.main-col {
		flex: 1;
		padding: 10px 12px;
		min-width: 0;
	}

	/* ═══════════════════════════════════════════════════════════════════════
	   Sections (gradient header + bordered body)
	   ═══════════════════════════════════════════════════════════════════ */

	.section {
		margin-bottom: 10px;
		border: 1px solid #a0b4cc;
		border-radius: 4px;
		overflow: hidden;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
	}

	.section-header {
		background: linear-gradient(180deg, #4a7db8 0%, #335d8e 100%);
		color: #fff;
		padding: 4px 10px;
		font-weight: bold;
		font-size: 11px;
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.section-header-alt {
		background: linear-gradient(180deg, #6b8e5e 0%, #4d7040 100%);
	}

	.section-icon {
		font-size: 12px;
	}

	.section-body {
		background: #fff;
		padding: 10px;
	}

	/* ═══════════════════════════════════════════════════════════════════════
	   Project cards
	   ═══════════════════════════════════════════════════════════════════ */

	.project-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(135px, 1fr));
		gap: 8px;
	}

	.project-card {
		display: block;
		border: 1px solid #b8c8d8;
		border-radius: 4px;
		background: linear-gradient(180deg, #fafcff 0%, #e8eef6 100%);
		text-decoration: none;
		color: #000;
		overflow: hidden;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
		transition: border-color 0.1s;
	}

	.project-card:hover {
		border-color: #4a7db8;
		background: linear-gradient(180deg, #fff 0%, #eef3fb 100%);
	}

	.card-header {
		background: linear-gradient(180deg, #dde6f0 0%, #c8d4e4 100%);
		padding: 4px 8px;
		font-weight: bold;
		color: #1a3a66;
		font-size: 11px;
		border-bottom: 1px solid #b0c0d4;
	}

	.card-body {
		padding: 6px 8px;
	}

	.card-desc {
		margin: 0;
		color: #404040;
		font-size: 11px;
	}

	.card-badge {
		display: inline-block;
		margin-top: 6px;
		padding: 2px 8px;
		background: linear-gradient(180deg, #5cb85c 0%, #3a8a3a 100%);
		color: #fff;
		font-size: 10px;
		font-weight: bold;
		border-radius: 2px;
		border: 1px solid #2d6e2d;
		text-shadow: 0 1px 0 rgba(0, 0, 0, 0.2);
	}

	/* ═══════════════════════════════════════════════════════════════════════
	   Sidebar
	   ═══════════════════════════════════════════════════════════════════ */

	.sidebar {
		width: 155px;
		flex-shrink: 0;
		padding: 10px 10px 10px 0;
	}

	/* ── Widget boxes ──────────────────────────────────────────────────── */

	.widget {
		border: 1px solid #a0b4cc;
		border-radius: 4px;
		overflow: hidden;
		margin-bottom: 8px;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
	}

	.widget-header {
		background: linear-gradient(180deg, #5588bb 0%, #3d6d99 100%);
		color: #fff;
		padding: 3px 8px;
		font-weight: bold;
		font-size: 11px;
	}

	.widget-header-green {
		background: linear-gradient(180deg, #5eaa5e 0%, #3d7d3d 100%);
	}

	.widget-header-teal {
		background: linear-gradient(180deg, #4a9999 0%, #357070 100%);
	}

	.widget-body {
		background: #fff;
		padding: 6px 8px;
	}

	.widget-body ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.widget-body li {
		padding: 2px 0;
	}

	.widget-body p {
		margin: 3px 0;
		color: #404040;
	}

	.widget-body a {
		color: #0044cc;
		text-decoration: none;
	}

	.widget-body a:hover {
		text-decoration: underline;
		color: #cc0000;
	}

	/* ── Link-styled buttons ───────────────────────────────────────────── */

	.link-btn {
		all: unset;
		color: #0044cc;
		cursor: pointer;
		font-family: inherit;
		font-size: inherit;
	}

	.link-btn:hover {
		text-decoration: underline;
		color: #cc0000;
	}

	/* ═══════════════════════════════════════════════════════════════════════
	   Footer
	   ═══════════════════════════════════════════════════════════════════ */

	.footer {
		text-align: center;
		padding: 8px 16px;
		color: #808080;
		border-top: 1px solid #c0cdd8;
		background: #e4eaf0;
		font-size: 10px;
	}
</style>
