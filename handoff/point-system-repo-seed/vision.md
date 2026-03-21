# Chromatic Vision

## Product Summary

Chromatic is a portfolio and creative experience built around a point-sampled visual engine.

It has two layers:

- an experiential layer: a stylized train compartment with an AI character, interactive objects, and cinematic atmosphere
- a functional layer: a clear, accessible portfolio website

Both layers share the same dense point/surfel visual language. The website and the 3D experience are one product — seamlessly integrated, same look and feel, same content in two formats.

Public launch requires both layers. The website-only layer can act as an accessibility and mobile fallback, but it is not the intended standalone product.

## Art Direction

### The Look

The visual target is dense, painterly pointillism — inspired by [Andreion de Castro's Amazon Conflux](https://andreion.com/amazon-conflux).

Key properties:

- persistent colored points on dark/black backgrounds
- density carries form — denser in bright/detailed areas, sparser in dark
- subtle variation in size, opacity, and density
- restrained bloom/glow for luminosity
- legible silhouettes before dense realism
- stable point identity over time — no frame-to-frame swimming
- motion that feels coherent, not re-randomized
- enough surface awareness to preserve drapery, sculpture, and silhouette readability

This is NOT:

- sparse point cloud data visualization
- glitchy particle effects
- ASCII or text-based rendering (that was a prior iteration)

### Evolution

The art direction evolved through several iterations:

1. ASCII/text-art post-processing (abandoned)
2. Dithering-based rendering (explored, abandoned)
3. **Point/surfel-based stipple rendering (current, final)**

The Andreion reference locked the direction. Dense colored stipple on dark grounds — beautiful, works across 2D and 3D sources, and eliminates the drawing-skill bottleneck from earlier iterations.

## Experience Structure

### Experiential Layer (3D World)

The train-compartment concept is central:

- a compartment or carriage interior
- a table between the visitor and the AI character
- interactive props that carry portfolio meaning (click a business card → see contact info)
- a laptop on the table as portal into the website layer
- motion outside the window, atmospheric storytelling
- darkness, glow, travel, weather, vibration

### Functional Layer (Website)

A clear, recruiter-friendly, accessible website that inherits the point visual language through:

- point-based hero sections and transitions
- point-cloud project previews and showcases
- flat editorial color panels and isolated sampled objects where they help the overall visual language
- tasteful integration — not everything becomes points
- body text, navigation, forms, and accessibility-critical UI remain DOM-native

The goal is a cohesive vibe, not two different art styles. Creative but tasteful.

### Content Mirroring

Every piece of portfolio content exists in both layers:

- business card / ticket → contact / links
- paper / dossier / newspaper → resume / experience
- chess board / tabletop prop → interactive project showcase
- window / passing scenery → project gallery
- laptop portal → the website itself
- character conversation → AI chat interface

### AI Character

The AI character is essential to the vision — not optional, not a later nice-to-have.

It is launch-critical, but not a Phase 1 implementation requirement. The scene, art style, engine, and animation foundation should be proven before AI integration.

The character:

- sits across from the visitor in the train compartment
- engages in natural conversation about projects, experience, interests
- plays games (chess/cards on the table)
- has personality, knowledge of Caden's portfolio and background
- performs pre-recorded animations (sipping tea, moving chess pieces, gesturing)

Animation approach:

- Caden records himself performing actions from the visitor's POV
- MediaPipe or Blender body-matching extracts motion data
- pre-recorded clips for specific actions (sipping tea, chess moves, idle variants)
- animation state machine driven by conversation state
- the point/surfel rendering style applied on top of the animated figure

LLM/backend stance:

- the product needs a provider abstraction, not a hard-coded vendor dependency in the core architecture
- final provider/model choice should remain flexible until character integration work begins
- rate limiting, prompt assembly, and session management live behind backend routes

## Source Types

The point engine should support multiple input sources:

- Blender/glTF 3D models (Phase 1)
- 2D still images (Phase 1)
- animated/skinned 3D characters (Phase 2)
- pre-recorded video (later research)
- live webcam (later stretch)
- LiDAR / spatial scan data (later)

Each source feeds the same renderer abstraction through a dedicated ingest adapter.

## Customization

The engine must be highly customizable and modular. Fine-tunable controls for:

- sampling algorithm (Voronoi, blue noise, Poisson disk)
- point density and count
- point size (base, min/max, attenuation, randomization)
- color (hue, saturation, brightness, contrast, mapping)
- opacity (global, depth falloff, edge fade)
- bloom (strength, radius, threshold)
- motion (jitter, drift, atmospheric effects)

The goal is to dial in the exact look through parameter tuning, not code changes.

## Phase 1 Non-Goals

Phase 1 is not:

- a full portfolio site
- a full train experience
- the AI character integration
- native iOS capture
- XR support
- a universal import stack

Phase 1 proves that the point runtime can carry the look and motion quality the project needs, on both 3D meshes and 2D images.

## Shipping Stance

- desktop is the primary target for the full experience
- mobile should support the functional website well
- mobile may initially fall back to website-only with an explicit "desktop for full experience" message if the 3D layer is not yet performant enough
