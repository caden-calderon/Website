from __future__ import annotations

import io
import os
from dataclasses import dataclass
from functools import lru_cache

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
	import torch
	from torchvision import transforms

	model = load_model(model_config)
	device = detect_device()
	transform_image = transforms.Compose(
		[
			transforms.Resize(IMAGE_SIZE),
			transforms.ToTensor(),
			transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
		]
	)

	rgb_image = source_image.convert('RGB')
	input_tensor = transform_image(rgb_image).unsqueeze(0).to(device)

	with torch.no_grad():
		prediction = model(input_tensor)[-1].sigmoid().cpu()

	mask_tensor = prediction[0].squeeze()
	mask = transforms.ToPILImage()(mask_tensor)
	return mask.resize(source_image.size)


@lru_cache(maxsize=None)
def load_model(model_config: ModelConfig):
	import torch
	from transformers import AutoModelForImageSegmentation

	torch.set_float32_matmul_precision('high')
	device = detect_device()

	kwargs = {
		'trust_remote_code': True,
	}

	token = os.getenv('HF_TOKEN')
	if token:
		kwargs['token'] = token

	return (
		AutoModelForImageSegmentation.from_pretrained(model_config.huggingface_id, **kwargs)
		.eval()
		.to(device)
	)


@lru_cache(maxsize=1)
def detect_device() -> str:
	import torch

	if torch.cuda.is_available():
		return 'cuda'
	if torch.backends.mps.is_available():
		return 'mps'
	return 'cpu'
