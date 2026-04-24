# Chromatic: implementation guide for five core systems

This report delivers concrete implementation patterns for five interconnected systems in Chromatic — an AI point cloud character project built on SvelteKit 2, Svelte 5, Threlte, and Three.js. Each section provides production-ready code, tested parameter values, library recommendations, and architectural decisions. The techniques span from GPU particle physics to Kinect capture pipelines, unified by a shared point-cloud visual language.

---

## 1. Force-move chess animation with particle trails

The force-move effect requires three coordinated systems: a spline-based piece trajectory, trailing particles that envelop the moving piece, and a "command stream" of particles flowing from the AI character to the chess piece to establish visual causality.

### Spline path with CatmullRomCurve3

Use `THREE.CatmullRomCurve3` with five control points to shape a lift-arc-land trajectory. The critical detail is using **`getPointAt(t)` instead of `getPoint(t)`** — the former samples at uniform arc-length intervals, preventing the piece from speeding through straight segments and crawling through curves:

```typescript
import { CatmullRomCurve3, Vector3 } from 'three';

function createMoveArc(from: Vector3, to: Vector3, arcHeight = 2.0): CatmullRomCurve3 {
  const mid = new Vector3().lerpVectors(from, to, 0.5);
  mid.y = arcHeight;

  const liftOff = from.clone();
  liftOff.y += arcHeight * 0.4;

  const approach = to.clone();
  approach.y += arcHeight * 0.3;

  return new CatmullRomCurve3(
    [from.clone(), liftOff, mid, approach, to.clone()],
    false, 'catmullrom', 0.5
  );
}
```

The tension parameter (0.5) produces smooth curves. Lower values create tighter arcs for a more aggressive telekinetic feel.

### Threlte integration with useTask

Threlte v7+ uses `useTask` as its per-frame hook. It receives `delta` in seconds and returns `{ start, stop }` for manual control:

```svelte
<script lang="ts">
  import { T, useTask } from '@threlte/core';
  import { CatmullRomCurve3, Vector3, type Mesh } from 'three';

  let { from, to, duration = 1.5, onComplete } = $props();
  let mesh = $state.raw<Mesh>();
  let progress = 0;
  let isAnimating = true;

  const curve = createMoveArc(new Vector3(...from), new Vector3(...to));

  const { stop } = useTask((delta) => {
    if (!mesh || !isAnimating) return;
    progress += delta / duration;
    if (progress >= 1) { progress = 1; isAnimating = false; stop(); onComplete?.(); }

    const easedT = forceMoveEase(progress);
    mesh.position.copy(curve.getPointAt(easedT));
  });
</script>

<T.Mesh bind:ref={mesh}>
  <T.BoxGeometry args={[0.5, 1, 0.5]} />
  <T.MeshStandardMaterial color="ivory" />
</T.Mesh>
```

### Multi-phase easing for levitation

A single easing function cannot capture the physics of telekinetic motion. Use a **three-phase custom ease** — slow deliberate lift (power3.in), smooth cruise (power2.inOut), and gentle settling (power4.out):

```typescript
function forceMoveEase(t: number): number {
  if (t < 0.2)  return 0.2 * easeInQuart(t / 0.2);           // slow lift
  if (t < 0.8)  return 0.2 + 0.6 * easeInOutCubic((t - 0.2) / 0.6); // cruise
  return 0.8 + 0.2 * easeOutQuart((t - 0.8) / 0.2);          // settle
}
```

With **GSAP**, you can alternatively animate a `{ t: 0 }` proxy object and feed `t` into `curve.getPointAt()`. GSAP's `CustomEase.create()` lets you design the curve visually. For a subtle landing bounce, chain `"elastic.out(1, 0.3)"` on the final phase. Add a gentle bob during hover with `piece.position.y += Math.sin(elapsed * 3) * 0.02`.

### Trailing particle system with ring buffer

Pre-allocate a fixed buffer of **2,000 particles** and recycle via a write head. Each frame, spawn ~10 particles in a sphere around the piece's current position, give them outward drift velocity plus a swirling sine/cosine offset, and fade them over a 0.5–1.5s lifetime:

```typescript
const MAX_PARTICLES = 2000;
const positions = new Float32Array(MAX_PARTICLES * 3);
const velocities = new Float32Array(MAX_PARTICLES * 3);
const lifetimes = new Float32Array(MAX_PARTICLES);
const maxLifetimes = new Float32Array(MAX_PARTICLES);
let writeHead = 0;

function spawnParticles(piecePos: Vector3, count: number) {
  for (let i = 0; i < count; i++) {
    const idx = writeHead++ % MAX_PARTICLES;
    const i3 = idx * 3;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 0.3 + Math.random() * 0.5;

    positions[i3]     = piecePos.x + r * Math.sin(phi) * Math.cos(theta);
    positions[i3 + 1] = piecePos.y + r * Math.sin(phi) * Math.sin(theta);
    positions[i3 + 2] = piecePos.z + r * Math.cos(phi);

    velocities[i3]     = (positions[i3] - piecePos.x) * 0.5;
    velocities[i3 + 1] = (positions[i3 + 1] - piecePos.y) * 0.5 + 0.2;
    velocities[i3 + 2] = (positions[i3 + 2] - piecePos.z) * 0.5;

    lifetimes[idx] = 0;
    maxLifetimes[idx] = 0.5 + Math.random() * 1.0;
  }
}
```

Render with a **custom ShaderMaterial** using `AdditiveBlending` and `depthWrite: false`. The vertex shader computes `gl_PointSize` with lifetime-based shrinking and distance attenuation (`300.0 / -mvPosition.z`). The fragment shader draws soft circles via `smoothstep(0.2, 0.5, dist)`, fades opacity as `1.0 - lifeRatio`, and interpolates color from cyan to purple over the particle's life. Dead particles get `gl_PointSize = 0.0` to hide them without branching.

### Visual causality: AI character → chess piece particle stream

A separate particle pool handles "command stream" particles that fly from the AI point cloud to the target piece along **quadratic Bézier arcs**. The control point sits at the midpoint + random perpendicular offsets for arc variety:

```typescript
function quadraticBezier(p0: Vector3, p1: Vector3, p2: Vector3, t: number): Vector3 {
  const mt = 1 - t;
  return new Vector3(
    mt*mt*p0.x + 2*mt*t*p1.x + t*t*p2.x,
    mt*mt*p0.y + 2*mt*t*p1.y + t*t*p2.y,
    mt*mt*p0.z + 2*mt*t*p1.z + t*t*p2.z
  );
}
```

Apply `easeInQuad` (`t = t * t`) to the interpolation parameter so particles depart slowly from the AI character and **accelerate dramatically toward the chess piece**. Orchestrate timing with GSAP's timeline: stream particles for ~800ms, then overlap piece movement by 200ms so the piece starts rising while the last command particles are still arriving.

### Telekinesis effect composition

No single "telekinesis shader" exists, but the effect composes from four layers: the command particle stream (causality), a levitation glow (bloom post-process + additive particle shell around the piece), optional screen-space heat-haze distortion, and subtle sine-based rotation wobble during hover. The **three.quarks** VFX library provides a visual editor for trail renderers and emission behaviors if you want a drop-in system instead of custom shaders.

**Key resources**: Threlte `useTask` docs at threlte.xyz/docs/reference/core/use-task; GSAP easing visualizer at gsap.com/docs/v3/Eases; Codrops GPGPU particle tutorial; three.quarks on GitHub; easings.net for function reference.

---

## 2. Particle text that disperses on hover and springs back

### The sampling pipeline: text → canvas → pixels → THREE.Points

The standard technique used across virtually every particle text implementation follows four steps. Render text at large size (100px+) to an offscreen canvas, read pixel data with `getImageData()`, sample every Nth filled pixel, and map positions to 3D coordinates:

```javascript
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
ctx.font = 'bold 100px Verdana';
const metrics = ctx.measureText('CHROMATIC');
canvas.width = Math.ceil(metrics.width) + 20;
canvas.height = 140;

ctx.font = 'bold 100px Verdana';
ctx.fillStyle = '#ffffff';
ctx.textBaseline = 'middle';
ctx.fillText('CHROMATIC', 10, canvas.height / 2);

const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
const positions = [];
const step = 4; // every 4th pixel ≈ 6% sampling

for (let y = 0; y < canvas.height; y += step) {
  for (let x = 0; x < canvas.width; x += step) {
    const alpha = imageData.data[(y * canvas.width + x) * 4 + 3];
    if (alpha > 128) {
      positions.push(
        (x - canvas.width / 2) * 0.1,
        -(y - canvas.height / 2) * 0.1,
        (Math.random() - 0.5) * 0.5
      );
    }
  }
}
```

In Threlte, wrap the resulting `BufferGeometry` in `<T.Points>` with a custom `ShaderMaterial`. The `samplingStep` controls particle density: **step=2–3 for headings** (~5,000 particles), **step=6–8 for smaller text** (~800 particles).

### Spring physics with mouse repulsion

Two approaches exist. For under ~50K particles, a **JavaScript update loop** works well. Each particle stores a rest position, current position, and velocity. Per frame, compute a mouse repulsion force (linear or inverse-square falloff within a radius) and a spring force (`F = -k * (pos - restPos)`), then apply damping:

```javascript
// Per particle per frame:
const dx = particle.x - mouseX;
const dy = particle.y - mouseY;
const distSq = dx * dx + dy * dy;
const mouseRadius = 3.0;

if (distSq < mouseRadius * mouseRadius) {
  const dist = Math.sqrt(distSq);
  const force = (mouseRadius - dist) / mouseRadius;
  particle.vx += (dx / dist) * force * 0.5;
  particle.vy += (dy / dist) * force * 0.5;
}

particle.vx += (particle.restX - particle.x) * 0.03;  // spring constant
particle.vy += (particle.restY - particle.y) * 0.03;
particle.vx *= 0.92;  // damping
particle.vy *= 0.92;
particle.x += particle.vx;
particle.y += particle.vy;
```

Tested values from production demos: **spring constant 0.03–0.15**, **damping 0.90–0.95**. Higher stiffness = snappier return; higher damping = less oscillation.

For **100K+ particles**, move the physics to the GPU. Bruno Imbrizi's acclaimed Codrops technique uses a "touch texture" — render the mouse position to a small offscreen canvas, pass it as a uniform, and displace particles in the vertex shader based on texture brightness. Alternatively, use `GPUComputationRenderer` from Three.js examples for full GPGPU spring physics with the spring force computed in a fragment shader writing to a data texture.

For mouse position in 3D, Threlte's interactivity system is the cleanest approach:
```svelte
<T.Mesh onpointermove={(e) => { mouseWorldPos = e.point; }}>
  <T.PlaneGeometry args={[100, 100]} />
  <T.MeshBasicMaterial visible={false} />
</T.Mesh>
```

### troika-three-text is wrong for particle effects

**troika-three-text** (~3.1M weekly npm downloads) is the standard for rendering crisp, readable text in Three.js via SDF glyph atlases. It supports full Unicode, kerning, RTL, and works with any PBR material. However, its geometry consists of **positioned quads per glyph**, not pixel-level fill data — you cannot directly extract particle positions from it. Canvas pixel sampling is definitively the correct approach for particle text. Use troika (available as `<Text>` in `@threlte/extras`) alongside particle text for any readable body text in the 3D scene.

### Making a full website particle-text while staying readable

The practical answer: **don't make everything particles**. Use a hybrid architecture:

- **Hero headings**: Full particle text with hover interaction (5,000–20,000 particles)
- **Section titles**: Particle text that assembles on scroll-into-view (2,000–5,000 each)
- **Body text**: Standard HTML for readability, accessibility, and SEO
- **Navigation**: HTML with particle overlay effects on hover

Layer a Three.js canvas (`pointer-events: none`) over the HTML content, synchronized via `IntersectionObserver` for viewport culling. `THREE.Points` handles **500K–1M+ particles at 60fps** since each particle is a single vertex in one draw call. Budget **under 200K total particles** for mid-range hardware. Create particle systems lazily as elements enter the viewport and dispose them when they leave.

**Key demos and resources**: Bruno Imbrizi's interactive-particles (GitHub, 1.1K stars) is the definitive implementation; Codrops "3D Typing Effects" tutorial by Ksenia Kondrashova covers the full canvas-sampling pipeline; Mamboleoo's CodePen "Text to particles" demonstrates spring physics; Three.js Journey covers GPGPU particle morphing.

---

## 3. Pretext is a text measurement library, not a renderer

**Pretext** (`@chenglou/pretext`) by Cheng Lou (React core team alumnus, Midjourney engineer) is a pure JavaScript library that computes text dimensions — height, line count, line widths — **without touching the DOM**. It has **43,500+ GitHub stars** since its March 27, 2026 release and is ~15KB gzipped with zero dependencies.

### What it actually does

Pretext replaces the browser's most expensive operation: layout reflow for text measurement. Its two-phase architecture is elegantly simple:

1. **`prepare(text, font)`** — One-time: normalizes whitespace, segments text via `Intl.Segmenter`, measures segments with Canvas `measureText()`, caches results (~19ms for 500 paragraphs)
2. **`layout(prepared, maxWidth, lineHeight)`** — Pure arithmetic over cached widths (~**0.09ms for 500 paragraphs**, roughly 500× faster than DOM measurement)

The advanced API exposes `layoutWithLines()` for per-line text/width/cursor data, `walkLineRanges()` for callback-per-line without string allocation, and `layoutNextLine()` — an iterator that accepts **different widths per line**, enabling text flowing around arbitrary shapes. Full Unicode support (CJK, Arabic, Hebrew, Thai, emoji, mixed bidi) with cross-browser consistency.

### What it does NOT do

Pretext does not render text. It does not use WebGL, WebGPU, or Canvas for drawing. It provides **measurement and line-breaking only** — actual rendering (DOM, Canvas 2D `fillText`, SVG, or WebGL) is your responsibility. It does not provide per-glyph x-position data (only segment-level widths), does not do sub-pixel rendering, and does not handle vertical text or decorations.

### Integration with Svelte and Three.js

Pretext is framework-agnostic. In Svelte 5:
```svelte
<script>
  import { prepare, layout } from '@chenglou/pretext';
  let text = $state('Hello world');
  let containerWidth = $state(400);
  const prepared = $derived(prepare(text, '16px Inter'));
  const result = $derived(layout(prepared, containerWidth, 24));
  // result.height, result.lineCount available reactively
</script>
```

For Three.js integration, use Pretext to compute line breaks, then render each line to an offscreen Canvas 2D with `fillText()`, and use the result as a `THREE.CanvasTexture`. Or use `layoutWithLines()` to get per-line text + width data and feed it into troika-three-text for 3D rendering with accurate wrapping. The `layoutNextLine()` API with variable widths enables **text flowing around 3D object silhouettes projected to 2D** — one community demo already shows text wrapping around a 3D gaussian splat in real time.

For particle effects specifically, Pretext's line-level data can supplement canvas sampling: use it to compute where each line of text sits, then sample pixels from a canvas rendering to get particle positions. This is a more controlled pipeline than rasterizing blindly. Note that SSR requires a `browser` check since Pretext needs the Canvas API.

### Current state and ecosystem

Production-usable with caveats (no vertical text, `system-ui` font unreliable on macOS, segment-level not glyph-level precision). Active development with regular commits as of April 2026. Notable integrations include **tldraw** (collaborative whiteboard), **Textura** (Pretext + Yoga for DOM-free flex layout), and **Weft SDK** (reactive 3D surface layout). Community demos include text flowing around animated shapes, chat bubble height prediction for streaming AI tokens, and a Knuth-Plass optimal line-breaking implementation built on top of Pretext.

---

## 4. Aquarium scene: 4K video behind physical glass with reactive lighting

### VideoTexture setup and critical settings

Create the HTML5 video element with `muted = true` and `playsInline = true` (both **required** for autoplay across browsers). The texture configuration that matters most: disable mipmap generation and use `LinearFilter` to avoid re-generating mipmaps every frame:

```javascript
const video = document.createElement('video');
video.src = '/aquarium-4k.mp4';
video.crossOrigin = 'anonymous';
video.loop = true;
video.muted = true;
video.playsInline = true;
video.play();

const videoTexture = new THREE.VideoTexture(video);
videoTexture.colorSpace = THREE.SRGBColorSpace;
videoTexture.minFilter = THREE.LinearFilter;
videoTexture.magFilter = THREE.LinearFilter;
videoTexture.generateMipmaps = false; // critical for performance
```

Three.js `VideoTexture` internally uses `requestVideoFrameCallback()` (since ~r149) to sync texture uploads with actual video frame decodes, avoiding redundant GPU uploads. A single 4K frame occupies **~33MB of VRAM** per upload. Use **H.264 MP4 at 30fps** for universal hardware-accelerated decode. If the aquarium plane doesn't fill most of the screen, **1080p or 1440p video is sufficient** — the glass material's roughness blurs the image slightly anyway.

### MeshPhysicalMaterial glass with transmission

The glass pane uses MeshPhysicalMaterial with `transmission: 1.0`. **An environment map is essential** — without it, glass reflections disappear and the material looks flat:

```javascript
const glassMaterial = new THREE.MeshPhysicalMaterial({
  transmission: 1.0,
  roughness: 0.05,           // very smooth with slight imperfection
  metalness: 0.0,
  thickness: 1.5,            // simulates thick aquarium glass refraction
  ior: 1.52,                 // standard glass index of refraction
  clearcoat: 0.1,
  attenuationColor: new THREE.Color(0x7fbfbf),  // blue-green light absorption
  attenuationDistance: 2.0,
  color: new THREE.Color(0xe8f4f0),             // slight tint
});
```

**Performance warning**: `transmission > 0` renders an additional framebuffer behind the transmissive object, which can **halve FPS**. Keep only one transmissive object. Multiple transmissive objects cannot see through each other (known Three.js limitation). In Threlte, use `<Environment>` from `@threlte/extras` to load an HDR environment map.

### Fake caustics via animated Voronoi shader

The most versatile approach injects caustic calculations into existing `MeshStandardMaterial` via `onBeforeCompile`, preserving PBR lighting while adding the effect. The shader uses **two layered Voronoi noise functions** at different scales, animated with time-offset cell centers, sharpened with `pow()`, and added to `totalEmissiveRadiance`:

```glsl
// Injected into fragment shader after emissivemap_fragment:
vec2 cUv = vWorldPosition.xz * 5.0;
float c1 = causticsVoronoi(cUv, uTime);
float c2 = causticsVoronoi(cUv * 1.5 + 3.0, uTime);
float caustic = pow(c1 * c2, 1.5) * 0.5;
totalEmissiveRadiance += vec3(0.3, 0.6, 1.0) * caustic;
```

The Voronoi function hashes cell coordinates and animates cell centers with `0.5 + 0.5 * sin(t * 0.4 + 6.2831 * hash)`. Two layers at different scales create the characteristic overlapping caustic patterns. An alternative approach uses `SpotLight.map` as a projected gobo texture with animated UV offsets for a simpler but less controllable result.

### RectAreaLight for ambient aquarium glow

Position a `THREE.RectAreaLight` at the glass surface facing outward into the room. **You must call `RectAreaLightUniformsLib.init()` before creating any RectAreaLight** or the lighting will render incorrectly. RectAreaLight does not cast shadows (Three.js limitation) and only works with `MeshStandardMaterial` / `MeshPhysicalMaterial`. Start with intensity **3–8** and blue-green color range (`0x4488bb` to `0x55aacc`).

### Dynamic color sampling from video

Sample the video's average color by drawing each frame to a **tiny 32×32 offscreen canvas** (GPU-accelerated downscale), reading pixel data, and lerping the RectAreaLight color toward the result. Sample every ~6 frames (~10Hz) rather than every frame — human perception of ambient color changes is slow. Always lerp toward the target color (`color.lerp(target, 0.1)`) to avoid flickering:

```javascript
class VideoColorSampler {
  constructor(video, sampleSize = 32) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.canvas.height = sampleSize;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    this.color = new THREE.Color();
    this.frameCount = 0;
  }

  update() {
    if (++this.frameCount % 6 !== 0) return this.color;
    this.ctx.drawImage(this.video, 0, 0, 32, 32);
    const data = this.ctx.getImageData(0, 0, 32, 32).data;
    let r = 0, g = 0, b = 0, count = 0;
    for (let i = 0; i < data.length; i += 16) { // sample every 4th pixel
      r += data[i]; g += data[i+1]; b += data[i+2]; count++;
    }
    this.color.lerp(new THREE.Color(r/count/255, g/count/255, b/count/255), 0.1);
    return this.color;
  }
}
```

Use `requestVideoFrameCallback()` for optimal timing — it fires only when a new video frame is decoded, avoiding redundant reads. The `willReadFrequently: true` canvas option tells the browser to optimize for frequent `getImageData()` calls. The npm package `fast-average-color` is an alternative drop-in solution.

**Key resources**: Maxime Heckel's caustics-in-webgl article; N8python/caustics on GitHub; Martin Renou's threejs-caustics; the Book of Shaders chapter 12 for Voronoi fundamentals; AquaFish (aquafish.ivystudio.cz) for a complete Three.js aquarium reference.

---

## 5. Multi-angle Kinect V2 point cloud capture and playback

### Kinect V2 capture with libfreenect2

The Kinect V2 depth sensor captures **512×424 pixels at 30fps** via Time-of-Flight, producing up to 217K points per frame. After background removal, a human figure typically yields **50K–150K valid foreground points**. The libfreenect2 `Registration` class handles the critical depth-to-3D conversion using factory-calibrated intrinsics stored on each device:

```cpp
registration->getPointXYZRGB(&undistorted, &registered, row, col, x, y, z, color);
// x, y, z in meters; color is packed BGRX
```

For multi-angle recording in Chromatic, **separate takes with a single repositioned Kinect are recommended** over multi-Kinect setups. Multi-Kinect systems require one USB 3.0 controller per device, one PC per Kinect (MS SDK limitation), careful IR interference management (place sensors ~90° apart), and extrinsic calibration via tools like MultiKinCalib. Since Chromatic swaps between angle views with particle transitions rather than fusing into a single model, the slight performance differences between takes are irrelevant. Mark camera positions at 0° (front), 45° (3/4), and 90° (side).

### Efficient storage for web delivery

Raw PLY sequences are enormous. At 100K points per frame with position + RGB (15 bytes/point), **one second of 30fps data is 45MB**. The processing pipeline should:

1. **Voxel downsample** to ~50K points using Open3D (`voxel_down_sample(0.01)` for 1cm voxels)
2. **Quantize** float32 positions to int16 (with bounding box scale factor): 6 bytes instead of 12 per point
3. **Sort by Morton/Z-order curve** before export for spatial correspondence between angles
4. **Pad/truncate** to an exact fixed point count across all frames and angles
5. **Pack into a single binary file** per angle (not individual PLYs — HTTP overhead kills performance)

**Draco compression** is the strongest recommendation for web delivery. Google's Draco achieves **5–7× compression on point clouds** — a 1.5MB frame compresses to ~50–100KB. Three.js has a built-in `DRACOLoader` that decodes in Web Workers automatically. Target: **~15–30MB per 10-second sequence per angle**, or ~45–90MB total for three angles.

### Scatter-regroup shader transition between angles

The visual signature of angle swapping is a three-phase transition: particles scatter from the source formation → float in chaos → converge into the target formation. This runs entirely on the GPU via a **custom ShaderMaterial** with three position attributes (`position`, `targetPosition`, `scatterPosition`) and a `uProgress` uniform animated from 0 to 1:

```glsl
// Vertex shader core logic:
float staggeredProgress = clamp((uProgress * 1.4) - (aRandom * 0.4), 0.0, 1.0);

vec3 pos;
if (staggeredProgress < 0.5) {
    float t = easeInOutCubic(staggeredProgress * 2.0);
    pos = mix(position, scatterPosition, t);
} else {
    float t = easeInOutCubic((staggeredProgress - 0.5) * 2.0);
    pos = mix(scatterPosition, targetPosition, t);
}

// Noise during scatter phase
float scatterAmount = sin(staggeredProgress * 3.14159);
pos += scatterAmount * 0.05 * vec3(
    sin(uTime * 2.0 + aRandom * 6.28),
    cos(uTime * 1.5 + aRandom * 4.0),
    sin(uTime * 1.8 + aRandom * 5.0)
);
```

The `aRandom` per-particle attribute **staggers the transition timing** so particles don't all move in lockstep — some scatter early while others linger. The `scatterPosition` attribute is precomputed random positions in a sphere. Trigger with GSAP: `gsap.to(material.uniforms.uProgress, { value: 1.0, duration: 1.5 })`. On completion, swap source ↔ target buffers and reset progress to 0.

### Particle correspondence between angles

When particles don't have natural 1:1 mappings between different recordings, three pragmatic solutions exist: **random index assignment** (simplest, creates chaotic but visually acceptable scatter), **spatial binning** (divide space into a 3D grid, match within bins for spatial coherence), or **Morton curve sorting** during preprocessing so that matching array indices already correspond to similar spatial regions. Optimal transport is theoretically ideal but computationally intractable for 50K+ points in real time.

### Performance at scale

A single `THREE.Points` object with 200K vertices is **one draw call** — desktop GPUs handle this trivially. Set `DynamicDrawUsage` on frequently updated buffers. Parse binary point cloud data in **Web Workers** using transferable `ArrayBuffer` objects to avoid blocking the main thread. For 3 angles × 300 frames × 50K points × 24 bytes, total memory is ~1.08GB — if that's too much, reduce playback to 15fps (150 frames) and interpolate between frames in the shader, or stream in chunks with double-buffering. Use `AdditiveBlending` with `depthWrite: false` to avoid expensive transparency sorting.

**Key resources**: libfreenect2 on GitHub; Open3D (open3d.org) for Python preprocessing; Google Draco on GitHub; Three.js Journey "Particles Morphing Shader" lesson; three-loader by pnext for massive point cloud LOD.

---

## Conclusion

Chromatic's five systems share a unifying technical pattern: **GPU-side particle manipulation via custom ShaderMaterial**. The chess animation, particle text, and point cloud transitions all use the same architecture — pre-allocated `BufferGeometry` with custom attributes, per-particle randomization for organic feel, and uniform-driven animation controlled by GSAP or Threlte's `useTask`. 

The aquarium scene introduces a different challenge — real-time material physics and video sampling — but follows the same principle of pushing computation to the GPU (caustic shaders, transmission rendering) while keeping CPU-side work minimal (tiny canvas color sampling at 10Hz). Pretext fills a specific niche as a layout measurement tool; it won't replace your rendering pipeline but can drive precise text positioning for canvas textures or troika-three-text integration.

The most impactful architectural decision across all systems is the **hybrid approach**: HTML for readable content with Three.js canvas overlay for effects; separate Kinect recordings rather than multi-sensor fusion; canvas pixel sampling for particles rather than trying to extract geometry from SDF text renderers. Each of these choices trades theoretical elegance for practical reliability in a production web context.