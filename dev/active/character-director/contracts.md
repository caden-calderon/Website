# CharacterDirector Contracts

## Overview

`CharacterDirector` sits between the language system and the runtime systems.

It consumes:

- structured LLM output
- scene state
- conversation state
- memory state
- active animation/interaction state

It produces:

- behavior state
- animation requests
- interaction requests
- focus/attention targets
- memory write intents

## Layer Boundaries

### `LLMAdapter`

Responsibilities:

- provider abstraction
- prompt assembly
- retrieval/context packing
- structured output validation

Does not:

- choose concrete animation clips
- attach props
- manipulate scene objects

### `CharacterDirector`

Responsibilities:

- convert high-level conversational intent into character behavior
- arbitrate between speaking, idling, gesturing, and prop interaction
- choose behavior families instead of fixed clips
- apply anti-repetition rules
- manage interruption and cooldown logic
- request interactions from the interaction layer

Does not:

- generate language
- parse PLY or drive render internals
- directly transform scene objects

### `AnimationDirector`

Responsibilities:

- choose concrete clip variants from a behavior family
- manage transitions, overlays, and timing
- coordinate body playback with hand overlays

### `InteractionDirector`

Responsibilities:

- execute authored interaction recipes
- manage prop ownership and attachment
- coordinate object state changes with animation timing

## Proposed State Shapes

### LLM Output

```typescript
type CharacterMood =
  | 'neutral'
  | 'warm'
  | 'playful'
  | 'focused'
  | 'thoughtful'
  | 'excited'
  | 'calm';

type AttentionTarget =
  | 'user'
  | 'table'
  | 'cup'
  | 'chessboard'
  | 'laptop'
  | 'window'
  | 'project-card'
  | null;

type BehaviorTag =
  | 'idle_attentive'
  | 'listening'
  | 'thinking'
  | 'explaining'
  | 'reacting'
  | 'greeting'
  | 'pointing'
  | 'reach_for_prop'
  | 'hold_prop'
  | 'place_prop';

type PropActionIntent =
  | { type: 'none' }
  | { type: 'pick_up'; propId: string }
  | { type: 'put_down'; propId: string; targetId?: string }
  | { type: 'move_chess_piece'; from: string; to: string }
  | { type: 'gesture_to'; propId: string };

interface LLMCharacterResponse {
  spokenText: string;
  mood: CharacterMood;
  intent: string;
  attentionTarget: AttentionTarget;
  behaviorTags: BehaviorTag[];
  propAction: PropActionIntent;
  topicIds: string[];
  memoryWriteCandidates: string[];
}
```

The LLM response stays high-level. It does not name exact clips.

### CharacterDirector Input

```typescript
interface CharacterDirectorInput {
  llm: LLMCharacterResponse | null;
  conversationState: {
    speaking: boolean;
    listening: boolean;
    activeTopicIds: string[];
  };
  sceneState: {
    focusedPropId: string | null;
    availableProps: string[];
    heldPropId: string | null;
    userAttentionTarget: string | null;
  };
  animationState: {
    activeBehaviorFamily: string | null;
    activeClipId: string | null;
    interruptible: boolean;
  };
  interactionState: {
    activeRecipeId: string | null;
    phase: 'idle' | 'reaching' | 'holding' | 'placing' | 'locked';
  };
}
```

### CharacterDirector Output

```typescript
interface CharacterDirectorOutput {
  behaviorFamily: string;
  attentionTarget: AttentionTarget;
  shouldSpeak: boolean;
  animationRequest: {
    family: string;
    priority: number;
    interruptPolicy: 'immediate' | 'soft' | 'wait';
  };
  interactionRequest:
    | { type: 'none' }
    | { type: 'start_recipe'; recipeId: string; priority: number };
  memoryWrites: string[];
}
```

## Behavior Families

Behavior families are semantic groups, not single clips.

Examples:

- `idle_attentive`
- `idle_relaxed`
- `thinking_light`
- `thinking_deep`
- `explaining_small`
- `explaining_emphatic`
- `react_positive`
- `react_uncertain`
- `listen_forward`
- `listen_back`

Each family can contain multiple recorded clip variants.

Selection should consider:

- recency
- current topic
- prop occupancy
- whether the character is speaking or listening
- scene attention target

## Anti-Repetition Rules

At minimum:

- do not replay the same clip variant within a short rolling window
- apply a recency penalty to the same family
- maintain family-level cooldowns for visible gestures
- allow lightweight idle families to recur more often than salient gestures

## InteractionRecipe Contract

```typescript
type HandSide = 'left' | 'right' | 'both';

interface InteractionRecipe {
  id: string;
  propId: string;
  hand: HandSide;
  preconditions: {
    requiredPropState?: string;
    requiredHeldPropId?: string | null;
    userFacing?: boolean;
  };
  bodyBehaviorFamily: string;
  handOverlayFamily: string;
  phases: Array<{
    id: string;
    atMs: number;
    action:
      | { type: 'attach_prop_to_hand'; socketId: string }
      | { type: 'detach_prop_to_scene'; socketId: string }
      | { type: 'set_prop_state'; state: string }
      | { type: 'set_attention_target'; target: AttentionTarget };
  }>;
  completionPolicy: 'must_finish' | 'can_interrupt';
}
```

Examples:

- `pick_up_cup_left`
- `sip_tea_small`
- `set_down_cup_left`
- `grasp_chess_piece_e2`
- `move_chess_piece_e2_e4`
- `gesture_to_laptop`

## Prop Ownership Model

At any given time, a prop is owned by one of:

- `scene`
- `left_hand`
- `right_hand`
- `recipe_locked`

This must be explicit so animation and interaction systems do not fight over the same object.

## Memory Tiers

### Session Memory

- what the visitor has asked this session
- current conversational thread
- recent references

### Character Memory

- persistent personality rules
- stable speech style
- long-lived preferences or recurring callbacks if desired

### Content Memory

- project facts
- technologies
- relationships between projects
- prepared anecdotes or commentary seeds

### User Memory

- optional
- only if you intentionally want returning-user continuity

## Content Graph Expansion

The current content graph is not rich enough for the AI layer by itself.

Future project/content data should support:

- short summary
- long summary
- talking points
- technical highlights
- story/anecdote notes
- related project ids
- scene prop hooks
- retrieval tags

## Recommended Implementation Order

1. Finalize these contracts in docs.
2. Expand content-model requirements.
3. Implement provider-agnostic structured LLM output validation.
4. Implement a rule-based `CharacterDirector` first.
5. Integrate animation families and interaction recipes.
6. Only then iterate on model choice, prompting, and fine-tuning.
