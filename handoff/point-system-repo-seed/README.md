# Chromatic

Chromatic is a portfolio and interactive experience built around a point-sampled visual runtime.

The product has two layers:

- an experiential layer: a 3D train compartment with interactive objects, an AI character, and atmospheric storytelling
- a functional layer: a readable, recruiter-friendly website carrying the same content

Both share a dense point/surfel visual language — colored stipple on dark grounds, stable motion, restrained glow.

## Current State

Phase 1 feasibility is largely proven. The engine renders 2D images and 3D meshes as dense stipple point clouds with extensive live-tunable controls. ML preprocessing provides browser-side background removal and monocular depth estimation for true 3D displacement from 2D images.

```bash
pnpm install
pnpm dev        # http://localhost:5173
pnpm test       # 48 tests
pnpm check      # 0 errors
```

## Read Order

1. `vision.md` — product vision, art direction
2. `architecture.md` — system design, engine structure, full stack table
3. `roadmap.md` — phased delivery plan
4. `active/context.md` — current implementation state (START HERE for code context)
5. `active/tasks.md` — completed and upcoming work

## Product Principles

- The runtime is the platform.
- The site consumes the runtime; it does not define it.
- The content system matters alongside the runtime.
- The AI character is central to the experience.
- Accessibility-critical UI stays DOM-native.
- Public launch requires both layers.
- Quality, modularity, and performance from day one.

## Art Direction Reference

[Andreion de Castro — Amazon Conflux](https://andreion.com/amazon-conflux). Dense colored pointillism. Points carry color, density carries form, dark backgrounds make everything luminous. Painterly, not sparse.
