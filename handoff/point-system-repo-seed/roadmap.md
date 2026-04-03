# Roadmap

## Current Position (April 2026)

Phase 1 feasibility is complete. Visual engine is parked as a portfolio showcase piece — visual polish (color richness, LUT grading, bundle optimization) will resume when integrated into the main website. Focus has shifted to Phase 2: Kinect V2 character animation pipeline. Hardware arrives ~April 9. Engine playback system and Python capture scaffold being built in advance.

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

## Phase 2: Kinect V2 Character Animation — IN PROGRESS

### Capture Pipeline (Python, Linux)
- Kinect V2 → libfreenect2 → synchronized RGB (1920x1080) + depth (512x424)
- Registration API aligns color to depth per pixel
- Backproject to XYZRGB point cloud via pinhole camera math
- Background filter by depth threshold
- Export as numbered PLY files via Open3D
- MediaPipe hand landmarks from RGB frames → JSON per frame

### Engine Playback System (TypeScript)
- PLY adapter: parse binary/ASCII PLY → SampleSet
- FrameSequence: pre-allocated buffer-reuse playback controller
- Animation clips: named frame ranges with loop/once/ping-pong modes
- FrameSequenceLoader: async PLY sequence fetcher with concurrency limiting
- Memory budget: ~137MB for 300 frames × 20k points

### Character Assembly
- Point cloud body from Kinect PLY sequences
- Mesh hands driven by MediaPipe landmarks for object interaction
- Animation state machine driven by LLM action tags
- Pre-recorded clip library (idle, gestures, tea, chess)

### Deferred Phase 2 Work
- Evaluate THREE.Points vs instanced splats/surfels
- Temporal coherence (less critical with hardware depth vs ML estimation)
- Train compartment environment (Blender → point sampled)

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

- Live Kinect → real-time point cloud streaming (vs pre-recorded sequences)
- Scan/LiDAR ingest for environment capture
- Export/capture tooling (stills, video)
- XR adapters if strategically valuable
- TTS/voice mode for character
