"""Keyframes, perceptual hashes and embedded provenance metadata.

Perceptual hashes survive re-encoding, resizing and light compression, so the same clip re-uploaded by
another account hashes close to the original. That is what links uploads across platforms and checks.
"""

import asyncio
import base64
import io
import shutil
import subprocess
from pathlib import Path

import imagehash
from PIL import Image

# Hamming distance (out of 64 bits) under which two frames count as the same picture
FRAME_MATCH_DISTANCE = 10

# IPTC digital source types that C2PA and most generators write for AI-made media
AI_SOURCE_MARKERS = (b"trainedAlgorithmicMedia", b"compositeWithTrainedAlgorithmicMedia", b"algorithmicMedia")
GENERATOR_MARKERS = (b"DALL-E", b"DALL\xc2\xb7E", b"Midjourney", b"Stable Diffusion", b"Adobe Firefly", b"Imagen", b"Sora", b"Runway", b"Kling")


def extract_keyframes(media_path: Path, media_type: str, out_dir: Path, count: int, duration: float | None) -> list[Path]:
    if media_type == "image":
        return [media_path]
    if not shutil.which("ffmpeg"):
        return []
    out_dir.mkdir(parents=True, exist_ok=True)
    duration = duration or _probe_duration(media_path) or 30.0
    fps = max(count / max(duration, 1.0), 0.02)
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-i", str(media_path), "-vf", f"fps={fps:.4f},scale=512:512:force_original_aspect_ratio=decrease", "-frames:v", str(count), str(out_dir / "frame_%02d.jpg")],
        check=False,
        timeout=180,
    )
    return sorted(out_dir.glob("frame_*.jpg"))


def _probe_duration(media_path: Path) -> float | None:
    if not shutil.which("ffprobe"):
        return None
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(media_path)],
        capture_output=True,
        text=True,
        timeout=30,
    )
    try:
        return float(result.stdout.strip())
    except ValueError:
        return None


def hash_frames(frames: list[Path]) -> list[str]:
    hashes = []
    for frame in frames:
        try:
            with Image.open(frame) as image:
                hashes.append(str(imagehash.phash(image.convert("RGB"))))
        except OSError:
            continue
    return hashes


def crop_hashes(frames: list[Path]) -> list[str]:
    """Hashes of square crops (start, middle, end) of each non-square frame.

    Search engines and platforms show square thumbnails cut from a picture. A crop hashes far from the full
    frame, so thumbnails are compared against these as well as the frames themselves.
    """
    hashes = []
    for frame in frames:
        try:
            with Image.open(frame) as image:
                image = image.convert("RGB")
                w, h = image.size
                side = min(w, h)
                if max(w, h) - side < side * 0.1:  # already close to square
                    continue
                for offset in (0, (max(w, h) - side) // 2, max(w, h) - side):
                    box = (offset, 0, offset + side, side) if w > h else (0, offset, side, offset + side)
                    hashes.append(str(imagehash.phash(image.crop(box))))
        except OSError:
            continue
    return hashes


def thumbnail_data_url(frame: Path, max_side: int = 480) -> str | None:
    """A small JPEG of a frame as a data URL, for showing the checked media in the studio."""
    try:
        with Image.open(frame) as image:
            image = image.convert("RGB")
            image.thumbnail((max_side, max_side))
            buffer = io.BytesIO()
            image.save(buffer, "JPEG", quality=72, optimize=True)
    except OSError:
        return None
    return "data:image/jpeg;base64," + base64.b64encode(buffer.getvalue()).decode()


def save_preview_image(path: Path, out: Path, max_side: int = 2048) -> None:
    """The checked image at viewing size as a JPEG, for the studio's full-size view."""
    with Image.open(path) as image:
        image = image.convert("RGB")
        image.thumbnail((max_side, max_side))
        image.save(out, "JPEG", quality=85, optimize=True)


def frame_similarity(ours: list[str], theirs: list[str]) -> float:
    """Share of our frames that appear (within FRAME_MATCH_DISTANCE) somewhere in theirs. Order-free, so
    trims, re-cuts and crops that keep most of the frames still match."""
    if not ours or not theirs:
        return 0.0
    their_hashes = [imagehash.hex_to_hash(h) for h in theirs]
    matched = 0
    for h in ours:
        ours_hash = imagehash.hex_to_hash(h)
        if min(ours_hash - other for other in their_hashes) <= FRAME_MATCH_DISTANCE:
            matched += 1
    return matched / len(ours)


def embedded_provenance(media_path: Path) -> str:
    """Scan file metadata for content credentials and AI-generation markers.

    Returns "ai-generated", "content-credentials" (a C2PA manifest with no AI marker), or "none".
    Most platforms strip metadata on upload, so "none" is common and is not evidence either way.
    """
    try:
        with media_path.open("rb") as f:
            head = f.read(8 * 1024 * 1024)
    except OSError:
        return "none"
    if any(marker in head for marker in AI_SOURCE_MARKERS) or any(marker in head for marker in GENERATOR_MARKERS):
        return "ai-generated"
    if b"c2pa" in head or b"jumb" in head:
        return "content-credentials"
    return "none"


async def fingerprint(media_path: Path, media_type: str, work_dir: Path, count: int, duration: float | None) -> tuple[list[Path], list[str]]:
    frames = await asyncio.to_thread(extract_keyframes, media_path, media_type, work_dir / "frames", count, duration)
    hashes = await asyncio.to_thread(hash_frames, frames)
    return frames, hashes
