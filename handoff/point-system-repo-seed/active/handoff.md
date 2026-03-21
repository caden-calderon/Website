# Point-System Handoff

## Status

The feasibility scaffold exists and has now had a staff-level review/refactor pass. The biggest correctness issue found in implementation was mesh ingest sampling in local geometry space; that is fixed, tested, and the handoff now reflects the reviewed state instead of the initial implementation summary.

## Read Order

1. `README.md` — project overview, what to build first
2. `vision.md` — product vision, art direction, experience structure, AI character
3. `architecture.md` — system design, engine structure, stack, and project layout
4. `roadmap.md` — phased delivery plan
5. `active/*` — current plan, context, and tasks

## Legacy Reference

`legacy/CHROMATIC_V2_HANDOFF.md` — the original V2 handoff document from the ASCII/text-art era. Contains detailed thinking on the train compartment concept, content mirroring, character animation pipeline (MediaPipe → mannequin), mobile strategy, project showcase system, and LLM conversation architecture. Much of the product thinking survives; the rendering approach has been replaced by points/surfels.

`legacy/vision.md` — transitional vision doc from when the project pivoted from ASCII to points. Superseded by the current `vision.md`.

## Key Context for Reviewers

- The art direction is inspired by [Andreion's Amazon Conflux](https://andreion.com/amazon-conflux) — dense colored pointillism, not sparse point clouds
- Andreion's work is pre-rendered (Processing/p5.js → video). Chromatic targets real-time interactive rendering, which is more ambitious.
- The engine (in `src/lib/engine/`) must be framework-agnostic — pure TypeScript + Three.js, zero Svelte imports
- The canonical runtime is point-sampled with optional surfel-like attributes; `THREE.Points` is the first renderer implementation, not the permanent architectural constraint
- The product needs a typed content graph/manifests so train props, website routes, showcase modules, and AI knowledge stay aligned
- The AI character is launch-critical, but provider/model choice should remain abstracted until character integration work begins
- Public launch requires both the experiential layer and the functional website
- Mobile should support the website well; the 3D layer may initially fall back to a desktop-only experience
- Quality bar is high from day one: strict TypeScript, typed arrays, clean interfaces, proper GPU resource disposal
- Current review status: `pnpm test`, `pnpm check`, and `pnpm build` pass after fixes; build still warns that the root route chunk is very large, which is the main remaining repo-health concern from this pass

## Immediate Path

1. Review all docs (this handoff)
2. Judge the current look and motion quality before broadening scope
3. Reduce the root-route bundle cost so the eventual site shell is not hard-coupled to the full 3D stack
4. Add direct `ImageAdapter` and renderer coverage
5. Decide whether `THREE.Points` is visually sufficient or whether splat-oriented work should move forward sooner
