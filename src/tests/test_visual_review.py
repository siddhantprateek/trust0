import asyncio
import os
import tempfile

os.environ.setdefault("DATA_DIR", tempfile.mkdtemp(prefix="trust0-test-"))

from PIL import Image  # noqa: E402

from app.config import Settings  # noqa: E402
from app.db import init_db  # noqa: E402
from app.pipeline import visual_review  # noqa: E402
from app.schemas import Signals  # noqa: E402
from app.services import jev  # noqa: E402


def _frames(tmp_path, count):
    paths = []
    for i in range(count):
        path = tmp_path / f"frame{i}.png"
        Image.new("RGB", (320, 320), (i * 30, 80, 120)).save(path)
        paths.append(path)
    return paths


def _jev(monkeypatch, answers, model="jev-1.14.0"):
    """Jev configured, giving frame i P(ai-generated) answers[i] (None = a failed call). A dict maps frame names."""
    calls = []
    if isinstance(answers, list):
        answers = {f"frame{i}": p for i, p in enumerate(answers)}

    async def fake_choice(state, instructions, criteria, assets=None):
        calls.append(state)
        p = answers[state["image"]]
        return None if p is None else jev.Choice(choice="camera", probabilities={"camera": 1 - p, "ai-generated": p}, confidence=0.5)

    monkeypatch.setattr(visual_review.jev, "choice", fake_choice)
    # Frames are answered concurrently, so the fake keys its answers by frame rather than by call order
    monkeypatch.setattr(visual_review.jev, "image_asset", lambda path: (path.stem, {}))
    monkeypatch.setattr(type(visual_review.get_settings()), "has_jev", property(lambda self: True))
    monkeypatch.setattr(visual_review.get_settings(), "jev_visual_review", True)
    monkeypatch.setattr(visual_review.get_settings(), "jev_model", model)
    return calls


def _review(frames, key=None):
    async def go():
        await init_db()
        return await visual_review.ai_review(frames, key)

    return asyncio.run(go())


def test_jev_model_is_pinned():
    assert Settings.model_fields["jev_model"].default == "jev-1.14.0"


def test_review_keeps_each_frames_probability_and_the_model(monkeypatch, tmp_path):
    calls = _jev(monkeypatch, {"frame0": 0.1, "frame2": 0.2, "frame5": 0.3, "frame7": 0.6})
    review, notes = _review(_frames(tmp_path, 8))
    assert len(calls) == 4  # four evenly spaced frames of eight
    assert review == visual_review.Review(mean=0.3, frames=[0.1, 0.2, 0.3, 0.6], model="jev-1.14.0")
    assert notes == []


def test_failed_review_is_noted(monkeypatch, tmp_path):
    _jev(monkeypatch, [None, None])
    assert _review(_frames(tmp_path, 2)) == (None, [visual_review.UNAVAILABLE])


def test_no_note_without_a_key(monkeypatch, tmp_path):
    monkeypatch.setattr(type(visual_review.get_settings()), "has_jev", property(lambda self: False))
    assert _review(_frames(tmp_path, 2)) == (None, [])


def test_repeat_media_reuses_the_stored_review(monkeypatch, tmp_path):
    frames = _frames(tmp_path, 2)
    calls = _jev(monkeypatch, [0.7, 0.9])
    first, _ = _review(frames, "e1c3a5b7d9f00123")
    assert len(calls) == 2

    calls = _jev(monkeypatch, [])  # any call to Jev would fail the test
    again, notes = _review(frames, "e1c3a5b7d9f00123")
    assert again == first == visual_review.Review(0.8, [0.7, 0.9], "jev-1.14.0")
    assert notes == [] and calls == []

    # Another Jev version gives different answers, so its review isn't reused
    calls = _jev(monkeypatch, [0.4, 0.4], model="jev-1.15.0")
    other, _ = _review(frames, "e1c3a5b7d9f00123")
    assert other.mean == 0.4 and len(calls) == 2


def test_failed_reviews_and_blank_first_frames_are_not_cached(monkeypatch, tmp_path):
    frames = _frames(tmp_path, 1)
    _jev(monkeypatch, [None])
    _review(frames, "a1b2c3d4e5f60789")
    calls = _jev(monkeypatch, [0.5])
    assert _review(frames, "a1b2c3d4e5f60789")[0].mean == 0.5 and len(calls) == 1

    # A black opening frame hashes the same for unrelated videos
    _jev(monkeypatch, [0.9])
    _review(frames, "0000000000000000")
    calls = _jev(monkeypatch, [0.1])
    assert _review(frames, "0000000000000000")[0].mean == 0.1 and len(calls) == 1


def test_signals_serialise_the_raw_review():
    data = Signals(ai_review=0.3, ai_review_frames=[0.1, 0.5], ai_review_model="jev-1.14.0").model_dump(by_alias=True)
    assert (data["aiReview"], data["aiReviewFrames"], data["aiReviewModel"]) == (0.3, [0.1, 0.5], "jev-1.14.0")
    # Reports saved before these fields existed still load
    assert Signals.model_validate({"ai_review": 0.3}).ai_review_frames == []
