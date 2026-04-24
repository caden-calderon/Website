<!--
  Individual project dossier for http://chromatic.dev/projects/:slug.
  Sharp archive page with launch actions and intentional missing-project state.
-->
<script lang="ts">
	import { getProject } from './projects.js';
	import type { AppId } from '$lib/os/types.js';

	let {
		slug,
		launchApp,
	}: {
		slug: string;
		launchApp?: (id: AppId) => void;
	} = $props();

	const project = $derived(getProject(slug));
	const launchEnabled = $derived(Boolean(project?.appId && launchApp));

	function statusLabel(status: string | undefined) {
		return status ? status.toUpperCase() : 'CATALOGED';
	}
</script>

{#if project}
	<article class="project-dossier accent-{project.accent ?? 'blue'}">
		<header class="dossier-header">
			<nav class="breadcrumb" aria-label="Breadcrumb">
				<a href="/">Home</a>
				<span>/</span>
				<a href="/projects">Projects</a>
				<span>/</span>
				<b>{project.code ?? project.id}</b>
			</nav>
			<div class="issue-line">
				<span>// Project Dossier</span>
				<span>{statusLabel(project.status)} / {project.year}</span>
			</div>
			<h1>{project.title}</h1>
			<p>{project.tagline}</p>
		</header>

		<div class="dossier-grid">
			<section class="primary-file">
				<div class="module-title">// Case File</div>
				<p class="description">{project.description}</p>

				<div class="action-strip">
					{#if project.appId}
						<button
							type="button"
							class="launch-btn"
							disabled={!launchEnabled}
							onclick={() => project?.appId && launchApp?.(project.appId)}
						>
							Launch app -&gt;
						</button>
					{:else}
						<span class="offline-action">No live app attached</span>
					{/if}

					{#each project.links ?? [] as link}
						<a class="file-action" href={link.href}>{link.label} -&gt;</a>
					{/each}
				</div>
			</section>

			<aside class="meta-panel">
				<div class="module-title">// Project Meta</div>
				<dl>
					<div>
						<dt>Code</dt>
						<dd>{project.code ?? project.id.toUpperCase()}</dd>
					</div>
					<div>
						<dt>Year</dt>
						<dd>{project.year}</dd>
					</div>
					<div>
						<dt>Type</dt>
						<dd>{project.type === 'interactive' ? 'Interactive system' : 'Research walkthrough'}</dd>
					</div>
					<div>
						<dt>Status</dt>
						<dd>{statusLabel(project.status)}</dd>
					</div>
					<div>
						<dt>Role</dt>
						<dd>{project.role ?? 'Design and implementation'}</dd>
					</div>
				</dl>
			</aside>

			<section class="stack-panel">
				<div class="module-title">// Stack</div>
				<div class="stack-grid">
					{#each project.stack as tech, index}
						<span style="--index: {index}">{tech}</span>
					{/each}
				</div>
			</section>

			<section class="tag-panel">
				<div class="module-title">// Archive Tags</div>
				<ul>
					{#each project.tags as tag}
						<li>{tag}</li>
					{/each}
				</ul>
			</section>
		</div>

		<footer class="nav-footer">
			<a href="/projects">&lt;- All projects</a>
			<a href="/">Home -&gt;</a>
		</footer>
	</article>
{:else}
	<section class="project-dossier missing">
		<p>// Missing Dossier</p>
		<h1>Project Not Indexed</h1>
		<span>Requested slug: {slug}</span>
		<a href="/projects">&lt;- Return to project archive</a>
	</section>
{/if}

<style>
	.project-dossier {
		--blue: #1238f2;
		--orange: #e86f22;
		--cyan: #27b6d6;
		--paper: #eeeeec;
		--ink: #080808;
		--line: #85857f;
		--soft-line: #c7c7c1;
		--accent: var(--blue);
		min-width: 0;
		min-height: 100%;
		padding: 18px 20px 16px;
		color: var(--ink);
		background:
			linear-gradient(rgba(18, 56, 242, 0.055) 1px, transparent 1px),
			linear-gradient(90deg, rgba(18, 56, 242, 0.045) 1px, transparent 1px),
			var(--paper);
		background-size: 12px 12px, 12px 12px, auto;
		font-family: 'Pixelated MS Sans Serif', 'MS Sans Serif', monospace;
		font-size: 11px;
		line-height: 1.34;
	}

	.accent-orange {
		--accent: var(--orange);
	}

	.accent-cyan {
		--accent: var(--cyan);
	}

	.accent-black {
		--accent: #050505;
	}

	.dossier-header {
		border-bottom: 1px solid var(--line);
		padding-bottom: 14px;
	}

	.breadcrumb,
	.issue-line,
	.module-title,
	.nav-footer {
		display: flex;
		justify-content: space-between;
		gap: 14px;
		color: var(--blue);
		font-weight: 700;
		text-transform: uppercase;
	}

	.breadcrumb {
		justify-content: flex-start;
		margin-bottom: 12px;
		font-size: 10px;
	}

	.issue-line span:last-child {
		color: var(--orange);
	}

	h1 {
		margin: 5px 0 8px;
		color: #050505;
		font-family: Impact, 'Arial Black', sans-serif;
		font-size: clamp(58px, 9vw, 122px);
		font-weight: 900;
		letter-spacing: 0;
		line-height: 0.86;
		text-transform: uppercase;
	}

	.dossier-header p {
		max-width: 620px;
		margin: 0;
		font-size: 13px;
		font-weight: 700;
	}

	.dossier-grid {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 270px;
		gap: 16px;
		padding-top: 14px;
	}

	.primary-file,
	.stack-panel,
	.tag-panel,
	.meta-panel {
		min-width: 0;
		border-top: 1px solid var(--line);
		padding-top: 8px;
		background: rgba(238, 238, 236, 0.42);
	}

	.primary-file {
		position: relative;
		min-height: 210px;
		padding-right: 18px;
	}

	.primary-file::after {
		content: '';
		position: absolute;
		right: 0;
		top: 8px;
		bottom: 0;
		width: 82px;
		background:
			linear-gradient(90deg, transparent 0 10px, rgba(18, 56, 242, 0.45) 10px 11px, transparent 11px),
			linear-gradient(0deg, transparent 0 10px, rgba(18, 56, 242, 0.45) 10px 11px, transparent 11px);
		background-size: 11px 11px;
		opacity: 0.42;
		pointer-events: none;
	}

	.description {
		position: relative;
		z-index: 1;
		max-width: 680px;
		margin: 14px 0 18px;
		font-size: 13px;
	}

	.action-strip {
		position: relative;
		z-index: 1;
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		align-items: center;
	}

	.launch-btn,
	.file-action,
	.offline-action {
		display: inline-flex;
		align-items: center;
		min-height: 25px;
		padding: 4px 10px;
		border: 1px solid #050505;
		background: #050505;
		color: #fff;
		font-family: inherit;
		font-size: 11px;
		font-weight: 700;
		text-transform: uppercase;
		text-decoration: none;
		box-shadow: 3px 3px 0 var(--accent);
	}

	.launch-btn {
		cursor: pointer;
	}

	.launch-btn:hover:not(:disabled),
	.file-action:hover,
	.file-action:focus-visible {
		background: var(--accent);
		color: #fff;
		text-decoration: none;
	}

	.launch-btn:disabled,
	.offline-action {
		border-color: var(--line);
		background: transparent;
		color: #4c4c48;
		box-shadow: none;
		cursor: default;
	}

	.meta-panel {
		grid-column: 2;
		grid-row: span 2;
		border-left: 1px solid var(--line);
		padding-left: 14px;
	}

	dl {
		margin: 10px 0 0;
	}

	dl div {
		display: grid;
		grid-template-columns: 72px minmax(0, 1fr);
		gap: 10px;
		padding: 8px 0;
		border-bottom: 1px dotted var(--line);
	}

	dt {
		color: var(--blue);
		font-weight: 700;
		text-transform: uppercase;
	}

	dd {
		margin: 0;
	}

	.stack-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 7px;
		margin-top: 10px;
	}

	.stack-grid span {
		padding: 3px 7px;
		border: 1px solid var(--line);
		background:
			linear-gradient(90deg, var(--accent) 0 calc((var(--index) + 1) * 6px), transparent 0),
			#fff;
		color: #050505;
		font-weight: 700;
		text-transform: uppercase;
	}

	.tag-panel ul {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin: 10px 0 0;
		padding: 0;
		list-style: none;
	}

	.tag-panel li {
		color: var(--orange);
		font-weight: 700;
		text-transform: uppercase;
	}

	.tag-panel li::before {
		content: '#';
		color: var(--blue);
	}

	a {
		color: var(--blue);
		text-decoration: none;
	}

	a:hover,
	a:focus-visible {
		color: var(--orange);
		text-decoration: underline;
	}

	.nav-footer {
		margin-top: 16px;
		padding-top: 10px;
		border-top: 1px solid var(--line);
	}

	.missing {
		display: grid;
		align-content: center;
		gap: 10px;
		min-height: 360px;
		border: 2px dashed var(--line);
	}

	.missing p,
	.missing span {
		margin: 0;
		color: var(--blue);
		font-weight: 700;
		text-transform: uppercase;
	}

	@media (max-width: 860px) {
		.project-dossier {
			padding: 14px;
		}

		.dossier-grid {
			grid-template-columns: 1fr;
		}

		.meta-panel {
			grid-column: auto;
			grid-row: auto;
			border-left: 0;
			padding-left: 0;
		}

		h1 {
			font-size: 58px;
		}
	}
</style>
