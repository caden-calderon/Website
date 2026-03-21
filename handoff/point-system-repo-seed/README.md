# Chromatic

Chromatic is a portfolio and interactive experience built around a point-sampled visual runtime.

The product has two layers:

- an experiential layer: a 3D train compartment with interactive objects, an AI character, and atmospheric storytelling
- a functional layer: a readable, recruiter-friendly website carrying the same content

Both share a dense point/surfel visual language — colored stipple on dark grounds, stable motion, restrained glow. The website and experience are one seamless thing, not two separate products.

## What This Repo Should Produce First

A feasibility proof across two tracks:

### Track A — 3D Mesh

- one Blender/glTF test asset
- runtime point sampling from mesh surfaces
- `THREE.Points` renderer with custom shaders as the first renderer implementation
- black background, per-point color, tunable size/density
- restrained bloom

### Track B — 2D Image

- one source image
- fast interactive image sampling path
- weighted Voronoi stippling as a quality benchmark path
- same renderer abstraction, same controls
- validates the look on flat media

Both tracks share the same renderer abstraction, with `THREE.Points` as the first implementation. If neither is compelling in motion, the broader product should wait.

## Read Order

1. `vision.md` — product vision, art direction, what changed
2. `architecture.md` — system design, engine structure, stack decisions
3. `roadmap.md` — phased delivery plan
4. `active/` — current plan, context, and task tracking

## Product Principles

- The runtime is the platform.
- The site consumes the runtime; it does not define it.
- The content system matters alongside the runtime; train objects, website sections, and AI knowledge must map to the same source of truth.
- The train world matters as product framing, the AI character is central to the experience.
- Accessibility-critical UI stays DOM-native.
- Public launch requires both the experiential layer and the functional website; Phase 1 is feasibility work, not ship preparation.
- Quality, modularity, and performance from day one — no tech debt shortcuts.

## Art Direction Reference

Primary visual inspiration: [Andreion de Castro — Amazon Conflux](https://andreion.com/amazon-conflux). Dense colored pointillism applied to classical artwork. Points carry color, density carries form, dark backgrounds make everything luminous.

The target is painterly pointillism, not sparse data-viz point clouds.
