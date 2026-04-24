<!--
  Project archive for http://chromatic.dev/projects.
  Dense editorial OS-dashboard view: technical table, readout rail, sharp hover states.
-->
<script lang="ts">
	import { projects } from './projects.js';

	const activeCount = projects.filter((project) => project.status === 'active' || project.status === 'shipping').length;
	const years = projects.map((project) => Number(project.year)).filter(Number.isFinite);
	const yearRange =
		years.length > 0 ? `${Math.min(...years)}-${Math.max(...years)}` : 'No archive range';

	function stackPreview(stack: string[]) {
		return stack.slice(0, 3).join(' / ');
	}

	function statusLabel(status: string | undefined) {
		return status ? status.toUpperCase() : 'CATALOGED';
	}
</script>

<div class="projects-shell">
	<header class="archive-hero">
		<div class="kicker">
			<span>// Project Archive</span>
			<span>Issue 02</span>
		</div>
		<h1>Projects</h1>
		<div class="hero-copy">
			<p>Systems, interfaces, and perception experiments built across software, hardware, and research.</p>
			<dl>
				<div>
					<dt>Total</dt>
					<dd>{String(projects.length).padStart(2, '0')}</dd>
				</div>
				<div>
					<dt>Active</dt>
					<dd>{String(activeCount).padStart(2, '0')}</dd>
				</div>
				<div>
					<dt>Years</dt>
					<dd>{yearRange}</dd>
				</div>
			</dl>
		</div>
	</header>

	{#if projects.length > 0}
		<section class="archive-grid" aria-label="Project directory">
			<div class="table-panel">
				<div class="module-title">
					<span>// Project Directory</span>
					<span>Click row to inspect</span>
				</div>
				<table>
					<thead>
						<tr>
							<th class="col-id">#</th>
							<th class="col-project">Project</th>
							<th>Description</th>
							<th class="col-status">Status</th>
							<th class="col-year">Year</th>
							<th class="col-tech">Tech</th>
						</tr>
					</thead>
					<tbody>
						{#each projects as project, index (project.id)}
							<tr class:featured={index === 0}>
								<td class="col-id">{String(index + 1).padStart(2, '0')}</td>
								<td class="col-project">
									<a href="/projects/{project.id}">
										<span>{project.code ?? project.id.toUpperCase()}</span>
										<b>{project.title}</b>
									</a>
								</td>
								<td>{project.tagline}</td>
								<td class="col-status">
									<i class:live={project.appId}>{statusLabel(project.status)}</i>
								</td>
								<td class="col-year">{project.year}</td>
								<td class="col-tech">{stackPreview(project.stack)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<aside class="side-readout" aria-label="Archive metadata">
				<section>
					<h2>Project Meta</h2>
					<p>
						Selected builds spanning computer vision, interactive systems, embedded prototyping,
						and interface design.
					</p>
				</section>
				<section>
					<h2>Categories</h2>
					<ul>
						<li><span></span>Computer Vision</li>
						<li><span></span>Interactive Systems</li>
						<li><span></span>Linux / Systems</li>
						<li><span></span>Interface Design</li>
					</ul>
				</section>
				<section class="latest">
					<h2>Latest Build</h2>
					<b>{projects[0].title} / {projects[0].code}</b>
					<p>{projects[0].tagline}</p>
					<a href="/projects/{projects[0].id}">View case study -&gt;</a>
				</section>
			</aside>
		</section>
	{:else}
		<section class="empty-state">
			<p>// Archive Offline</p>
			<h2>No projects are indexed yet.</h2>
			<a href="/">Return home -&gt;</a>
		</section>
	{/if}

	<nav class="nav-footer" aria-label="Project navigation">
		<a href="/">&lt;- Back to home</a>
		<a href="/about">About Caden -&gt;</a>
	</nav>
</div>

<style>
	.projects-shell {
		--blue: #1238f2;
		--orange: #e86f22;
		--cyan: #27b6d6;
		--paper: #eeeeec;
		--ink: #080808;
		--line: #85857f;
		--soft-line: #c7c7c1;
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
		line-height: 1.32;
	}

	.archive-hero {
		border-bottom: 1px solid var(--line);
		padding-bottom: 14px;
	}

	.kicker,
	.module-title,
	.nav-footer {
		display: flex;
		justify-content: space-between;
		gap: 16px;
		color: var(--blue);
		font-weight: 700;
		text-transform: uppercase;
	}

	.kicker span:last-child,
	.module-title span:last-child {
		color: var(--orange);
	}

	h1 {
		margin: 4px 0 6px;
		color: #050505;
		font-family: Impact, 'Arial Black', sans-serif;
		font-size: clamp(76px, 12vw, 154px);
		font-weight: 900;
		letter-spacing: 0;
		line-height: 0.82;
		text-transform: uppercase;
	}

	.hero-copy {
		display: grid;
		grid-template-columns: minmax(360px, 1fr) minmax(300px, 0.72fr);
		gap: 24px;
		align-items: end;
	}

	.hero-copy p {
		max-width: 560px;
		margin: 0;
		font-size: 13px;
	}

	dl {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0;
		margin: 0;
		border-top: 1px solid var(--line);
		border-left: 1px solid var(--line);
		background: rgba(255, 255, 255, 0.42);
	}

	dl div {
		padding: 8px 10px;
		border-right: 1px solid var(--line);
		border-bottom: 1px solid var(--line);
	}

	dt {
		color: var(--blue);
		font-weight: 700;
		text-transform: uppercase;
	}

	dd {
		margin: 3px 0 0;
		color: var(--orange);
		font-weight: 700;
	}

	.archive-grid {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 252px;
		gap: 18px;
		padding-top: 14px;
	}

	.table-panel {
		min-width: 0;
		overflow-x: auto;
	}

	.module-title {
		margin-bottom: 5px;
	}

	table {
		width: 100%;
		min-width: 760px;
		border-collapse: collapse;
		background: rgba(238, 238, 236, 0.88);
		font-size: 11px;
	}

	th,
	td {
		padding: 7px 8px;
		border-bottom: 1px dotted var(--line);
		text-align: left;
		vertical-align: top;
	}

	th {
		color: var(--blue);
		font-size: 10px;
		text-transform: uppercase;
	}

	tbody tr {
		position: relative;
		transition: background 90ms linear, color 90ms linear;
	}

	tbody tr:hover,
	tbody tr:focus-within {
		background: #050505;
		color: #fff;
	}

	tbody tr:hover a,
	tbody tr:focus-within a,
	tbody tr:hover .col-id,
	tbody tr:focus-within .col-id {
		color: var(--orange);
	}

	.featured {
		background: rgba(18, 56, 242, 0.08);
	}

	.col-id {
		width: 34px;
		color: var(--orange);
		font-weight: 700;
	}

	.col-project {
		width: 170px;
	}

	.col-project a {
		display: grid;
		gap: 2px;
		color: #000;
		text-decoration: none;
		text-transform: uppercase;
	}

	.col-project span {
		color: var(--blue);
		font-size: 10px;
		font-weight: 700;
	}

	.col-project b {
		font-size: 12px;
	}

	.col-status {
		width: 86px;
	}

	.col-status i {
		display: inline-block;
		min-width: 72px;
		padding: 2px 5px;
		border: 1px solid var(--line);
		background: #fff;
		color: #000;
		font-style: normal;
		font-weight: 700;
		text-align: center;
	}

	.col-status i.live {
		border-color: var(--blue);
		color: var(--blue);
	}

	.col-year {
		width: 52px;
		text-align: center;
	}

	.col-tech {
		width: 170px;
		color: #333;
		text-transform: uppercase;
	}

	tbody tr:hover .col-tech,
	tbody tr:focus-within .col-tech {
		color: var(--cyan);
	}

	.side-readout {
		border-left: 1px solid var(--line);
		padding-left: 16px;
	}

	.side-readout section {
		padding: 0 0 14px;
		margin: 0 0 14px;
		border-bottom: 1px dotted var(--line);
	}

	.side-readout h2,
	.empty-state p {
		margin: 0 0 9px;
		color: var(--blue);
		font-size: 11px;
		text-transform: uppercase;
	}

	.side-readout p {
		margin: 0;
	}

	.side-readout ul {
		display: grid;
		gap: 9px;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.side-readout li {
		display: grid;
		grid-template-columns: 18px 1fr;
		gap: 8px;
		align-items: center;
	}

	.side-readout li span {
		width: 10px;
		height: 10px;
		border: 2px solid #000;
		background: var(--paper);
		box-shadow: 4px 4px 0 var(--blue);
	}

	.latest b {
		display: block;
		color: var(--orange);
		margin-bottom: 7px;
	}

	a {
		color: var(--blue);
		font-weight: 700;
		text-decoration: none;
	}

	a:hover,
	a:focus-visible {
		color: var(--orange);
		text-decoration: underline;
	}

	.empty-state {
		margin: 18px 0 0;
		padding: 28px;
		border: 2px dashed var(--line);
		background: rgba(255, 255, 255, 0.42);
	}

	.empty-state h2 {
		margin: 0 0 8px;
		font-family: Impact, 'Arial Black', sans-serif;
		font-size: 44px;
		line-height: 0.9;
		text-transform: uppercase;
	}

	.nav-footer {
		margin-top: 16px;
		padding-top: 10px;
		border-top: 1px solid var(--line);
	}

	@media (max-width: 860px) {
		.projects-shell {
			padding: 14px;
		}

		.hero-copy,
		.archive-grid {
			grid-template-columns: 1fr;
		}

		.side-readout {
			border-left: 0;
			border-top: 1px solid var(--line);
			padding: 14px 0 0;
		}

		h1 {
			font-size: 72px;
		}
	}
</style>
