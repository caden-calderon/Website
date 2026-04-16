# Handoff Prompt (feed this after /clear)

Copy everything between the lines below and paste it as your next message.

---

I need you to perform a **staff-level review** of the Chromatic website project before we continue feature work. Be thorough, critical, and specific. Think like a senior engineer coming in to audit a project before signing off on it.

## Context

**Chromatic** is my portfolio website. The core concept: a faithful Windows 98 desktop OS runs in the browser as the 2D interface, eventually living on a virtual ThinkPad laptop inside a 3D scene with an AI character. Phase 1 (OS shell — desktop, windows, taskbar, Start menu) is complete. Phase 2 is in progress: Internet Explorer 4 is built with a functional server-side web proxy, portfolio content pages render inside it, and Mii avatars are integrated.

Stack: SvelteKit 2, Svelte 5 (runes), TypeScript, 98.css, Node.js.

## Step 1: Read the Project Docs

Read these in order to understand vision, decisions, and current state:

1. `/home/caden/projects/WebsiteV2/dev/active/website-os/plan.md` — vision, non-goals, architecture decisions, build phases
2. `/home/caden/projects/WebsiteV2/dev/active/website-os/architecture.md` — technical map, component contracts, file layout
3. `/home/caden/projects/WebsiteV2/dev/active/website-os/context.md` — current position, what's built, what's next, open issues
4. `/home/caden/projects/WebsiteV2/dev/active/website-os/tasks.md` — phase-by-phase checklist
5. `/home/caden/CLAUDE.md` — my engineering standards (plan-first, thorough, tested, future-proof)

## Step 2: Review the Code

Work through these files with a staff engineer's lens. Look for: bugs, race conditions, security issues, architectural seams that are bending, code duplication, unused code, performance concerns, type safety gaps, inconsistent patterns, leaky abstractions, and places where we've accumulated complexity that could be simplified.

**OS shell**:
- `src/lib/os/types.ts`
- `src/lib/os/windowManager.svelte.ts`
- `src/lib/os/appRegistry.ts`
- `src/lib/os/icons.ts`
- `src/lib/os/palette.ts`
- `src/lib/os/Desktop.svelte`
- `src/lib/os/Window.svelte`
- `src/lib/os/Taskbar.svelte`
- `src/lib/os/StartMenu.svelte`
- `src/lib/os/ContextMenu.svelte`
- `src/lib/os/DesktopIcon.svelte`

**IE4 Browser & proxy (the most active area)**:
- `src/lib/os/apps/InternetExplorer.svelte` — shell, routing, history, address bar, favorites, iframe management
- `src/routes/api/proxy/+server.ts` — server-side web proxy with HTML rewriting and script injection
- `src/lib/server/cookieJar.ts` — in-memory cookie jar singleton

**Portfolio content**:
- `src/lib/portfolio/types.ts`
- `src/lib/portfolio/projects.ts`
- `src/lib/portfolio/HomePage.svelte`
- `src/lib/portfolio/ProjectList.svelte`
- `src/lib/portfolio/ProjectDetail.svelte`
- `src/lib/portfolio/AboutPage.svelte`
- `src/lib/portfolio/ErrorPage.svelte`

**Routing & config**:
- `src/hooks.server.ts` — COOP/COEP headers
- `vite.config.ts`
- `src/routes/(os)/+layout.svelte`
- `src/routes/(os)/desktop/+page.svelte`

## Step 3: Known Open Issues (keep in mind during review)

These are problems we already know about. Your review should consider whether the architecture makes them hard to solve, whether there are related bugs we haven't noticed, and whether our fixes introduced new smells:

1. **Google CAPTCHA** — `https://www.google.com/search?q=...` through our proxy triggers Google's "unusual traffic detected" CAPTCHA because our server IP gets flagged as a bot. User explicitly wants Google (not DuckDuckGo) and suggested letting the user solve the CAPTCHA in the iframe if we can't avoid it. Investigate whether the CAPTCHA actually works inside the proxied iframe — if not, we need an alternative (custom search results page using an API, different backend, etc.).

2. **GitHub commit info still fails** — Repo pages load and navigation works, but "Cannot retrieve latest commit at this time" banner persists above the file list. `curl` tests on `/tree-commit-info/main` return full JSON data when cookies are sent. But in-browser it still fails. User suspects the cookie jar isn't actually working end-to-end. Needs verification — check whether cookies are being captured, whether they're being sent on subsequent requests, whether the include-fragment request even fires in the browser, and whether the proxy's response is being correctly interpreted by GitHub's client-side JS.

3. **`<base>` tag + URL rewriting** — We recently fixed a subtle bug where the `<base href="...">` tag made relative `/api/proxy` paths resolve against the remote origin (github.com), causing CORS and X-Frame-Options errors. Fix was to use full absolute proxy URLs everywhere. Check whether this fix is complete — are there any paths, attributes, or script-generated URLs that still produce relative values?

4. **COEP policy** — All routes use `Cross-Origin-Embedder-Policy: credentialless`. This was chosen for consistency to avoid Firefox mismatch errors. But it strips cookies from cross-origin sub-resource requests, which may be contributing to GitHub's client-side auth failures. Is there a better policy trade-off?

5. **Cookie jar is shared across all users** — Singleton module-level Map. Fine for a portfolio site, but worth noting. Does the jar actually work under real browser traffic patterns (not just curl)?

## Step 4: Report Your Findings

After reading everything, give me a **structured review** organized as:

- **Architecture health**: what's solid, what's bending, what concerns you
- **Bugs & correctness issues**: specific problems with file/line references (bugs, not style nits)
- **Refactor opportunities**: places where complexity has accumulated, duplicate logic, or abstractions that don't earn their keep
- **Security / robustness**: anything exploitable, unhandled error paths, missing input validation
- **Tests**: what's covered, what isn't, what should be before we ship more features
- **Top 5 things I should fix next**, ranked by impact

Be honest and specific. If something's fine, say so briefly — don't manufacture concerns. If something's genuinely bad, say that too. I'd rather hear "your proxy has a DoS vector on line X" than "consider adding rate limiting someday."

## Step 5: Then We Fix / Refactor

Once you've reported findings, we'll work through them in priority order. Browser correctness first (the Google CAPTCHA, GitHub commits, cookie jar verification), then any refactors that make the next phase of work easier.

## Step 6 (later, after the above is solid): Visual Direction

The portfolio content pages (`src/lib/portfolio/*.svelte`) currently lean corporate early-2000s (gradient section headers, gel buttons, blue/white palette). The target aesthetic is a blend of:
- 90s web (structured layouts, navigation bars, icon grids, blue underlined links)
- Early 2000s web (gradients, gel buttons, rounded cards)
- Webcore (bright optimistic colors, decorative dividers, sparkle/star motifs, expressive typography)
- Nintendo Wii UI (soft rounded shapes, lighter pastels, friendlier feel, channel-like grid cards)
- Tech portfolio (professional, well-organized, clear content hierarchy)

The Mii head shot is integrated (`/os-assets/icons/mii-head.png`). The Mii body shot (`/os-assets/icons/mii-body.png`) exists but isn't used yet — could be a fun creative opportunity. Save this for after the browser is solid.

---

Start with Step 1 (read docs) and Step 2 (review code). Use parallel Read calls for efficiency. Don't modify anything yet — this is a read-only review pass. Report findings when you're done.
