# CharacterDirector Plan

## Goal

Define the behavior architecture that sits between the LLM, animation system, and scene interactions before implementation begins.

The goal is not just to trigger clips. The goal is to make the character feel natural, varied, and grounded in the scene while keeping the codebase modular enough to scale with the larger Chromatic product.

## Why This Layer Exists

The LLM should not directly choose concrete animation clips or manipulate scene props. That would couple language generation, animation playback, and prop choreography into one fragile system.

`CharacterDirector` exists to translate high-level conversational intent into:

- behavior state
- clip-family selection
- variation rules
- interruption policy
- prop interaction requests
- attention and focus targets

## Core Principles

### 1. LLM outputs intent, not low-level animation commands

The model should express things like:

- mood
- conversational intent
- suggested behavior tags
- attention target
- optional prop interaction intent

It should not say "play clip 17 now."

### 2. Variation comes from authored behavior families

Naturalness will come from:

- multiple variants per behavior family
- recency penalties
- cooldowns
- scene-aware selection
- interruption/blending rules

Not from hoping the model improvises well.

### 3. Object interaction is recipe-driven

Chess, tea, laptop, cards, and similar interactions should be authored as recipes rather than treated as open-ended manipulation problems.

### 4. Hands and body are different systems

- body: prerecorded Kinect point-cloud clips
- hands: controllable mesh/rig overlays for interaction-critical actions
- props: scene objects with sockets, ownership, and state

## Planned Layers

1. `LLMAdapter`
   Produces structured conversational output from the selected provider.

2. `CharacterDirector`
   Converts structured LLM output plus scene state into a current character plan.

3. `AnimationDirector`
   Picks body clip families, hand overlays, and transitions based on the current character plan.

4. `InteractionDirector`
   Executes interaction recipes, prop attachments, and reach/placement timing.

5. `Scene Runtime`
   Owns the actual Three.js/Threlte objects, sockets, and render state.

## Initial Deliverables

- define the `CharacterDirector` contract
- define the LLM response schema
- define interaction recipe shape
- define memory tiers
- define content-graph expansion needed for project-aware conversation

## Non-Goals

- final provider choice
- final fine-tuning pipeline
- full IK/manipulation solver
- real-time general-purpose grasp planning
