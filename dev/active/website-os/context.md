# Website OS Context

## Date

2026-04-15

## Purpose

Build a Windows 95 desktop OS as the 2D interface for the Chromatic portfolio website. The OS lives on a virtual ThinkPad laptop that sits on a table in the 3D scene alongside an AI character.

## Current Position

- Planning phase: plan, architecture, and tasks documents are written
- No code has been written yet for the OS
- The existing codebase has a mature point engine, Kinect pipeline, and demo at `/`
- Codex is handling the 3D/Kinect side concurrently
- The AI character agent is being built in a separate repo

## Key Decisions Made

- 98.css for Win95 visual styling (CSS-only, proven, no wrappers needed)
- Custom Svelte 5 window manager with runes (existing libs too immature)
- IE4-style browser for portfolio navigation
- Plus!-style desktop themes for scene switching
- Shared state stores for 3D/2D content parity
- Win95 authenticity first, point-cloud effects layered later
- Quality: FAANG-grade code without overengineering

## Read These First

- `dev/active/website-os/plan.md`
- `dev/active/website-os/architecture.md`
- `dev/active/website-os/tasks.md`

## What Does NOT Exist Yet

- No `src/lib/os/` directory
- No `/desktop` route
- No 98.css installation
- No game logic or state stores
- No portfolio content data
- No OS-related static assets (icons, sounds, wallpapers)

## What DOES Exist (Do Not Touch)

- `src/lib/engine/` — point cloud rendering engine, fully tested
- `src/lib/demo/` — point engine demo (will later become an OS app)
- `src/lib/scene/` — 3D scene components
- `src/lib/capture/` — Kinect capture control
- `src/lib/content/types.ts` — existing content type definitions (may need updates)
- `python/` — Kinect pipeline code
- `src/routes/+page.svelte` — current homepage (point engine demo)
- `src/routes/capture-control/` — Kinect operator route

## Architecture Review (2026-04-15)

Major additions from the review pass:
- **Virtual filesystem** with OverlayFS pattern (base tree in code + IndexedDB writes)
- **Session persistence** to IndexedDB (boot state, window state, icon positions, theme)
- **Boot/sleep lifecycle** (first visit = boot sequence, return visits = wake from sleep)
- **CSS scoping** via SvelteKit layout groups (`(main)/` for Tailwind, `(os)/` for 98.css)
- **Mobile**: native pixels, no scaling, pointer events for unified mouse/touch
- **Touch actions**: `use:longpress` and `use:doubleclick` as reusable Svelte actions
- **Lazy app loading**: app components use `() => import(...)` instead of eager imports
- **Filesystem-driven UI**: desktop icons and Start menu sourced from FS, not hardcoded

Key reference: daedalOS (dustinbrett.com) architecture was studied in depth for mobile, filesystem, and session patterns.

## Immediate Next Step

Continue brainstorming and refining with Caden. Resolve remaining open questions. Then begin Phase 0 (project setup: CSS scoping, 98.css install, directory structure) followed by Phase 1 (OS shell).
