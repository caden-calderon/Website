# Handoff Prompt (feed this after /clear)

Copy everything between the lines below and paste it as your next message.

---

You're picking up the Chromatic website project at `/home/caden/projects/WebsiteV2`.

## Step 1: Reload context

Read in this order:

1. `dev/active/website-os/plan.md` — vision, decisions, phases
2. `dev/active/website-os/architecture.md` — technical map, browser proxy subsystem, file layout
3. `dev/active/website-os/context.md` — current position, what's built, known limitations, open questions
4. `dev/active/website-os/tasks.md` — phase-by-phase checklist

## Step 2: Confirm baseline

Expected baseline after this handoff:

```bash
pnpm check   # expect 0 errors / 0 warnings
pnpm test    # expect 145 pass
pnpm build   # succeeds; Vite may warn about large ML/worker chunks and plugin timings
```

The working tree should be clean except for intentionally untracked local/reference assets if they still exist:

- `.claude/`
- `ChromaticUpdates.md`
- `Mii/`
- `__MACOSX/`
- `win98_icons.zip`
- `windows98-icons/`

Do not commit raw asset dumps or notes unless explicitly asked.

## What just shipped

### Browser / OS cleanup

- IE navigation parsing moved into `src/lib/os/apps/internetExplorerNavigation.ts` with tests in `tests/server/internetExplorerNavigation.test.ts`.
- IE external initial URLs now seed the iframe proxy URL immediately instead of rendering blank until navigation.
- IE chrome was refactored toward an IE4 reference, using `static/os-assets/icons/ie4/`.
- `SearchStartPage.svelte` provides the internal `chromatic.dev/search` start page.
- New app windows now open larger and centered with a small cascade offset. IE defaults to `1120x760`; other main app defaults were increased.
- Window title bars now show app icons.
- Desktop click handling no longer immediately closes Start/context menus when their own controls are clicked.
- `vite.config.ts` disables CSS minification because Vite 8's default Lightning CSS minifier rejects `98.css@0.1.21`'s `@media (not(hover))`.

### Portfolio home page

The homepage inside IE was redesigned to match the user-provided CADEN CALDERON editorial OS-dashboard reference:

- Dense left and right rails, oversized name lockup, featured project strip, project index, stack meters, and notes/game launcher module.
- Left rail modules: Navigation, Quick Links, Currently Building, GitHub Signal, Availability, Visitor Counter, Now Playing.
- Left rail has no scroll. It opens as many panels as can fit in the current app/window height.
- Resize behavior is deterministic top-down: it expands panels from Navigation downward and stops at the first panel that does not fit.
- Clicking a collapsed left panel opens that panel and collapses the nearest expanded panel below it, falling back upward only if needed.
- Visitor counter copy links to the future `/reviews` page and includes a star hover/focus accent.
- Home-page constants live in `src/lib/portfolio/homePageData.ts`.

## Current visual direction

The user likes the current homepage direction and says the behavior is fully working. Continue refining against the same editorial reference, not the older Wii/webcore direction from previous docs. Good next visual work:

- Replace CSS-generated feature art with stronger real/generated perception-road imagery.
- Replace the temporary Mii portrait treatment with a better black-and-white portrait/halftone asset.
- Build the future `/reviews` page for reviews, comments, and bug reports.
- Bring secondary portfolio pages (`ProjectList`, `ProjectDetail`, `AboutPage`) into the new editorial system.

## Working agreements

- Plan before non-trivial implementation.
- Test before declaring work done.
- Do not revert user/unrelated working tree changes.
- Do not commit raw asset dumps unless asked.
- Be direct and technical.

---

Start with Step 1 and Step 2. Then say: "Ready — what's next?"
