"""Models that run on this machine: t0-vision (AI-generated image detection) and Whisper (speech-to-text).

Both need the optional [local] dependencies (torch, transformers). Each loads on first use and stays in memory.
Inference holds one lock, so concurrent checks take turns on the GPU instead of running it out of memory.
"""

import asyncio
import logging
import shutil
import subprocess
import threading
from functools import cache
from pathlib import Path

from PIL import Image

from app.config import get_settings

log = logging.getLogger(__name__)

# Frames sent to the detector per check; spread across the clip
MAX_FRAMES = 8
# Words that mark a classifier label as "AI-generated" (t0-vision's labels are "artificial" and "real")
AI_WORDS = ("artificial", "fake", "generated", "synthetic", "ai")
SAMPLE_RATE = 16000

_gpu = threading.Lock()


def _device() -> str:
    import torch

    setting = get_settings().local_device
    if setting == "auto":
        return "cuda" if torch.cuda.is_available() else "cpu"
    return setting


# --- t0-vision -----------------------------------------------------------------------------------


@cache
def _detector():
    from transformers import pipeline

    classifier = pipeline("image-classification", model=get_settings().t0_vision_model_path, device=_device())
    labels = classifier.model.config.id2label.values()
    ai_labels = {name for name in labels if any(word in name.lower().replace("-", "_").split("_") for word in AI_WORDS)}
    if len(ai_labels) != 1:
        raise ValueError(f"Can't tell which t0-vision label means AI-generated: {list(labels)}")
    log.info("t0-vision loaded on %s (AI label: %s)", classifier.device, next(iter(ai_labels)))
    return classifier, ai_labels


async def ai_generated_score(frames: list[Path]) -> float | None:
    """Mean probability that the frames are AI-generated, or None when t0-vision isn't set up or fails."""
    if not frames or not get_settings().has_local_detector:
        return None
    step = max(len(frames) // MAX_FRAMES, 1)
    try:
        return await asyncio.to_thread(_score_frames, frames[::step][:MAX_FRAMES])
    except Exception:
        log.exception("t0-vision failed")
        return None


def _score_frames(frames: list[Path]) -> float | None:
    classifier, ai_labels = _detector()
    images = []
    for frame in frames:
        try:
            with Image.open(frame) as image:
                images.append(image.convert("RGB"))
        except OSError:
            continue
    if not images:
        return None
    with _gpu:
        outputs = classifier(images, top_k=None, batch_size=MAX_FRAMES)
    scores = [sum(o["score"] for o in out if o["label"] in ai_labels) for out in outputs]
    # Mean rather than max: across 8 frames, max would turn a single false alarm into a "likely AI" verdict
    return sum(scores) / len(scores)


# --- Whisper -------------------------------------------------------------------------------------


@cache
def _transcriber():
    import torch
    from transformers import pipeline

    device = _device()
    asr = pipeline(
        "automatic-speech-recognition",
        model=get_settings().whisper_model,
        device=device,
        dtype=torch.float16 if device == "cuda" else torch.float32,
    )
    log.info("Whisper (%s) loaded on %s", get_settings().whisper_model, asr.device)
    return asr


async def transcribe(media_path: Path) -> str:
    """Speech in a video as text, in the language spoken. Empty when there's no speech or Whisper isn't set up."""
    if not get_settings().has_transcriber or not shutil.which("ffmpeg"):
        return ""
    try:
        return await asyncio.to_thread(_transcribe, media_path)
    except Exception:
        log.exception("Speech-to-text failed")
        return ""


def _transcribe(media_path: Path) -> str:
    import numpy as np

    # 16 kHz mono float samples, the input Whisper expects. No audio stream gives no samples
    result = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(media_path), "-vn", "-ac", "1", "-ar", str(SAMPLE_RATE), "-f", "f32le", "-"],
        capture_output=True,
        timeout=300,
    )
    audio = np.frombuffer(result.stdout, dtype=np.float32)
    if len(audio) < SAMPLE_RATE:  # under a second
        return ""
    asr = _transcriber()
    with _gpu:
        # Timestamps switch Whisper to its own long-form decoding for audio over 30 s
        output = asr({"raw": audio, "sampling_rate": SAMPLE_RATE}, return_timestamps=True, generate_kwargs={"task": "transcribe"})
    return output["text"].strip()[:15000]


def warm_up() -> None:
    """Load the configured models up front, so the first check doesn't wait for them."""
    settings = get_settings()
    for enabled, load, name in ((settings.has_local_detector, _detector, "t0-vision"), (settings.has_transcriber, _transcriber, "Whisper")):
        if enabled:
            try:
                load()
            except Exception:
                log.exception("Could not load %s", name)
