# Roadmap

## Current Position

Direction-locking is largely complete, but feasibility is not yet proven. The next job is not broad implementation; it is targeted feasibility work that validates the visual runtime, renderer strategy, and content architecture before the repo hardens around them.

## Phase 1: Feasibility Proofs

Two parallel tracks sharing the same renderer abstraction:

### Track A — 3D Mesh

- one static Blender/glTF test asset (simple geometry)
- runtime point sampling from mesh surfaces via `MeshSurfaceSampler`
- `THREE.Points` with custom `ShaderMaterial` as the first renderer implementation
- black background, per-point color
- density, size, opacity, and bloom controls

### Track B — 2D Image

- one source image (classical painting or photograph)
- fast interactive image sampling path first
- weighted Voronoi stippling as the quality benchmark path
- same renderer abstraction, same controls
- validates the look on flat media alongside 3D

### Shared

- canonical `SampleSet` schema with room for stable IDs and future surface binding
- renderer adapter boundary (`THREE.Points` first, splats later)
- typed content graph/manifests
- full customization controls (algorithm, density, size, color, bloom)
- minimal SvelteKit + Threlte scaffold
- clean engine architecture with typed interfaces

Exit criteria:

- compelling stills and motion from both tracks
- the engine architecture supports both source types cleanly
- the architecture leaves room for content mapping and character integration without a rewrite
- customization knobs produce meaningfully different looks
- enough visual promise to justify Phase 2

## Phase 2: Engine Hardening + Animation Foundation

- animated/skinned glTF asset path
- stable point motion bound to deforming surfaces (barycentric binding)
- MediaPipe or Blender body-matching pipeline for Caden's recorded performances
- pre-recorded animation clip library (idle, sipping tea, chess moves, gestures)
- character rendered through the point engine
- evaluate whether `THREE.Points` is still sufficient or whether instanced splats/surfels are required

Exit criteria:

- no obvious swimming on animated surfaces
- silhouettes survive animation
- character reads as a person through the point style
- motion feels intentional

## Phase 3: Website + Content Integration

- build the functional site around the same content graph
- point-based hero sections, transitions, and showcases where they help
- DOM-native text, navigation, and forms for accessibility
- train props, website routes, and showcase modules all bind to the same typed content manifests

Exit criteria:

- experiential layer and functional layer feel like one product
- content mirroring works through shared data, not duplicated hard-coded structures
- recruiter-friendly website remains clear and fast

## Phase 4: AI Character Integration

- provider abstraction for LLM backend
- conversation system with mood/action tags driving animation state machine
- portfolio-aware prompt assembly from the content graph
- session controls, rate limiting, and UX polish

Exit criteria:

- the character feels essential rather than bolted on
- action tags and animation state integrate cleanly
- the full desktop experience is coherent enough to ship

## Phase 5: Ship Readiness

- train compartment scene (Caden models in Blender)
- interactive objects (business card, laptop, chess board, props)
- laptop portal → website layer transition
- polish, accessibility review, and performance validation
- mobile website-first fallback with explicit desktop messaging for the full experience if needed

## Later Research

- recorded video → temporal sample advection with persistence
- live webcam → real-time variant
- scan/LiDAR ingest
- export/capture tooling (stills, video)
- XR adapters if strategically valuable
- TTS/voice mode for character
- deeper mobile optimization (gyroscope parallax, orientation transitions, eventual 3D support)

## Immediate Next Work

1. Finalize the canonical `SampleSet` and renderer adapter interfaces.
2. Define the typed content graph/manifests that connect site, train props, and AI knowledge.
3. Scaffold the minimal SvelteKit + Threlte project.
4. Implement `MeshAdapter` (Track A) and the fast interactive image path (Track B).
5. Add weighted Voronoi stippling as the quality benchmark path.
6. Add bloom post-processing and a controls UI.
7. Evaluate the look before broadening scope.
