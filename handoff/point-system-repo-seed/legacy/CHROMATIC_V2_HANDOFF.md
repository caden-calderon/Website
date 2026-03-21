# CHROMATIC V2 — Project Handoff Document

## Overview

**Chromatic** is Caden's portfolio website, reimagined as a dual-world interactive experience. Visitors enter a stylized train compartment rendered in ASCII/text-based art styles, sit across from an AI-powered character, and explore the portfolio through conversation and interactive objects. A laptop on the table serves as a portal to a functional website layer — same content, different presentation. The two worlds are seamlessly connected: every piece of content exists as both a poetic train-scene object and a practical website page.

**Creator:** Caden — CS major, Math minor, nearing graduation. Strong in AI/ML, systems design, creative technology. Runs Arch Linux (CachyOS) with Hyprland/Wayland. Proficient in Svelte 5, Rust, Python, Three.js, Blender.

**Project Status:** Architecture and tooling finalized, ready for feasibility prototyping.

---

## The Vision

### The Train Scene (Experiential Layer)

The visitor sits across from an illustrated/stylized character inside a moving train compartment. The scene includes:

- A table between the visitor and the character
- Tea/coffee, playing cards, chess pieces, and other interactive objects on the table
- A window with scenery scrolling by outside (parallax layers)
- A laptop sitting on the table (portal to the website layer)
- Ambient atmosphere: train rumble, rain, warm lighting

The character is AI-powered (Claude API) and guides visitors through the portfolio via natural conversation. They can reach for objects, sip tea, play cards, gesture, react — all driven by rotoscoped motion capture data from Caden's own recorded performances.

The entire scene is rendered in a text-based art style (ASCII, braille, halftone, etc.) via a post-processing pipeline. The 3D scene is rendered offscreen in standard WebGL, then a style processor converts the framebuffer output to the chosen text art style.

### The Website Layer (Functional Layer)

A clean, functional website lives inside the laptop on the table. Click the laptop → seamless zoom transition → you're on a real website. Click back → return to the train. The website provides the same portfolio content in a traditional, accessible, recruiter-friendly format.

The website's visual theme dynamically matches the train scene's current art style:

| Art Style | Website Theme |
|-----------|---------------|
| Classic ASCII | Monospace, green/amber on black, terminal UI |
| Braille | Minimal dots, lots of whitespace, refined typography |
| Halftone | 80s editorial — condensed serifs, grain, duotone |
| ANSI | Bold 16-color, retro BBS aesthetic |

### Content Mirroring

Every piece of portfolio content exists in both worlds:

| Train Scene Object | Website Equivalent |
|--------------------|-------------------|
| Business card on table | Contact page |
| Chess/card game | Interactive project demos |
| Photo/postcard on wall | About me section |
| Newspaper/magazine on seat | Resume / experience |
| Ticket stub | Links / socials |
| Character conversation | AI chat interface |
| View out window | Project gallery |
| Laptop | The website itself |

---

## Art Style System

The project uses a swappable art style system. The train scene and website theme are coupled to a single global `artStyle` variable. Supported styles (expanding over time):

### Text-Based Art Styles

- **Classic ASCII** — Characters (`@#%&*+=-:.`) mapped to brightness. Monochrome. Terminal aesthetic.
- **Block/Box Drawing** — Unicode box characters (`█ ▓ ▒ ░ ╔ ╗ ║`). Geometric, structured. Good for architectural elements.
- **Braille** — Unicode braille blocks (`⠁⠃⠇⡇⣇⣧⣷⣿`). 2×4 dot grid per character = much higher effective resolution. Smoothest gradients of any text style.
- **Halftone/Dither** — Dots of varying size on a grid. Newspaper print aesthetic. Ties into 80s editorial design.
- **ANSI** — ASCII with 16-color support. BBS era aesthetic. Enables warm lighting, colored objects.
- **Stipple/Pointillism** — Varying dot density. Organic, pen-and-ink feel. Pairs well with rotoscoped animation (natural "boiling" quality).

All styles share the same rendering pipeline: 3D scene → offscreen framebuffer → brightness extraction → character/dot mapping. Only the mapping function changes per style.

---

## Character Animation — Rotoscope Pipeline

The character's animations are derived from real video footage of Caden acting out the movements. This eliminates the need for traditional drawing/animation skill — the art style is applied programmatically on top of natural human motion.

### Offline Pipeline (Pre-production)

1. **Record** — Caden films himself from the visitor's POV (across a table) performing: idle variants, talking, reaching for tea, picking up cards, laughing, thinking, gesturing, etc.
2. **Extract** — Python + MediaPipe processes footage:
   - **Face Mesh** (468 landmarks) — facial expressions, mouth shapes, eye direction, head tilt
   - **Pose** (33 landmarks) — body position, arm movements, hand gestures
3. **Export** — Landmark data saved as JSON keyframe files, one per animation clip
4. **Clip Library** — Organized set of animation clips tagged by state (idle, talking, reacting, etc.)

### Runtime Pipeline (Browser)

1. JSON keyframe data drives a simple **3D mannequin/figure** in the Threlte scene
2. The mannequin has enough geometry to produce a recognizable silhouette and moving limbs
3. It renders to the same offscreen framebuffer as the rest of the scene
4. The ASCII/braille/halftone post-processor styles it identically to the environment
5. An **animation state machine** selects clips based on LLM conversation state

### Required Clip Library

- 3-4 idle variants (subtle shifting, looking around, looking out window)
- Multiple talking variants (so loops aren't obvious)
- Reaching for tea, sipping, setting down
- Picking up a card, looking at it, playing it
- Reactions: laughing, nodding, thinking, surprised
- Transitional blends between states

### No Green Screen Needed

MediaPipe extracts skeleton/landmark data from standard video footage. Background doesn't matter — only motion coordinates are used, not pixels. A decent webcam in reasonable lighting is sufficient.

---

## Technical Architecture

### Core Stack

| Layer | Tool | Rationale |
|-------|------|-----------|
| Framework | SvelteKit 2 + Svelte 5 | Caden knows it deeply (Aperture). Runes for reactive global state. SvelteKit handles routing for website layer. |
| 3D Scene | Threlte (Three.js + Svelte) | Declarative Three.js in Svelte ecosystem. Full Three.js power. |
| 3D Modeling | Blender → glTF | Simple low-poly train compartment. Caden knows Blender. |
| Render Pipeline | Threlte EffectComposer → custom AsciiPass | Abstracted StyleProcessor interface. CPU first, GPU drop-in. |
| Motion Capture | Python + MediaPipe (offline) | Pose + Face Mesh extraction from video |
| Animation Runtime | JSON keyframes → mannequin rig | State machine triggered by LLM mood/action tags |
| LLM | Claude API | Caden has built this before (Chromatic V1, Aperture) |
| Voice (future) | ElevenLabs (planned) | VoiceProvider interface stubbed, typed text for now |
| Website UI | Svelte + Tailwind | Dynamic theme configs swap per artStyle |
| Audio | Howler.js | Ambient train sounds. Lightweight. |
| Deployment | Vercel or Cloudflare Pages | SvelteKit edge/static |
| Responsive | DeviceContext Svelte store | Single source of truth for mobile/desktop adaptation |

### What's NOT in the Stack

- No Unreal Engine, no pixel streaming
- No Rive/Spine (character rendered through ASCII pipeline)
- No database (session state only)
- No WebGPU (WebGL2 sufficient, wider support)

### Render Pipeline Architecture

```
3D Scene (Threlte) → WebGLRenderTarget → EffectComposer → AsciiPass(artStyle) → Screen
```

The `AsciiPass` conforms to a **StyleProcessor interface**. Two implementations:

1. **CPU (prototype):** Read pixels from render target, map brightness to characters in JS, render as canvas text. Easier to iterate. May be sufficient for fixed-camera scene at moderate resolution.

2. **GPU (production):** Full-screen quad post-process. Custom fragment shader samples render target, maps brightness to character cells via a pre-baked **font atlas texture** (sprite sheet of all characters per style). No CPU readback. This is important for performance — laggy ASCII web demos almost always hit the `readPixels` bottleneck.

**Critical design decision:** Abstract from day one so the swap is seamless. The scene writes to a framebuffer. The processor reads it. CPU and GPU implementations are interchangeable.

Font atlas textures are pre-baked at build time — one sprite sheet per art style containing all characters at the target cell resolution.

### LLM Conversation System

The Claude API returns structured responses:

```json
{
  "text": "Ah, you built a trading system? Tell me more.",
  "mood": "curious",
  "action": "lean_forward",
  "voice": true
}
```

- `text` — Displayed as typed text in-scene (terminal style) or in a chat overlay
- `mood` — Drives facial expression on the mannequin (maps to Face Mesh blend targets)
- `action` — Triggers animation clip from the library (lean_forward, sip_tea, pick_up_card, etc.)
- `voice` — Reserved for future TTS integration. Currently ignored (text only).

The system prompt gives the character knowledge of Caden's portfolio and personality. Conversation history maintained in a Svelte store (session-scoped).

### Voice (Future Integration)

A `VoiceProvider` interface is stubbed from the start:

- Takes text input, streams audio chunks out
- ElevenLabs is the likely provider
- Web Audio API applies style-dependent filtering (bitcrusher/lo-fi in ASCII mode, clean in halftone mode)
- Lip sync at ASCII resolution is amplitude-based (not phoneme). Character "mouth" is a few shifting characters — audio volume drives open/close. Much simpler than traditional viseme mapping.

### The Laptop Transition

**Desktop:** Click laptop in train scene → camera pushes into screen → canvas layer fades out, DOM layer fades in → visitor is on the website. Reverse to return.

**Mobile:** Orientation change IS the transition. Landscape = train scene, portrait = website. The laptop object shows a "rotate to browse" hint. See Mobile Strategy section for details.

**Technical approach (desktop):**

- The laptop screen in the 3D scene ideally shows a live mini-preview of the website (CSS3DRenderer or `html2canvas`)
- **WARNING:** This is a known pain point. `html2canvas` is slow, CSS3DRenderer has compositing issues with WebGL. This must be prototyped early. A clean fade/cut may be more reliable than a seamless zoom.
- Fallback: The laptop screen shows a static thumbnail. Click triggers a crossfade transition rather than a zoom. Still feels diegetic.

### Project Showcase System

Portfolio projects span multiple runtimes and languages. A manifest-driven system handles this:

```json
{
  "id": "axial",
  "title": "Project Axial",
  "type": "interactive",
  "runtime": "threejs",
  "entry": "/projects/axial/index.svelte",
  "train_object": "chess_board",
  "thumbnail": "/projects/axial/cover.png",
  "demo_available": true
}
```

```json
{
  "id": "argus",
  "title": "Argus Trading System",
  "type": "walkthrough",
  "runtime": "slides",
  "entry": "/projects/argus/index.svelte",
  "train_object": "newspaper",
  "thumbnail": "/projects/argus/cover.png",
  "demo_available": false
}
```

#### Project Types

| Type | Presentation | Train Scene | Browser Projects |
|------|-------------|-------------|-----------------|
| `interactive` | Live demo embedded as iframe or Svelte component | Play the game on the table, interact with the object | Axial (Three.js rewrite), any web-native project |
| `walkthrough` | Character narrates with visuals, diagrams, code snippets, video | Character pulls out photo album or draws on napkin | Aperture, Argus, non-browser projects |
| `terminal` | Live code execution via sandboxed backend (WebContainer or thin server) | Open the laptop and run it | Python projects |

Each project is a **lazy-loaded Svelte component** behind a dynamic import. Adding a new project: create a folder, write the component, add a manifest entry. Both worlds (train object + website page) auto-integrate from the manifest.

#### Axial Specifically

The current Unity/C# implementation should be rewritten in Three.js for browser embedding. The game logic (bitboard, MCTS, AlphaZero policy+value network) could run via:
- A lightweight API endpoint (Python backend)
- WASM port of the core logic
- Or a simplified JS implementation for the portfolio demo

The Three.js game board renders directly in the train scene — the chess/card game on the table IS Axial.

---

## Mobile Strategy

Mobile is a first-class target, not an afterthought. The train scene is feasible on modern phones — the geometry is trivial (few hundred triangles, fixed camera) and the GPU post-process shader is where mobile hardware actually performs well. The performance killer to avoid is the CPU readback path (`readPixels`), which is why the GPU shader pipeline is important even for the initial prototype.

### Why This Works on Mobile

- Fixed camera, no physics, no shadows, no complex lighting — the 3D scene is lightweight
- Modern mobile GPUs (A17 Pro, Snapdragon 8 Gen 3+) handle full-screen fragment shaders at 60fps
- The ASCII grid resolution scales down naturally on smaller viewports (e.g., 80×45 cells vs desktop's 160×90)
- Most "laggy ASCII demos" on the web are bottlenecked by DOM manipulation or CPU canvas text rendering, not GPU work — the shader path avoids this entirely

### Orientation as Interaction

The train scene composition is inherently widescreen — landscape mode is natural. The website inside the laptop is inherently vertical — portrait mode is natural. **Orientation change IS the transition mechanic on mobile:**

- **Landscape** → Train scene (experiential layer)
- **Portrait** → Website (functional layer)

This replaces the desktop zoom-into-laptop transition with something that feels native to the device. No nested-frames problem (zooming into a laptop screen on a phone screen showing an ASCII scene). The rotation is the diegetic cue.

On desktop, the laptop click transition remains as designed. On mobile, the laptop object on the table can show a subtle prompt ("rotate to browse") or the transition triggers automatically on orientation change.

### DeviceContext Store

Build this reactive store from day one. Every component that behaves differently on mobile reads from it:

```typescript
interface DeviceContext {
  isMobile: boolean              // viewport width < 768 or pointer: coarse
  orientation: 'landscape' | 'portrait'
  inputMethod: 'mouse' | 'touch' | 'gyro'
  gridCols: number               // ASCII grid dimensions, derived from viewport
  gridRows: number
  cellSize: number               // pixels per character cell
  pixelRatio: number             // device pixel ratio, cap at 2 for performance
  hasGyroscope: boolean          // for tilt-based camera parallax
  pointerType: 'fine' | 'coarse' // CSS pointer media query
}
```

This store updates reactively on resize, orientation change, and device capability detection. It is the single source of truth for all responsive behavior.

### Input Mapping

| Desktop | Mobile | Purpose |
|---------|--------|---------|
| Mouse position | Gyroscope/accelerometer tilt | Subtle camera parallax (looking around train) |
| Mouse click | Touch tap | Interact with objects on table |
| Mouse hover | Touch long-press or glow hints | Discover interactive objects |
| Scroll | Swipe | Navigate conversation history |
| Keyboard typing | On-screen keyboard | Chat input |

**Gyroscope parallax:** On mobile, tilting the phone slightly shifts the camera perspective in the train scene. Uses `DeviceOrientationEvent` — well-supported on iOS (requires permission request since iOS 13) and Android. This is actually cooler than mouse parallax because it feels physical. Abstract the "look direction" input source from the start so mouse and gyro are interchangeable.

**Touch targets:** Interactive objects on the table need generous invisible hitboxes on mobile. Scale hitbox size based on `pointerType: 'coarse'`. CSS `@media (pointer: coarse)` detects imprecise input devices.

### Conversation UI on Mobile

The conversation interface needs two distinct layouts:

- **Desktop:** Typed text floats elegantly over the train scene. Input field at bottom of canvas.
- **Mobile:** When the keyboard opens, it covers half the screen. The train scene must not be fully occluded. Two approaches:
  - **Split layout:** Train scene on top half, conversation drawer on bottom half. Scene shrinks but stays visible.
  - **Pull-up drawer:** Conversation is a swipeable drawer that overlays the bottom portion of the scene. Swipe down to dismiss and see the full scene.

Design the conversation component as a **separate DOM layer** from the canvas, not baked into the WebGL scene. This is critical — DOM layers can reflow around the keyboard, canvas cannot.

### Audio on Mobile

Mobile browsers require a user gesture before playing audio (`AudioContext` must be resumed after a tap/click). The ambient train sounds (Howler.js) must initialize on first interaction. Plan for a "tap to enter" landing moment that doubles as:

- Loading screen (while Threlte scene initializes)
- Audio context activation
- Gyroscope permission request (iOS)
- Art style preview or selection

### Performance Targets

| Device Tier | Grid Resolution | Target FPS | Notes |
|-------------|----------------|------------|-------|
| Modern flagship (iPhone 15+, Pixel 8+) | 80×45 cells | 60fps | Full experience |
| Mid-range (iPhone 12, Pixel 6) | 60×34 cells | 30fps | Acceptable with reduced cell count |
| Low-end / old devices | N/A | N/A | Fallback to website-only (no train scene) |

Detection: If the first few frames of the ASCII render drop below 20fps, gracefully degrade to the website layer with a note that the full experience is available on desktop. Don't let a bad mobile experience be the first impression.

### Resolution Independence

The ASCII grid dimensions must be derived from viewport size, never hardcoded:

```typescript
// Responsive grid sizing
const cellSize = $derived(deviceContext.isMobile ? 8 : 6)  // pixels per cell
const gridCols = $derived(Math.floor(window.innerWidth / cellSize))
const gridRows = $derived(Math.floor(window.innerHeight / cellSize))
```

The shader doesn't care about absolute dimensions — it divides the screen into cells of whatever size. Smaller screen = fewer cells = same performance characteristics. The scene remains recognizable because the composition (train interior, character silhouette, window) is designed to read at low resolution.

### Early Mobile Validation

During the feasibility test in Claude Code:

1. Run the Vite dev server with `--host` flag to expose on local network
2. Load the prototype on a phone over WiFi
3. Check frame rate of the ASCII shader on actual mobile hardware
4. Test gyroscope input for camera parallax
5. Test touch interaction with table objects

If the GPU shader path hits 30fps on a mid-range phone during the first prototype, mobile is viable. If not, adjust cell size or simplify the scene geometry before investing further.

---

### Must Prototype First (Feasibility Test Priorities)

1. **ASCII render pipeline performance** — A basic Threlte box (train placeholder) running through a CPU-based ASCII post-process. Target: 30+ fps at a resolution where the scene is recognizable. This validates the entire visual approach.

2. **Character readability** — A mannequin-like figure rendered through ASCII at target resolution. Does it read as "person"? Braille may be needed for the character (higher resolution) while the environment stays in coarser ASCII. Test multiple styles.

3. **Laptop transition** — Can we do a seamless zoom into a live DOM preview on the laptop screen? Or do we need a fallback (fade/cut)?

4. **MediaPipe → mannequin pipeline** — Record a short test clip, extract landmarks, drive a Three.js mannequin, render through ASCII. Does the motion feel natural? Is the landmark data clean enough?

5. **Mobile performance** — Load the ASCII shader prototype on a phone over local network (`--host`). Check frame rate, test gyroscope parallax, verify touch targets. If 30fps on a mid-range phone, mobile is viable.

### Design Decisions Still Open

- **Mobile edge cases** — Core mobile strategy is defined (see Mobile Strategy section above). Remaining questions: exact threshold for graceful degradation, handling devices with gyroscope permission denied, tablet-specific layout (landscape is default on iPad — does the orientation transition still work?).
- **Default entry point** — Do visitors land in the train first (cinematic, risks losing impatient visitors) or choose at a landing screen? Needs user testing.
- **Accessibility** — The ASCII canvas is invisible to screen readers. The website layer must be fully functional as the accessible version. Ensure all content is reachable without the train scene.
- **Art style selection UX** — A dial on the train? A setting in the website? Automatic based on time of day? Let the character suggest it?
- **Character personality/voice** — What's the character's personality? Are they Caden, a separate persona, an abstract guide?
- **Scope management** — This is ambitious. The feasibility test should be ruthlessly minimal: prove the riskiest assumptions, don't build features.

---

## Evolution History

### V1: MetaHuman in a Flower Field (Abandoned)

- Unreal Engine 5.7 + Pixel Streaming
- MetaHuman characters with colored skin (blue, red, yellow) in a nemophila flower field
- Tea table conversation setup with LLM-powered dialogue and lip sync
- Abandoned because photorealism felt gimmicky and unachievable at target quality solo

### V1.5: Illustrated Train Compartment (Explored)

- Pivoted to stylized ink/manga illustration aesthetic (duotone crosshatching)
- Train compartment setting chosen over open field (more intimate, better metaphor)
- Pipeline: Krita (illustration) → Blender Grease Pencil (projection mapping, animation) → Browser
- Explored Grease Pencil extensively but hit glTF export limitation
- Debated Three.js vs 2D layered approach vs Rive/Spine
- Concern: Caden's drawing ability as a bottleneck

### V2: ASCII/Text Art + Rotoscope (Current)

- Same train compartment concept, new rendering approach
- Rotoscoped motion capture eliminates drawing ability concern
- Text-based art styles (ASCII, braille, halftone, etc.) as the visual layer
- Dual-world architecture: train scene + laptop website
- Content mirroring between experiential and functional layers
- Dynamic style coupling between both worlds
- Full technical stack defined, ready for feasibility prototyping

---

## Dev Environment

- **OS:** Arch Linux (CachyOS) with Hyprland (Wayland)
- **GPU:** NVIDIA (use `prime-run` for GPU tasks)
- **Editor:** Claude Code + Neovim
- **Shell:** Fish with custom functions
- **Package Management:** npm/pnpm for JS, pip for Python
- **Blender:** Installed, used for modeling
- **MATLAB:** Installed (for coursework, not this project)

---

## Caden's Other Projects (For Showcase System)

- **Aperture** — Tauri + Svelte 5 + Rust transparent proxy between AI coding tools and provider APIs. MCP tools, semantic block parsing, desktop UI. (Showcase type: walkthrough)
- **Axial** — 3D Connect-4 variant (6×6×7) with AlphaZero AI. Unity/C# + Python. Needs Three.js rewrite for browser. (Showcase type: interactive)
- **Argus** — Multi-agent prediction market trading system. Python. Agents: Iris, Helios, Athena, Hermes. Kelly criterion sizing, SMS approval gates. (Showcase type: walkthrough or terminal)

---

*Last updated: March 14, 2026 (v2 — added Mobile Strategy)*
*Document intended for LLM session continuity — provide this at the start of new Claude Code sessions about the Chromatic project.*
