# Handoff Prompt (feed this after /clear)

Copy everything between the lines below and paste it as your next message.

---

Read these files in order to pick up where we left off:

1. `/home/caden/projects/WebsiteV2/dev/active/website-os/plan.md`
2. `/home/caden/projects/WebsiteV2/dev/active/website-os/architecture.md`
3. `/home/caden/projects/WebsiteV2/dev/active/website-os/context.md`
4. `/home/caden/projects/WebsiteV2/dev/active/website-os/tasks.md`
5. `/home/caden/projects/WebsiteV2/src/lib/os/apps/InternetExplorer.svelte`
6. `/home/caden/projects/WebsiteV2/src/routes/api/proxy/+server.ts`
7. `/home/caden/projects/WebsiteV2/src/lib/server/cookieJar.ts`

Then explore `src/lib/portfolio/` to see the current visual design of the homepage, project pages, and about page. Run `pnpm dev` and check `/desktop` in the browser.

**Summary**: We're building a Windows 98 desktop OS as the 2D interface for Chromatic (Caden's portfolio). Phase 1 (OS shell) is complete. Phase 2 is in progress — Internet Explorer 4 is built with a working server-side web proxy at `/api/proxy` that fetches external sites, strips security headers, and injects navigation interceptors. Most sites load (Wikipedia, Hacker News, GitHub home pages, archive.org). Back button tracks in-iframe navigation. Cookie jar is implemented for session continuity.

**Two open issues with the browser**:

1. **Google CAPTCHA** — Searching "apple" triggers Google's "unusual traffic detected" page because our server-side proxy makes requests from a server IP that Google flags as bot traffic. User wants Google (not DuckDuckGo) and suggested just **letting the user solve the CAPTCHA in the iframe** if we can't avoid it. Investigate: does the CAPTCHA actually work inside our proxied iframe? If not, we need an alternative approach (rendering search results via a different API, using a custom "Chromatic Search" page, or server-side CAPTCHA passthrough). Test the simple path first — the CAPTCHA iframe might just work with our proxy.

2. **GitHub commit info** — Repo pages load, navigation works, but the "Cannot retrieve latest commit" banner still appears above the file list. Curl tests show the `/tree-commit-info/main` endpoint returns full JSON data with cookies. But in-browser it still fails. User suspects the cookie jar isn't actually working. Debug: open devtools Network tab in the IE iframe, check if the include-fragment request for commit info fires, check if our cookie jar is sending cookies (add temporary logging to `src/lib/server/cookieJar.ts`), check what the actual response looks like.

**Then (visual direction)**:

The user wants the portfolio pages (`src/lib/portfolio/HomePage.svelte`, `ProjectList.svelte`, `ProjectDetail.svelte`, `AboutPage.svelte`) to capture a blend of aesthetics they're describing as:
- 90s web
- Early 2000s web
- Webcore
- Nintendo Wii UI
- Tech portfolio

Current styling leans early-2000s corporate (gradient section headers, gel buttons, blue/white palette). Needs more **Wii-influence** (softer rounded shapes, lighter pastels, friendlier feel, channel-like cards) and more **webcore personality** (decorative dividers, sparkle/star motifs, bright optimistic colors, more expressive typography). Reference materials: the user has a Mii avatar already integrated (`/os-assets/icons/mii-head.png`) and the user's Mii body shot at `/os-assets/icons/mii-body.png` is also available but not yet used creatively.

Code standards: FAANG-grade without overengineering. Clean Svelte 5 with runes. Match the existing patterns in the codebase. OS components in `src/lib/os/`, portfolio content in `src/lib/portfolio/`, server endpoints in `src/routes/api/`.

Start by reading the context docs, then ask me which issue to tackle first (CAPTCHA, GitHub debug, or visual direction).
