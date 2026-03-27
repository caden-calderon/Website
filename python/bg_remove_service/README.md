# Background Removal Service

Local Python service for high-quality server-side background removal on Linux.

## Why this exists

Browser WebGPU support on Linux is not reliable enough for the heavy background-removal models you actually want to use. This service keeps that work off the browser and lets the Svelte app proxy requests through `/api/bg-remove`.

## Models

- `bria-rmbg-2.0`
- `birefnet`

Both are loaded through `transformers` with `AutoModelForImageSegmentation`.

## Setup

```bash
ai-env
pip install -r python/bg_remove_service/requirements.txt
export HF_TOKEN=...
uvicorn python.bg_remove_service.app:app --host 127.0.0.1 --port 9000
```

The requirements are pinned to the `torch 2.11.x` / `torchvision 0.26.x` line currently installed in the shared `ai-env`.
BiRefNet's remote model code also needs `einops` and `timm`, and those are included in the service requirements.

Then point SvelteKit at it:

```bash
export BG_REMOVAL_SERVICE_URL=http://127.0.0.1:9000
pnpm dev
```

Or let the repo manage both processes in one terminal:

```bash
pnpm dev:full
```

`pnpm dev:full` loads `.env` / `.env.local`, reuses an already-running local service when possible, otherwise starts the Python service via `ai-env`, waits for `/healthz`, then launches Vite. If `HF_TOKEN` is in `.env`, the managed Python service inherits it automatically.

## Notes

- `bria-rmbg-2.0` is gated and license-constrained. Make sure your Hugging Face token has access.
- GPU is preferred, but the service keeps CUDA residency conservative: it evicts other cached CUDA models before loading a new one, retries a CUDA request once after clearing VRAM on OOM, and only then falls back to CPU.
- The app route returns `503` when `BG_REMOVAL_SERVICE_URL` is not configured, so local browser-side removal still works without this service.
- `ai-env` is a shared environment. If unrelated packages in that env start fighting over `httpx` / `anyio`, move this service into a dedicated venv before treating it as deployment-ready.
- Boot and `/healthz` have been verified locally. The first real `/remove-background` request will still need to download the selected model weights if they are not already cached.
- BiRefNet was exercised successfully once locally after model download, so the first-run delay is now mostly a cache warmup concern rather than a missing-package issue.
