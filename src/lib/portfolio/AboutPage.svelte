<!--
  About page for http://chromatic.dev/about
  Editorial OS-dashboard dossier matching the portfolio homepage visual language.
-->
<script lang="ts">
	import {
		bioSignals,
		currentWork,
		educationRows,
		focusRows,
		operatingTraits,
		stackMatrix,
	} from './profileData.js';
</script>

<div class="dossier-page about-page">
	<header class="dossier-hero">
		<div class="hero-meta">
			<span>// Personnel File</span>
			<span>Issue 03<br /><b>About</b></span>
		</div>
		<div class="hero-grid">
			<div>
				<p class="kicker">Software engineer / creative technologist</p>
				<h1><span>About</span><span>Caden</span></h1>
			</div>
			<div class="portrait-block" aria-label="Caden portrait module">
				<img src="/os-assets/icons/mii-head.png" alt="Caden's Mii" draggable="false" />
				<div class="portrait-grid" aria-hidden="true"><span></span></div>
			</div>
		</div>
		<p class="lede">
			I build computer vision systems, interactive software, and odd little tools that make
			hardware feel immediate. My favorite work sits between research prototype and real product:
			sensor data, model behavior, rendering constraints, and an interface that makes the whole
			machine easier to understand.
		</p>
	</header>

	<main class="dossier-body">
		<section class="main-column">
			<div class="section-block bio-block">
				<h2>// Operating Profile</h2>
				<p>
					Most of my projects start with a physical or spatial problem: a camera stream, a 3D
					scene, a game board, a gesture, a live model, a tool that needs to answer quickly. I
					like building the connective tissue around that problem until the system feels calm,
					inspectable, and responsive.
				</p>
				<ul class="signal-list">
					{#each bioSignals as signal}
						<li>{signal}</li>
					{/each}
				</ul>
			</div>

			<div class="section-block">
				<h2>// Focus Areas</h2>
				<ol class="row-list focus-list">
					{#each focusRows as row}
						<li><span>{row.label}</span><p>{row.value}</p></li>
					{/each}
				</ol>
			</div>

			<div class="section-block matrix-block">
				<h2>// Skill / Stack Matrix</h2>
				<div class="matrix">
					{#each stackMatrix as skill}
						<div class="matrix-row">
							<b>{skill.label}</b>
							<i style="--value: {skill.value}"></i>
							<p>{skill.detail}</p>
						</div>
					{/each}
				</div>
			</div>
		</section>

		<aside class="side-column">
			<section class="side-section current-section">
				<h2>// Current Work</h2>
				<ol class="row-list compact">
					{#each currentWork as row}
						<li><span>{row.label}</span><p>{row.value}</p></li>
					{/each}
				</ol>
			</section>

			<section class="side-section">
				<h2>// Education</h2>
				<dl class="fact-list">
					{#each educationRows as row}
						<div>
							<dt>{row.label}</dt>
							<dd>{row.value}</dd>
						</div>
					{/each}
				</dl>
			</section>

			<section class="side-section">
				<h2>// Personality Without Fluff</h2>
				<ul class="trait-list">
					{#each operatingTraits as trait}
						<li>{trait}</li>
					{/each}
				</ul>
			</section>

			<section class="side-section link-section">
				<h2>// Next</h2>
				<a href="/projects">View project archive -&gt;</a>
				<a href="/contact">Open contact channel -&gt;</a>
			</section>
		</aside>
	</main>
</div>

<style>
	.dossier-page {
		--blue: #1238f2;
		--cyan: #27b6d6;
		--orange: #e86f22;
		--paper: #eeeeec;
		--ink: #111111;
		--line: #8e8e8a;
		--soft-line: #c7c7c1;
		min-width: 980px;
		min-height: 100%;
		padding: 18px 22px 20px;
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

	.dossier-hero {
		padding-bottom: 16px;
		border-bottom: 1px solid var(--line);
	}

	.hero-meta {
		display: flex;
		justify-content: space-between;
		gap: 16px;
		color: var(--blue);
		text-transform: uppercase;
		font-size: 13px;
		font-weight: 700;
	}

	.hero-meta b,
	.kicker,
	.row-list span {
		color: var(--orange);
	}

	.hero-grid {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 210px;
		gap: 22px;
		align-items: end;
	}

	.kicker {
		margin: 20px 0 8px;
		text-transform: uppercase;
		font-weight: 700;
	}

	h1 {
		margin: 0;
		overflow: hidden;
		font-family: Impact, Haettenschweiler, 'Arial Narrow Bold', 'Arial Black', sans-serif;
		font-size: 128px;
		font-weight: 900;
		line-height: 0.8;
		letter-spacing: 0;
		text-transform: uppercase;
	}

	h1 span {
		display: block;
		width: 142%;
		transform: scaleX(0.7);
		transform-origin: left center;
	}

	h1 span:first-child {
		color: #090909;
	}

	h1 span:last-child {
		color: var(--blue);
	}

	.portrait-block {
		position: relative;
		min-height: 166px;
		border-left: 1px dotted var(--line);
		padding-left: 18px;
	}

	.portrait-block img {
		position: relative;
		z-index: 1;
		width: 146px;
		height: 146px;
		object-fit: cover;
		border: 1px solid #111;
		background: #d7d7d2;
		filter: grayscale(1) contrast(1.25);
		image-rendering: pixelated;
	}

	.portrait-grid {
		position: absolute;
		right: 0;
		bottom: 4px;
		width: 104px;
		height: 104px;
		background:
			linear-gradient(rgba(18, 56, 242, 0.17) 1px, transparent 1px),
			linear-gradient(90deg, rgba(18, 56, 242, 0.17) 1px, transparent 1px);
		background-size: 8px 8px;
	}

	.portrait-grid span {
		position: absolute;
		right: 17px;
		bottom: 23px;
		width: 17px;
		height: 17px;
		background: var(--blue);
	}

	.lede {
		max-width: 760px;
		margin: 14px 0 0;
		font-size: 14px;
		line-height: 1.22;
		font-weight: 700;
		text-transform: uppercase;
	}

	.dossier-body {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 294px;
		gap: 22px;
		padding-top: 16px;
	}

	.section-block,
	.side-section {
		border-bottom: 1px solid var(--line);
		padding: 0 0 15px;
		margin-bottom: 15px;
	}

	.section-block h2,
	.side-section h2 {
		margin: 0 0 10px;
		color: var(--blue);
		font-size: 11px;
		text-transform: uppercase;
	}

	.bio-block p {
		max-width: 680px;
		margin: 0 0 12px;
	}

	.signal-list,
	.trait-list {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.signal-list {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 10px;
	}

	.signal-list li,
	.trait-list li {
		border: 1px solid #999;
		background: #e2e2dd;
		padding: 7px 8px;
		font-weight: 700;
	}

	.row-list {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.row-list li {
		display: grid;
		grid-template-columns: 54px minmax(0, 1fr);
		gap: 10px;
		padding: 7px 0;
		border-bottom: 1px dotted var(--soft-line);
	}

	.row-list p {
		margin: 0;
	}

	.matrix {
		display: grid;
		gap: 7px;
	}

	.matrix-row {
		display: grid;
		grid-template-columns: 148px minmax(160px, 0.75fr) minmax(220px, 1fr);
		align-items: center;
		gap: 12px;
	}

	.matrix-row b {
		text-transform: uppercase;
	}

	.matrix-row i {
		--value: 8;
		position: relative;
		display: block;
		height: 10px;
		background: repeating-linear-gradient(90deg, #d2d2cd 0 7px, transparent 7px 10px);
		border: 1px solid #d7d7d2;
	}

	.matrix-row i::before {
		content: '';
		position: absolute;
		inset: 0 auto 0 0;
		width: calc(var(--value) * 8.333%);
		background: repeating-linear-gradient(90deg, var(--blue) 0 7px, transparent 7px 10px);
	}

	.matrix-row p {
		margin: 0;
		color: #4c4c48;
	}

	.side-column {
		border-left: 1px dotted var(--line);
		padding-left: 18px;
	}

	.compact li {
		grid-template-columns: 58px minmax(0, 1fr);
	}

	.fact-list,
	.fact-list div,
	.fact-list dt,
	.fact-list dd {
		margin: 0;
	}

	.fact-list div {
		display: grid;
		grid-template-columns: 58px minmax(0, 1fr);
		gap: 9px;
		padding: 7px 0;
		border-bottom: 1px dotted var(--soft-line);
	}

	.fact-list dt {
		color: var(--orange);
		text-transform: uppercase;
		font-weight: 700;
	}

	.trait-list {
		display: grid;
		gap: 7px;
	}

	a {
		color: var(--blue);
		text-decoration: none;
		text-transform: uppercase;
		font-weight: 700;
	}

	a:hover,
	a:focus-visible {
		color: var(--orange);
		text-decoration: underline;
		outline: 1px dotted currentColor;
		outline-offset: 2px;
	}

	.link-section {
		display: grid;
		gap: 8px;
		border-bottom: 0;
	}
</style>
