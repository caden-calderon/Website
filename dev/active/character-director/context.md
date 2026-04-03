# CharacterDirector Context

## Date

2026-04-03

## Why This Is Being Defined Now

The project now has a solid rendering and playback direction, but the behavior architecture is still only implied in roadmap language like "LLM action tags drive animation."

That is not enough for implementation. Without a clear director layer, the code will drift toward:

- LLM-driven clip selection
- duplicated scene logic
- ad hoc prop interaction handling
- repetitive and predictable behavior

## Current Product Constraints

- Chromatic has two product surfaces:
  - a traditional website
  - a 3D experiential layer with an AI character
- the same repo also contains a standalone Phase 1 point-engine project that should ship inside the website as a featured project
- optimization and modularity matter because the end product is large and multi-surface

## Behavioral Constraints

- the character should not feel like a generic assistant
- the character should speak naturally about Caden's projects and background
- the character should have memory and scene awareness
- gestures and idle behaviors must vary
- interactions with props like tea cups and chess pieces need believable choreography

## Key Conclusion

The project needs a `CharacterDirector` layer plus recipe-based prop interaction before LLM/provider implementation starts.
