"""trust0's own models over the API: the catalog, API key management, and inference (t0-vision today).

Inference needs an API key, sent as "Authorization: Bearer t0_...". Keys are created in the studio
(Settings → API keys); only a SHA-256 hash is stored, so a lost key can't be shown again, only replaced.
"""

import asyncio
import hashlib
import io
import secrets

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from PIL import Image, UnidentifiedImageError

from app.config import get_settings
from app.db import ApiKeyRow, add_api_key, list_api_keys, remove_api_key, use_api_key
from app.schemas import ApiKey, CreateApiKey, CreatedApiKey, ModelInfo, VisionPrediction
from app.services import local_models

router = APIRouter(prefix="/v1")

KEY_PREFIX = "t0_"
MAX_IMAGE_MB = 20

_bearer = HTTPBearer(auto_error=False)


def _hash(key: str) -> str:
    return hashlib.sha256(key.encode()).hexdigest()


async def require_api_key(credentials: HTTPAuthorizationCredentials | None = Depends(_bearer)) -> ApiKeyRow:
    unauthorized = HTTPException(
        status.HTTP_401_UNAUTHORIZED,
        "Send a trust0 API key as 'Authorization: Bearer t0_...'. Create one in the studio under Settings → API keys.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None or not credentials.credentials.startswith(KEY_PREFIX):
        raise unauthorized
    row = await use_api_key(_hash(credentials.credentials))
    if row is None:
        raise unauthorized
    return row


# --- Catalog -------------------------------------------------------------------------------------


def _catalog() -> list[ModelInfo]:
    """Our models, released or planned. Add an entry here when a new one ships."""
    return [
        ModelInfo(
            id="t0-vision",
            name="t0-vision",
            task="AI-generated image detection",
            description=(
                "Tells real photos from AI-generated images. Fine-tuned on ~400 GB of real and generated images "
                "(GenImage, FLUX, Midjourney v6, FFHQ), re-encoded the way social platforms compress them, so it holds "
                "up on screenshots and reposts rather than only on pristine files."
            ),
            inputs=["image/jpeg", "image/png", "image/webp"],
            labels=["artificial", "real"],
            endpoint="/v1/models/predict",
            status="available" if get_settings().has_local_detector else "offline",
            notes=[
                f"{MAX_IMAGE_MB} MB max file size",
                "Runs on this server's own GPU — no third-party API calls",
                "Send model and file as multipart form fields",
            ],
        ),
        ModelInfo(
            id="t0-video",
            name="t0-video",
            task="AI-generated video detection",
            description="Frame and motion-level detection of generated or face-swapped video.",
            inputs=["video/mp4", "video/webm"],
            labels=["artificial", "real"],
            endpoint=None,
            status="coming-soon",
            notes=["Training on GenImage, FLUX and Midjourney v6 video clips"],
        ),
    ]


@router.get("/models", response_model=list[ModelInfo], tags=["models"])
async def get_models() -> list[ModelInfo]:
    return _catalog()


@router.get("/models/{model_id}", response_model=ModelInfo, tags=["models"])
async def get_model(model_id: str) -> ModelInfo:
    for model in _catalog():
        if model.id == model_id:
            return model
    raise HTTPException(status.HTTP_404_NOT_FOUND, "Model not found.")


# --- Inference -----------------------------------------------------------------------------------

# Models with local inference wired up; add a model here once it has its own predict function
_PREDICTORS = {"t0-vision"}


@router.post("/models/predict", response_model=VisionPrediction, tags=["models"])
async def predict(
    model: str = Form(..., description="Model id, e.g. \"t0-vision\". See GET /v1/models for the catalog."),
    file: UploadFile = File(...),
    _: ApiKeyRow = Depends(require_api_key),
) -> VisionPrediction:
    """Run one of trust0's models. Send `model` and `file` as multipart form fields."""
    if model not in _PREDICTORS:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Unknown model '{model}'. See GET /v1/models for the catalog.")
    if not get_settings().has_local_detector:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, f"{model} isn't loaded on this server.")

    data = await file.read(MAX_IMAGE_MB * 1024 * 1024 + 1)
    if len(data) > MAX_IMAGE_MB * 1024 * 1024:
        raise HTTPException(status.HTTP_413_CONTENT_TOO_LARGE, f"Images are limited to {MAX_IMAGE_MB} MB.")
    try:
        image = Image.open(io.BytesIO(data))
        image.load()
    except (UnidentifiedImageError, OSError) as exc:
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "Send a JPEG, PNG or WebP image.") from exc

    scores, ai_generated = await asyncio.to_thread(local_models.classify_image, image)
    return VisionPrediction(model=model, label=max(scores, key=scores.get), ai_generated=ai_generated, scores=scores)


# --- API keys (studio) ---------------------------------------------------------------------------


@router.get("/api-keys", response_model=list[ApiKey], tags=["studio"])
async def get_api_keys() -> list:
    return await list_api_keys()


@router.post("/api-keys", response_model=CreatedApiKey, status_code=status.HTTP_201_CREATED, tags=["studio"])
async def create_api_key(body: CreateApiKey) -> CreatedApiKey:
    key = KEY_PREFIX + secrets.token_urlsafe(32)
    row = await add_api_key(
        ApiKeyRow(id=f"key_{secrets.token_hex(8)}", name=body.name.strip(), prefix=key[:10], key_hash=_hash(key))
    )
    return CreatedApiKey(**ApiKey.model_validate(row).model_dump(), key=key)


@router.delete("/api-keys/{key_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["studio"])
async def delete_api_key(key_id: str) -> None:
    if not await remove_api_key(key_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "API key not found.")
