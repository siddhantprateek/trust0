"""A second opinion on AI-generated media: Jev looks at a few keyframes and says how each was made.

AI-image detectors misfire on footage that looks unlike their training photos (soft landscapes, studio sets,
heavily graded commercials). Jev's image model judges the frames independently, so the verdict can require two
signals that agree before calling media AI-generated (pipeline/scoring.py). Reviews are stored by the first
keyframe's perceptual hash, so re-uploads of the same media don't ask Jev again. It's a preview model: it missed 6 of 20
AI images in our sample, so it's never trusted on its own, only as agreement or disagreement with the detectors.
Measured in docs/jev.md.
"""

import asyncio
import logging
from dataclasses import dataclass
from pathlib import Path

from app.config import get_settings
from app.db import VisualReviewRow, load_visual_review, save_visual_review
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


@dataclass
class Review:
    # Mean P(ai-generated) across the frames that got an answer: the number the verdict uses
    mean: float
    # P(ai-generated) for each answered frame, in frame order, kept so REVIEW_AGREES can be recalibrated later
    frames: list[float]
    model: str


UNAVAILABLE = "Jev visual review unavailable; verdict used detectors only"


async def ai_review(frames: list[Path], key: str | None = None) -> tuple[Review | None, list[str]]:
    """Jev's review of up to FRAMES evenly spaced frames, plus a note when Jev was asked and didn't answer.

    `key` is the first keyframe's perceptual hash: a re-upload of the same media reuses the stored review instead of
    asking Jev again. The review is None when Jev is off or unavailable.
    """
    settings = get_settings()
    if not frames or not settings.has_jev or not settings.jev_visual_review:
        return None, []
    key = key if key and _distinctive(key) else None
    if key and (row := await load_visual_review(key, settings.jev_model)):
        return Review(row.mean, list(row.frames), row.model), []
    picks = [frames[round(i * (len(frames) - 1) / (FRAMES - 1))] for i in range(FRAMES)] if len(frames) > FRAMES else frames
    results = await asyncio.gather(*(_frame(frame) for frame in dict.fromkeys(picks)))
    scores = [round(r, 4) for r in results if r is not None]
    if not scores:
        log.warning("Jev visual review got no answer for %d frames", len(results))
        return None, [UNAVAILABLE]
    review = Review(round(sum(scores) / len(scores), 4), scores, settings.jev_model)
    if key:
        await save_visual_review(VisualReviewRow(frame_hash=key, model=review.model, mean=review.mean, frames=review.frames))
    return review, []


def _distinctive(frame_hash: str) -> bool:
    # A black or flat opening frame hashes to (nearly) all zeros, the same for unrelated videos, so it can't be a key
    try:
        return bin(int(frame_hash, 16)).count("1") >= 4
    except ValueError:
        return False


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
