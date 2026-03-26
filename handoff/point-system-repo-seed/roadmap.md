# Roadmap

## Current Position

Phase 1 feasibility is largely proven. Both tracks (3D mesh + 2D image) produce compelling results. ML preprocessing (background removal, depth estimation) is integrated. Visual quality is approaching the Andreion reference. The next job is to finish Phase 1 polish, source proper assets, and begin Phase 2.

## Phase 1: Feasibility Proofs — LARGELY COMPLETE

### What's Done

- SvelteKit + Threlte 8 scaffold
- Engine core: SampleSet, MeshAdapter, ImageAdapter, GLPointRenderer
- Two sampling algorithms (rejection + importance) with density gamma
- 15+ live-tunable shader controls (color noise, dark cutoff, exposure, saturation, hue shift, warmth, edge sharpness, etc.)
- ML background removal (@imgly/background-removal)
- ML depth estimation (Depth Anything V2, 6 model options)
- Surface normal displacement for volumetric form
- Outlier suppression, luminance radius scaling
- Bloom post-processing
- 60 tests, 0 type errors

### Remaining Phase 1 Work

- harden the optional Python BG removal service for actual deployment
- continue color quality iteration
- further split the deferred runtime/ML bundle if first-interaction cost is still too high

### Exit Criteria

- compelling stills and motion from both tracks
- ML depth creates convincing 3D form from 2D images
- visual quality approaches the Andreion reference
- architecture supports both source types cleanly
- enough promise to justify Phase 2

## Phase 2: Engine Hardening + Animation Foundation

- animated/skinned glTF asset path
- stable point motion bound to deforming surfaces (barycentric binding)
- MediaPipe or Blender body-matching pipeline for Caden's recorded performances
- pre-recorded animation clip library (idle, sipping tea, chess moves, gestures)
- character rendered through the point engine
- evaluate whether `THREE.Points` is still sufficient or whether instanced splats/surfels are required

## Phase 3: Website + Content Integration

- build the functional site around the content graph
- point-based hero sections, transitions, and showcases
- DOM-native text, navigation, forms for accessibility
- train props, routes, showcase modules bind to typed content manifests

## Phase 4: AI Character Integration

- provider abstraction for LLM backend
- conversation system with mood/action tags driving animation state machine
- portfolio-aware prompt assembly from the content graph
- session controls, rate limiting, UX polish

## Phase 5: Ship Readiness

- train compartment scene (Caden models in Blender)
- interactive objects (business card, laptop, chess board, props)
- laptop portal → website layer transition
- polish, accessibility review, performance validation
- mobile website-first fallback

## Later Research

- recorded video → temporal sample advection with persistence
- live webcam → real-time variant
- scan/LiDAR ingest
- export/capture tooling (stills, video)
- XR adapters if strategically valuable
- TTS/voice mode for character
