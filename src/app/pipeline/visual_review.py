"""A second opinion on AI-generated media: Jev looks at a few keyframes and says how each was made.

AI-image detectors misfire on footage that looks unlike their training photos (soft landscapes, studio sets,
heavily graded commercials). Jev's image model judges the frames independently, so the verdict can require two
signals that agree before calling media AI-generated (pipeline/scoring.py). It's a preview model: it missed 6 of 20
AI images in our sample, so it's never trusted on its own, only as agreement or disagreement with the detectors.
Measured in docs/jev.md.
"""

import asyncio
import logging
from pathlib import Path

from app.config import get_settings
from app.services import jev

log = logging.getLogger(__name__)

FRAMES = 4

INSTRUCTIONS = "How was `image` made?"
# A three-way choice did far better than a yes/no "is this AI?" question, which put many real photos above 0.5
ORIGINS = {
    "camera": "Captured by a real camera (photo or video frame), even if compressed, filtered, colour graded, cropped, "
    "or with text, captions, logos or a UI frame laid on top",
    "ai-generated": "Generated or substantially altered by an AI image or video generator (diffusion or GAN models "
    "such as Midjourney, Stable Diffusion, FLUX, DALL-E, Sora, Veo)",
    "graphics": "Made by people with design or 3D tools rather than a camera or an AI generator: illustration, 3D "
    "render, animation, motion graphics, screenshot of an interface",
}


async def ai_review(frames: list[Path]) -> float | None:
    """Mean probability Jev gives "ai-generated" across up to FRAMES evenly spaced frames. None when unavailable."""
    settings = get_settings()
    if not frames or not settings.has_jev or not settings.jev_visual_review:
        return None
    picks = [frames[round(i * (len(frames) - 1) / (FRAMES - 1))] for i in range(FRAMES)] if len(frames) > FRAMES else frames
    results = await asyncio.gather(*(_frame(frame) for frame in dict.fromkeys(picks)))
    scores = [r for r in results if r is not None]
    if not scores:
        return None
    return round(sum(scores) / len(scores), 4)


async def _frame(frame: Path) -> float | None:
    # One frame per request, the way it was measured: a shared state of several frames is untested
    try:
        ref, asset = await asyncio.to_thread(jev.image_asset, frame)
    except OSError:
        return None
    answer = await jev.choice({"image": ref}, INSTRUCTIONS, ORIGINS, assets={ref: asset})
    if answer is None:
        return None
    return answer.probabilities.get("ai-generated", 0.0)
