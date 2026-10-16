"""Runs a check end to end: ingest -> fingerprint -> provenance + AI detection -> fact check -> score."""

import asyncio
import logging
import shutil
from dataclasses import dataclass
from pathlib import Path
from typing import Literal
from urllib.parse import urlsplit

import httpx

from app.config import get_settings
from app.db import load_report, save_report
from app.pipeline import coverage, factcheck, ingest, media, provenance, scoring, visual_review
from app.pipeline.progress import Progress
from app.schemas import Preview, ReportSection, Signals
from app.services import external, local_models

log = logging.getLogger(__name__)

# Kinds where the submitted text is the subject, even when a page URL comes along for context
TEXT_SUBJECT_KINDS = {"ai-response", "selection", "message", "text"}

_slots: asyncio.Semaphore | None = None


@dataclass
class Job:
    report_id: str
    kind: str
    url: str | None = None
    text: str | None = None
    title: str | None = None
    media_url: str | None = None
    upload_path: Path | None = None
    upload_name: str | None = None
    upload_type: str | None = None


async def run(job: Job) -> None:
    global _slots
    _slots = _slots or asyncio.Semaphore(get_settings().max_concurrent_checks)
    progress = Progress(job.report_id)
    try:
        # Inside the try so a check cancelled while still queued for a slot also ends up cancelled
        async with _slots:
            await _run(job, progress)
    except asyncio.CancelledError:
        await _end(job.report_id, progress, "cancelled", None)
        raise
    except Exception as exc:  # a failed check must still end in a terminal state
        log.exception("Check %s failed", job.report_id)
        await _end(job.report_id, progress, "failed", f"{exc.__class__.__name__}: {exc}"[:500])
    finally:
        shutil.rmtree(get_settings().media_dir / job.report_id, ignore_errors=True)


async def _end(report_id: str, progress: Progress, status: Literal["failed", "cancelled"], error: str | None) -> None:
    report = await load_report(report_id)
    if report is None or report.status != "analyzing":
        return
    progress.end_running(status)
    progress.apply(report)
    report.status = status
    report.error = error
    await save_report(report)


async def _run(job: Job, progress: Progress) -> None:
    settings = get_settings()
    report_dir = settings.media_dir / job.report_id
    report_dir.mkdir(parents=True, exist_ok=True)

    async with httpx.AsyncClient(headers={"User-Agent": ingest.USER_AGENT}) as client:
        await progress.start("ingest")
        item = await _ingest(job, report_dir, client)
        await progress.complete("ingest", _describe(item))

        frames: list[Path] = []
        hashes: list[str] = []
        crops: list[str] = []
        embedded = None
        if item.media_path and item.media_type:
            await progress.start("media", "Extracting keyframes")
            frames, hashes = await media.fingerprint(item.media_path, item.media_type, report_dir, settings.keyframes, item.duration)
            crops = await asyncio.to_thread(media.crop_hashes, frames)
            embedded = await asyncio.to_thread(media.embedded_provenance, item.media_path)
            transcribed = False
            if item.media_type == "video" and not item.transcript:
                # No captions on the platform: transcribe the audio so spoken claims get checked too
                if settings.has_transcriber:
                    await progress.note("media", f"{_plural(len(frames), 'keyframe')} · transcribing audio")
                    item.transcript = await local_models.transcribe(item.media_path)
                    transcribed = True
                else:
                    item.notes.append("Speech-to-text (install the [local] extra)")
            await progress.complete("media", " · ".join(filter(None, [_plural(len(frames), "keyframe"), "audio transcribed" if transcribed else "", "C2PA credentials found" if embedded and embedded != "none" else ""])))
        else:
            await progress.skip("media", "No image or video to fingerprint")

        trace, (detectors, review, review_skipped) = await asyncio.gather(
            _trace(job, item, hashes, crops, client, progress), _detect_ai(frames, client, progress, hashes[0] if hashes else None)
        )
        ai_review = review.mean if review else None
        ai_probability = sum(detectors.values()) / len(detectors) if detectors else None

        await progress.start("factcheck", "Picking the claims that matter")
        facts = await factcheck.check(item, trace, client)
        await progress.complete("factcheck", f"{_plural(len(facts.claims), 'claim')} checked" if facts.claims else "No checkable claims")

        await progress.start("coverage", "Searching news outlets")
        # Needs the fact check's news query and sources; also tags those sources with their outlet's lean
        story, coverage_skipped = await coverage.build(item, facts, client)
        if story is None:
            await progress.skip("coverage", "Not a news story")
        else:
            await progress.complete("coverage", f"{_plural(len(story.sources), 'outlet')} covering it" if story.sources else "No other outlets found")
        await provenance.remember(item, hashes, job.report_id)

    await progress.start("score")

    # The media is the subject for posts, videos, uploads and images picked by URL; an article's header image is incidental
    has_media = bool(hashes) and bool(job.media_url or job.upload_path or item.platform not in ("article", "text"))
    # The review's note is about the media verdict, so it's only worth showing when the media is the subject
    skipped = item.notes + trace.skipped + (review_skipped if has_media else []) + facts.skipped + coverage_skipped
    if has_media and not settings.has_ai_detector:
        skipped.append("AI-generation detection (no t0-vision model or Hive key)")

    assessment = scoring.assess(
        kind=job.kind,
        has_media=has_media,
        ai_probability=ai_probability,
        embedded=embedded,
        originality=trace.originality,
        visual_matches=trace.visual_matches,
        has_origin=bool(trace.origin_url),
        modifications=trace.modifications,
        claims=facts.claims,
        detectors=detectors,
        ai_review=ai_review,
    )

    # A post with both a caption and a picture or video gets a verdict for each; one can be true while the other isn't
    sections: list[ReportSection] = []
    if has_media and (item.text.strip() or item.transcript.strip()):
        media_part = scoring.assess_media(
            ai_probability=ai_probability,
            embedded=embedded,
            originality=trace.originality,
            visual_matches=trace.visual_matches,
            modifications=trace.modifications,
            has_origin=bool(trace.origin_url),
            detectors=detectors,
            ai_review=ai_review,
        )
        text_part = scoring.assess_text(facts.claims)
        sections = [
            ReportSection(kind="text", title="Speech & caption" if item.media_type == "video" else "Post text", verdict=text_part.verdict, trust_score=text_part.trust_score, summary=facts.summary, checks=text_part.checks),
            ReportSection(kind="media", title="Video" if item.media_type == "video" else "Image", verdict=media_part.verdict, trust_score=media_part.trust_score, summary=trace.summary, checks=media_part.checks),
        ]

    kept = await asyncio.to_thread(_keep_media, item, job.report_id) if settings.keep_media else None

    report = await load_report(job.report_id)
    if report is None:
        return
    report.title = (job.title or item.title or item.text[:80] or report.title).strip()
    report.status = "complete"
    report.verdict = assessment.verdict
    report.trust_score = assessment.trust_score
    report.checks = assessment.checks
    # Only the submitted post on its own isn't a path worth showing
    report.spread = trace.spread if (has_media or len(trace.spread) > 1) else []
    report.claims = facts.claims
    report.coverage = story
    report.summary = " ".join(filter(None, [facts.summary, trace.summary if has_media or trace.origin_url else ""]))
    report.sections = sections
    report.preview = await _preview(item, frames, job.report_id, kept)
    report.signals = Signals(
        ai_generated_probability=ai_probability,
        ai_detectors=detectors,
        ai_review=ai_review,
        ai_review_frames=review.frames if review else [],
        ai_review_model=review.model if review else None,
        c2pa=embedded,
        originality=trace.originality,
        origin_url=trace.origin_url,
        skipped=skipped,
    )
    await progress.complete("score", f"{assessment.verdict.replace('-', ' ').capitalize()} · trust {assessment.trust_score}", save=False)
    progress.apply(report)
    await save_report(report)


async def _preview(item: ingest.Ingested, frames: list[Path], report_id: str, kept: str | None) -> Preview:
    """What was checked, kept on the report because the downloaded media is deleted when the check ends."""
    image = await asyncio.to_thread(media.thumbnail_data_url, frames[0]) if frames else None
    strip: list[str] = []
    if item.media_type == "video" and len(frames) > 1:
        # Evenly spaced keyframes, enough to see what happens in the clip
        picks = [frames[round(i * (len(frames) - 1) / 5)] for i in range(6)] if len(frames) > 6 else frames
        strip = [url for url in [await asyncio.to_thread(media.thumbnail_data_url, f, 240) for f in dict.fromkeys(picks)] if url]
    if item.media_type in ("image", "video"):
        kind = item.media_type
    elif item.platform == "text" or not item.url:
        kind = "text"
    else:
        kind = "link"
    return Preview(
        kind=kind,
        image=image,
        remote_image=item.thumbnail_url,
        media_path=f"/v1/reports/{report_id}/media" if kept else None,
        media_type=kept,
        frames=strip,
        title=item.title[:200],
        site=(urlsplit(item.url).hostname or "").removeprefix("www.") if item.url else "",
        text=(item.text or item.transcript)[:1200],
        account=item.account,
        account_url=item.account_url,
        posted_at=item.posted_at,
        duration=item.duration,
        linked_urls=item.linked_urls[:5],
    )


def _keep_media(item: ingest.Ingested, report_id: str) -> str | None:
    """Copy the checked image or video out of the work folder (deleted after the check) for the studio to show.

    Returns the media type kept, or None. Images are re-encoded to a bounded JPEG; videos are already small.
    """
    if not item.media_path or not item.media_type or not item.media_path.exists():
        return None
    out_dir = get_settings().previews_dir
    out_dir.mkdir(parents=True, exist_ok=True)
    try:
        if item.media_type == "image":
            media.save_preview_image(item.media_path, out_dir / f"{report_id}.jpg")
        else:
            shutil.copyfile(item.media_path, out_dir / f"{report_id}{item.media_path.suffix.lower()[:8] or '.mp4'}")
    except (OSError, ValueError):
        log.warning("Could not keep the media for %s", report_id, exc_info=True)
        return None
    return item.media_type


def preview_file(report_id: str) -> Path | None:
    return next(get_settings().previews_dir.glob(f"{report_id}.*"), None)


_ORIGINALITY = {
    "original": "Looks like the original post",
    "reupload": "Re-upload of an earlier post",
    "modified-reupload": "Modified copy of an earlier post",
    "unknown": "No earlier copies found",
}


async def _trace(
    job: Job, item: ingest.Ingested, hashes: list[str], crops: list[str], client: httpx.AsyncClient, progress: Progress
) -> provenance.ProvenanceResult:
    # A chatbot answer has no upload history; forwarded messages and selected text often do
    if job.kind == "ai-response":
        await progress.skip("provenance", "Chatbot answers have no upload history")
        return provenance.ProvenanceResult(spread=[], originality="unknown", origin_url=None, summary="")
    await progress.start("provenance", "Reverse-searching and matching earlier posts")
    trace = await provenance.trace(item, hashes, job.report_id, client, crops)
    chain = f" · {len(trace.spread)} posts in the chain" if len(trace.spread) > 1 else ""
    await progress.complete("provenance", _ORIGINALITY.get(trace.originality, "Traced") + chain)
    return trace


async def _detect_ai(
    frames: list[Path], client: httpx.AsyncClient, progress: Progress, first_hash: str | None = None
) -> tuple[dict[str, float], visual_review.Review | None, list[str]]:
    """AI-generated probability from each configured detector (the report uses their mean), Jev's visual review, and
    a note when the review was expected but Jev didn't answer. `first_hash` lets re-uploads reuse a stored review."""
    if not frames:
        await progress.skip("ai", "No image or video to scan")
        return {}, None, []
    await progress.start("ai", f"Scanning {_plural(len(frames), 'frame')}")
    names = ("t0-vision", "hive")
    *scores, (review, notes) = await asyncio.gather(
        local_models.ai_generated_score(frames), external.ai_generated_score(frames, client), visual_review.ai_review(frames, first_hash)
    )
    detectors = {name: round(score, 4) for name, score in zip(names, scores) if score is not None}
    if detectors:
        mean = sum(detectors.values()) / len(detectors)
        reviewed = f" · visual review {round(review.mean * 100)}%" if review is not None else ""
        await progress.complete("ai", f"{round(mean * 100)}% likely AI-generated · {', '.join(detectors)}{reviewed}")
    else:
        await progress.skip("ai", "No detector configured")
    return detectors, review, notes


def _describe(item: ingest.Ingested) -> str:
    """One line on what was fetched, e.g. "Video from youtube.com · 2:14 · 340 words"."""
    parts: list[str] = []
    host = (urlsplit(item.url).hostname or "").removeprefix("www.") if item.url else ""
    if item.media_type:
        parts.append(f"{item.media_type.capitalize()} from {host}" if host else item.media_type.capitalize())
    elif host:
        parts.append(host)
    if item.duration:
        parts.append(f"{int(item.duration // 60)}:{int(item.duration % 60):02d}")
    if words := len(item.text.split()):
        parts.append(_plural(words, "word"))
    return " · ".join(parts) or "Content received"


def _plural(count: int, noun: str) -> str:
    return f"{count:,} {noun}{'' if count == 1 else 's'}"


async def _ingest(job: Job, report_dir: Path, client: httpx.AsyncClient) -> ingest.Ingested:
    if job.upload_path:
        return ingest.ingest_upload(job.upload_path, job.upload_name or "upload", job.upload_type or "")
    if job.media_url:
        return await ingest.ingest_media_url(job.media_url, job.url, report_dir, client)
    if job.text and (job.kind in TEXT_SUBJECT_KINDS or not job.url):
        # The page URL (a chat, a WhatsApp tab) says nothing about the text, so it stays on the report only
        return ingest.ingest_text(job.text, job.title)
    item = await ingest.ingest_url(job.url or "", report_dir, client)
    # The extension sends the text it can see; use it when the platform hides the post from us
    if not item.text and job.text:
        item.text = job.text
    return item
