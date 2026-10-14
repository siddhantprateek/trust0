"""Runs a check end to end: ingest -> fingerprint -> provenance + AI detection -> fact check -> score."""

import asyncio
import logging
import shutil
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlsplit

import httpx

from app.config import get_settings
from app.db import load_report, save_report
from app.pipeline import factcheck, ingest, media, provenance, scoring
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
    async with _slots:
        try:
            await _run(job)
        except Exception as exc:  # a failed check must still end in a terminal state
            log.exception("Check %s failed", job.report_id)
            report = await load_report(job.report_id)
            if report:
                report.status = "failed"
                report.error = f"{exc.__class__.__name__}: {exc}"[:500]
                await save_report(report)
        finally:
            shutil.rmtree(get_settings().media_dir / job.report_id, ignore_errors=True)


async def _run(job: Job) -> None:
    settings = get_settings()
    report_dir = settings.media_dir / job.report_id
    report_dir.mkdir(parents=True, exist_ok=True)

    async with httpx.AsyncClient(headers={"User-Agent": ingest.USER_AGENT}) as client:
        item = await _ingest(job, report_dir, client)

        frames: list[Path] = []
        hashes: list[str] = []
        crops: list[str] = []
        embedded = None
        if item.media_path and item.media_type:
            frames, hashes = await media.fingerprint(item.media_path, item.media_type, report_dir, settings.keyframes, item.duration)
            crops = await asyncio.to_thread(media.crop_hashes, frames)
            embedded = await asyncio.to_thread(media.embedded_provenance, item.media_path)
            if item.media_type == "video" and not item.transcript:
                # No captions on the platform: transcribe the audio so spoken claims get checked too
                if settings.has_transcriber:
                    item.transcript = await local_models.transcribe(item.media_path)
                else:
                    item.notes.append("Speech-to-text (install the [local] extra)")

        # A chatbot answer has no upload history; forwarded messages and selected text often do
        if job.kind == "ai-response":
            trace_task = asyncio.sleep(0, result=provenance.ProvenanceResult(spread=[], originality="unknown", origin_url=None, summary=""))
        else:
            trace_task = provenance.trace(item, hashes, job.report_id, client, crops)
        trace, detectors = await asyncio.gather(trace_task, _detect_ai(frames, client))
        ai_probability = sum(detectors.values()) / len(detectors) if detectors else None

        facts = await factcheck.check(item, trace, client)
        await provenance.remember(item, hashes, job.report_id)

    # The media is the subject for posts, videos, uploads and images picked by URL; an article's header image is incidental
    has_media = bool(hashes) and bool(job.media_url or job.upload_path or item.platform not in ("article", "text"))
    skipped = item.notes + trace.skipped + facts.skipped
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
    report.summary = " ".join(filter(None, [facts.summary, trace.summary if has_media or trace.origin_url else ""]))
    report.sections = sections
    report.preview = await _preview(item, frames, job.report_id, kept)
    report.signals = Signals(
        ai_generated_probability=ai_probability,
        ai_detectors=detectors,
        c2pa=embedded,
        originality=trace.originality,
        origin_url=trace.origin_url,
        skipped=skipped,
    )
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


async def _detect_ai(frames: list[Path], client: httpx.AsyncClient) -> dict[str, float]:
    """AI-generated probability from each configured detector. The report uses their mean."""
    names = ("t0-vision", "hive")
    scores = await asyncio.gather(local_models.ai_generated_score(frames), external.ai_generated_score(frames, client))
    return {name: round(score, 4) for name, score in zip(names, scores) if score is not None}


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
