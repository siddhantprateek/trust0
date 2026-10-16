"""Jev, TypeSafe's System One model: typed, calibrated answers to narrow questions about a state we supply.

We use it for the small decisions where uncertainty has to be visible: which lean an outlet's raters give it, which
search results are about the story, and a second opinion on whether keyframes came from a camera. It judges only
what's in the state; it doesn't search. https://docs.typesafe.ai/api

Images go through TypeSafe's preview image models (Jev 1.13+, the `TypeSafe-Danger-Zone-Images` header). They are
listed once in `assets` and referenced by a random id inside the state. https://docs.typesafe.ai/images
"""

import asyncio
import base64
import io
import logging
import uuid
from dataclasses import dataclass
from pathlib import Path

import httpx
from PIL import Image

from app.config import get_settings

log = logging.getLogger(__name__)

API_URL = "https://api.typesafe.ai/v1/systemone"
# Rate limited and temporarily overloaded: the API asks for a retry with backoff
RETRY_STATUSES = {429, 529}
ATTEMPTS = 3
# The image models take 280-1568 px per side, PNG or JPEG, no EXIF rotation applied
MIN_SIDE, MAX_SIDE = 280, 1568


@dataclass
class Choice:
    choice: str
    probabilities: dict[str, float]
    # 1 when all probability sits on one option, 0 when it's spread evenly (not the chance the choice is right)
    confidence: float


async def ask(state, questions: dict[str, dict], assets: dict[str, dict] | None = None) -> dict[str, dict] | None:
    """Raw answers by question name for one request. None when Jev isn't configured or the call fails."""
    settings = get_settings()
    if not settings.has_jev:
        return None
    body: dict = {"state": state, "model": settings.jev_model, "questions": questions}
    headers = {"Authorization": f"Bearer {settings.typesafe_api_key}"}
    if assets:
        body["assets"] = assets
        headers["TypeSafe-Danger-Zone-Images"] = "true"

    response = None
    async with httpx.AsyncClient() as client:
        for attempt in range(ATTEMPTS):
            try:
                response = await client.post(API_URL, json=body, headers=headers, timeout=60)
            except httpx.HTTPError as exc:
                log.warning("Jev request failed: %s", exc.__class__.__name__)
                response = None
            if response is not None and response.status_code not in RETRY_STATUSES:
                break
            if attempt < ATTEMPTS - 1:
                await asyncio.sleep(0.5 * 2**attempt)
    if response is None or response.is_error:
        if response is not None:
            log.warning("Jev returned %s: %s", response.status_code, response.text[:300])
        return None
    try:
        return response.json()["answers"]
    except (ValueError, KeyError):
        log.warning("Unexpected Jev response: %s", response.text[:300])
        return None


async def choice(state, instructions, criteria: dict, assets: dict[str, dict] | None = None) -> Choice | None:
    """One choice question about the state."""
    answers = await ask(state, {"answer": {"type": "choice", "instructions": instructions, "criteria": criteria}}, assets)
    return _choice(answers.get("answer")) if answers else None


async def nouls(state, questions: dict[str, str]) -> dict[str, float] | None:
    """Probability (0-1) that each statement holds, by question name, all in one request."""
    if not questions:
        return None
    answers = await ask(state, {name: {"type": "noul", "instructions": text} for name, text in questions.items()})
    if answers is None:
        return None
    return {name: float(a["noul"]) for name, a in answers.items() if name in questions and isinstance(a, dict) and "noul" in a}


def _choice(answer) -> Choice | None:
    try:
        return Choice(
            choice=answer["choice"],
            probabilities={k: float(v) for k, v in answer["probabilities"].items()},
            confidence=float(answer["confidence"]),
        )
    except (KeyError, TypeError, ValueError, AttributeError):
        return None


def image_asset(path: Path) -> tuple[str, dict]:
    """A reference id and the `assets` entry for an image, resized into the range the image models accept."""
    with Image.open(path) as source:
        image = source.convert("RGB")
    width, height = image.size
    scale = min(1.0, MAX_SIDE / max(width, height))
    if min(width, height) * scale < MIN_SIDE:
        scale = MIN_SIDE / min(width, height)
    if scale != 1.0:
        image = image.resize((max(MIN_SIDE, round(width * scale)), max(MIN_SIDE, round(height * scale))))
    buffer = io.BytesIO()
    image.save(buffer, "JPEG", quality=92)
    ref = f"img-{uuid.uuid4()}"
    return ref, {"type": "image", "format": "jpg", "data_base64": base64.b64encode(buffer.getvalue()).decode()}
