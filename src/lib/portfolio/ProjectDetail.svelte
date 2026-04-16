<!--
  Individual project page for http://chromatic.dev/projects/:slug
  Gradient section headers, gel demo button, styled tech stack tags.
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
</script>

{#if project}
	<div class="page">
		<!-- ── Header ───────────────────────────────────────────────────── -->
		<div class="page-header">
			<p class="breadcrumb">
				<a href="/">Home</a> &rsaquo;
				<a href="/projects">Projects</a> &rsaquo;
				<span>{project.title}</span>
			</p>
			<h1>{project.title}</h1>
			<p class="tagline">{project.tagline}</p>
		</div>

		<div class="content">
			<!-- ── About section ────────────────────────────────────────── -->
			<div class="section">
				<div class="section-header">About this project</div>
				<div class="section-body">
					<p class="description">{project.description}</p>

					{#if project.appId && launchApp}
						<button class="demo-btn" onclick={() => launchApp?.(project.appId!)}>
							&#9654; Launch Demo
						</button>
					{/if}
				</div>
			</div>

			<!-- ── Tech stack ───────────────────────────────────────────── -->
			<div class="section">
				<div class="section-header section-header-green">Tech Stack</div>
				<div class="section-body">
					<div class="stack-list">
						{#each project.stack as tech}
							<span class="stack-tag">{tech}</span>
						{/each}
					</div>
				</div>
			</div>

			<!-- ── Details ──────────────────────────────────────────────── -->
			<div class="section">
				<div class="section-header section-header-teal">Details</div>
				<div class="section-body">
					<table>
						<tbody>
							<tr>
								<td class="label">Type</td>
								<td>
									{#if project.type === 'interactive'}
										<span class="badge badge-demo">&#9654; Interactive</span> — live demo available
									{:else}
										<span class="badge badge-writeup">&#9998; Walkthrough</span> — documented deep-dive
									{/if}
								</td>
							</tr>
							<tr>
								<td class="label">Year</td>
								<td>{project.year}</td>
							</tr>
							<tr>
								<td class="label">Tags</td>
								<td>{project.tags.join(', ')}</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</div>

		<div class="nav-footer">
			<a href="/projects">&larr; All Projects</a>
		</div>
	</div>
{/if}

<style>
	.page {
		font-family: 'Pixelated MS Sans Serif', Arial, sans-serif;
		font-size: 11px;
		line-height: 1.5;
		color: #000;
		background: #eef2f7;
	}

	/* ── Page header ───────────────────────────────────────────────────── */

	.page-header {
		padding: 10px 16px;
		background: #fff;
		border-bottom: 1px solid #c0cdd8;
	}

	.breadcrumb {
		margin: 0 0 4px;
		font-size: 10px;
		color: #808080;
	}

	.breadcrumb a {
		color: #0044cc;
		text-decoration: none;
	}

	.breadcrumb a:hover {
		text-decoration: underline;
	}

	h1 {
		font-size: 18px;
		color: #1a3a66;
		margin: 0 0 2px;
	}

	.tagline {
		color: #505050;
		margin: 0;
		font-style: italic;
	}

	/* ── Content area ──────────────────────────────────────────────────── */

	.content {
		padding: 10px 12px;
	}

	/* ── Sections ──────────────────────────────────────────────────────── */

	.section {
		margin-bottom: 10px;
		border: 1px solid #a0b4cc;
		border-radius: 4px;
		overflow: hidden;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
	}

	.section-header {
		background: linear-gradient(180deg, #4a7db8 0%, #335d8e 100%);
		color: #fff;
		padding: 4px 10px;
		font-weight: bold;
		font-size: 11px;
	}

	.section-header-green {
		background: linear-gradient(180deg, #5eaa5e 0%, #3d7040 100%);
	}

	.section-header-teal {
		background: linear-gradient(180deg, #4a9999 0%, #357070 100%);
	}

	.section-body {
		background: #fff;
		padding: 10px 12px;
	}

	.description {
		margin: 0 0 10px;
	}

	/* ── Demo button (gel style) ───────────────────────────────────────── */

	.demo-btn {
		background: linear-gradient(180deg, #5cb85c 0%, #388038 100%);
		color: #fff;
		border: 1px solid #2d6e2d;
		border-radius: 3px;
		padding: 4px 16px;
		font-family: inherit;
		font-size: 11px;
		font-weight: bold;
		cursor: pointer;
		min-width: unset;
		min-height: unset;
		text-shadow: 0 1px 1px rgba(0, 0, 0, 0.3);
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
	}

	.demo-btn:hover {
		background: linear-gradient(180deg, #6cc86c 0%, #449044 100%);
	}

	.demo-btn:active {
		background: linear-gradient(180deg, #388038 0%, #5cb85c 100%);
		box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.2);
	}

	/* ── Tech stack tags ───────────────────────────────────────────────── */

	.stack-list {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
	}

	.stack-tag {
		display: inline-block;
		padding: 2px 8px;
		background: linear-gradient(180deg, #e8eef4 0%, #d0d8e4 100%);
		border: 1px solid #a8b8cc;
		border-radius: 3px;
		font-size: 10px;
		color: #1a3a66;
		font-weight: bold;
	}

	/* ── Details table ─────────────────────────────────────────────────── */

	table {
		border-collapse: collapse;
		font-size: 11px;
		background: transparent;
	}

	td {
		padding: 3px 8px 3px 0;
		vertical-align: middle;
	}

	.label {
		font-weight: bold;
		color: #404040;
		width: 50px;
	}

	/* ── Badges ────────────────────────────────────────────────────────── */

	.badge {
		display: inline-block;
		padding: 1px 6px;
		font-size: 10px;
		font-weight: bold;
		border-radius: 2px;
	}

	.badge-demo {
		background: linear-gradient(180deg, #5cb85c 0%, #3a8a3a 100%);
		color: #fff;
		border: 1px solid #2d6e2d;
	}

	.badge-writeup {
		background: linear-gradient(180deg, #7799bb 0%, #557799 100%);
		color: #fff;
		border: 1px solid #446688;
	}

	/* ── Links / nav ───────────────────────────────────────────────────── */

	a {
		color: #0044cc;
		text-decoration: none;
	}

	a:hover {
		text-decoration: underline;
		color: #cc0000;
	}

	.nav-footer {
		padding: 4px 16px 12px;
	}
</style>
