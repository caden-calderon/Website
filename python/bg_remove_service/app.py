from __future__ import annotations

import io
import os
from dataclasses import dataclass
from functools import lru_cache
import gc

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse, Response
from PIL import Image


@dataclass(frozen=True)
class ModelConfig:
	public_id: str
	huggingface_id: str
	description: str
	license_note: str


MODEL_REGISTRY: dict[str, ModelConfig] = {
	'birefnet': ModelConfig(
		public_id='birefnet',
		huggingface_id='ZhengPeng7/BiRefNet',
		description='BiRefNet via Hugging Face transformers',
		license_note='MIT',
	),
	'bria-rmbg-2.0': ModelConfig(
		public_id='bria-rmbg-2.0',
		huggingface_id='briaai/RMBG-2.0',
		description='BRIA RMBG 2.0 via Hugging Face transformers',
		license_note='CC BY-NC 4.0 / commercial license required for production use',
	),
}

IMAGE_SIZE = (1024, 1024)
MODEL_CACHE: dict[tuple[str, str], object] = {}

app = FastAPI(title='Chromatic Background Removal Service', version='0.1.0')


@app.get('/healthz')
def healthz() -> JSONResponse:
	return JSONResponse(
		{
			'status': 'ok',
			'models': sorted(MODEL_REGISTRY.keys()),
			'device': detect_device(),
		}
	)


@app.post('/remove-background')
async def remove_background(
	file: UploadFile = File(...),
	modelId: str = Form(...),
) -> Response:
	model_config = MODEL_REGISTRY.get(modelId)
	if model_config is None:
		raise HTTPException(status_code=400, detail=f'Unsupported model id: {modelId}')

	if not file.content_type or not file.content_type.startswith('image/'):
		raise HTTPException(status_code=415, detail='Only image uploads are supported')

	try:
		source_bytes = await file.read()
		source_image = Image.open(io.BytesIO(source_bytes)).convert('RGBA')
	except Exception as error:  # pragma: no cover - defensive request handling
		raise HTTPException(status_code=400, detail='Failed to decode uploaded image') from error

	try:
		mask = infer_alpha_mask(source_image, model_config)
	except Exception as error:  # pragma: no cover - runtime dependency / model failures
		raise HTTPException(status_code=500, detail=str(error)) from error

	output = source_image.copy()
	output.putalpha(mask)

	buffer = io.BytesIO()
	output.save(buffer, format='PNG')
	buffer.seek(0)

	return Response(
		content=buffer.getvalue(),
		media_type='image/png',
		headers={
			'x-chromatic-model-id': model_config.public_id,
			'x-chromatic-license-note': model_config.license_note,
		},
	)


def infer_alpha_mask(source_image: Image.Image, model_config: ModelConfig) -> Image.Image:
	from torchvision import transforms

	transform_image = transforms.Compose(
		[
			transforms.Resize(IMAGE_SIZE),
			transforms.ToTensor(),
			transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
		]
	)
	preferred_device = detect_device()

	try:
		return run_inference(source_image, model_config, preferred_device, transform_image)
	except RuntimeError as error:
		if preferred_device == 'cuda' and is_cuda_oom(error):
			clear_cached_model(model_config, 'cuda')
			clear_device_cache('cuda')
			try:
				return run_inference(source_image, model_config, 'cuda', transform_image)
			except RuntimeError as retry_error:
				if is_cuda_oom(retry_error):
					clear_cached_model(model_config, 'cuda')
					clear_device_cache('cuda')
					return run_inference(source_image, model_config, 'cpu', transform_image)
				raise
		raise


def run_inference(
	source_image: Image.Image,
	model_config: ModelConfig,
	device: str,
	transform_image,
) -> Image.Image:
	import torch
	from torchvision import transforms

	model = load_model(model_config, device)
	rgb_image = source_image.convert('RGB')
	model_dtype = get_model_dtype(model)
	input_tensor = transform_image(rgb_image).unsqueeze(0).to(device=device, dtype=model_dtype)

	try:
		with torch.inference_mode():
			output = model(input_tensor)

		mask_tensor = extract_mask_tensor(output)
		mask = transforms.ToPILImage()(mask_tensor)
		return mask.resize(source_image.size, Image.Resampling.BILINEAR)
	finally:
		del input_tensor
		if 'output' in locals():
			del output
		if 'mask_tensor' in locals():
			del mask_tensor
		clear_device_cache(device)


def load_model(model_config: ModelConfig, device: str):
	import torch
	from transformers import AutoModelForImageSegmentation

	cache_key = (model_config.public_id, device)
	cached = MODEL_CACHE.get(cache_key)
	if cached is not None:
		return cached

	if device == 'cuda':
		clear_other_cached_models(device)

	torch.set_float32_matmul_precision('high')

	kwargs = {
		'trust_remote_code': True,
	}

	token = os.getenv('HF_TOKEN')
	if token:
		kwargs['token'] = token

	model = (
		AutoModelForImageSegmentation.from_pretrained(model_config.huggingface_id, **kwargs)
		.eval()
		.to(device)
	)
	MODEL_CACHE[cache_key] = model
	return model


def extract_mask_tensor(output):
	import torch

	prediction = output[-1] if isinstance(output, (list, tuple)) else output
	if isinstance(prediction, (list, tuple)):
		prediction = prediction[-1]

	if not isinstance(prediction, torch.Tensor):
		raise RuntimeError(f'Unsupported segmentation output type: {type(prediction)!r}')

	if prediction.ndim == 3:
		prediction = prediction.unsqueeze(1)
	if prediction.ndim != 4 or prediction.shape[0] < 1:
		raise RuntimeError(f'Unexpected segmentation output shape: {tuple(prediction.shape)}')

	mask = prediction.detach().float().cpu()
	if mask.numel() == 0:
		raise RuntimeError('Segmentation output was empty')

	mask_min = float(mask.min())
	mask_max = float(mask.max())
	if mask_min < 0.0 or mask_max > 1.0:
		mask = mask.sigmoid()

	return mask[0].squeeze(0).clamp(0.0, 1.0)


def get_model_dtype(model) -> object:
	import torch

	try:
		return next(model.parameters()).dtype
	except StopIteration:
		return torch.float32


def is_cuda_oom(error: RuntimeError) -> bool:
	message = str(error).lower()
	return 'out of memory' in message and 'cuda' in message


def clear_device_cache(device: str) -> None:
	import torch

	if device != 'cuda' or not torch.cuda.is_available():
		return

	gc.collect()
	torch.cuda.empty_cache()


def clear_cached_model(model_config: ModelConfig, device: str) -> None:
	clear_cached_model_entry((model_config.public_id, device))


def clear_other_cached_models(device: str) -> None:
	for cache_key in [key for key in MODEL_CACHE if key[1] == device]:
		clear_cached_model_entry(cache_key)


def clear_cached_model_entry(cache_key: tuple[str, str]) -> None:
	model = MODEL_CACHE.pop(cache_key, None)
	if model is None:
		return

	try:
		if cache_key[1] == 'cuda':
			model.to('cpu')
	finally:
		del model


@lru_cache(maxsize=1)
def detect_device() -> str:
	import torch

	if torch.cuda.is_available():
		return 'cuda'
	if torch.backends.mps.is_available():
		return 'mps'
	return 'cpu'
