import asyncio
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, Request, UploadFile, status
from fastapi.responses import FileResponse

from app.config import get_settings
from app.db import add_active_site, find_recent_report, list_active_sites, list_reports, load_report, remove_active_site, save_report
from app.pipeline import linkpreview, runner
from app.pipeline.platforms import canonical_url, content_key, detect_platform, is_image_url, normalize_domain
from app.schemas import ActiveSite, AddActiveSite, CheckRequest, CheckResponse, Report

router = APIRouter(prefix="/v1")

# Running checks, so a request can wait on one; references also keep the tasks from being garbage collected
_tasks: dict[str, asyncio.Task] = {}

UPLOAD_TYPES = ("image/", "video/")


@router.get("/health", tags=["meta"])
async def health() -> dict:
    s = get_settings()
    return {
        "ok": True,
        "providers": {
            "claude": s.has_claude,  # true only when llm_provider is "anthropic"; see "llm" for any provider
            "llm": s.has_llm,
            "llmProvider": s.llm_provider,
            "reverseImageSearch": bool(s.serpapi_api_key),
            "factCheckLookup": bool(s.google_factcheck_api_key),
            "aiDetection": s.has_ai_detector,
            "t0Vision": s.has_local_detector,
            "hive": bool(s.hive_api_key),
            "speechToText": s.has_transcriber,
            "reddit": bool(s.reddit_client_id and s.reddit_client_secret),
            "ytdlpCookies": bool(s.ytdlp_cookies_file),
        },
    }


# --- Extension -----------------------------------------------------------------------------------


@router.post("/checks", response_model=CheckResponse, tags=["extension"])
async def create_check(body: CheckRequest, request: Request) -> CheckResponse:
    """Start a check and wait briefly for it. Slow checks come back with status "analyzing" and a pollUrl."""
    report = await _start(body)
    await _wait(report.id, get_settings().check_wait_seconds)
    return _check_response(await load_report(report.id) or report, request)


@router.get("/checks/{report_id}", response_model=CheckResponse, tags=["extension"])
async def get_check(report_id: str, request: Request) -> CheckResponse:
    return _check_response(await _get(report_id), request)


# --- Studio --------------------------------------------------------------------------------------


@router.post("/reports", response_model=Report, status_code=status.HTTP_202_ACCEPTED, tags=["studio"])
async def create_report(body: CheckRequest) -> Report:
    return await _start(body)


@router.post("/reports/upload", response_model=Report, status_code=status.HTTP_202_ACCEPTED, tags=["studio"])
async def upload_report(file: UploadFile = File(...)) -> Report:
    settings = get_settings()
    content_type = file.content_type or ""
    if not content_type.startswith(UPLOAD_TYPES):
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "Upload an image or video file.")

    report = _new_report(kind="upload", url=None, title=file.filename)
    report_dir = settings.media_dir / report.id
    report_dir.mkdir(parents=True, exist_ok=True)
    path = report_dir / f"upload{Path(file.filename or '').suffix[:8]}"
    limit = settings.max_media_mb * 1024 * 1024
    written = 0
    with path.open("wb") as out:
        while chunk := await file.read(1024 * 1024):
            written += len(chunk)
            if written > limit:
                out.close()
                path.unlink(missing_ok=True)
                raise HTTPException(status.HTTP_413_CONTENT_TOO_LARGE, f"Files are limited to {settings.max_media_mb} MB.")
            out.write(chunk)

    await save_report(report, content_key=secrets.token_hex(16))  # uploads are never reused
    _launch(runner.Job(report_id=report.id, kind="upload", upload_path=path, upload_name=file.filename, upload_type=content_type))
    return report


@router.get("/reports", response_model=list[Report], tags=["studio"])
async def get_reports(limit: int = 50) -> list[Report]:
    return await list_reports(min(limit, 200))


@router.get("/reports/{report_id}", response_model=Report, tags=["studio"])
async def get_report(report_id: str) -> Report:
    return await _get(report_id)


@router.get("/reports/{report_id}/media", tags=["studio"])
async def get_report_media(report_id: str) -> FileResponse:
    """The checked image or video, kept for viewing. Report ids are random, so the id is the access check."""
    if not report_id.startswith("rpt_") or not report_id[4:].isalnum():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Media not found.")
    path = runner.preview_file(report_id)
    if path is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Media not found.")
    return FileResponse(path, headers={"Cache-Control": "private, max-age=86400"})


@router.get("/link-preview", response_model=linkpreview.LinkPreview, tags=["studio"])
async def get_link_preview(url: str) -> linkpreview.LinkPreview:
    """Title, description and image for a link, for the studio's preview cards."""
    try:
        return await linkpreview.preview(url)
    except linkpreview.BlockedHost as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc)) from exc


# --- Active sites (extension) ---------------------------------------------------------------------


@router.get("/extension/active-sites", response_model=list[ActiveSite], tags=["extension"])
async def get_active_sites() -> list:
    """Websites the extension runs on automatically. Managed from the studio's Settings page."""
    return await list_active_sites()


@router.post("/extension/active-sites", response_model=ActiveSite, status_code=status.HTTP_201_CREATED, tags=["extension"])
async def create_active_site(body: AddActiveSite) -> object:
    domain = normalize_domain(body.domain)
    if not domain:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Enter a website like example.com.")
    return await add_active_site(domain)


@router.delete("/extension/active-sites/{domain}", status_code=status.HTTP_204_NO_CONTENT, tags=["extension"])
async def delete_active_site(domain: str) -> None:
    await remove_active_site(domain.lower().removeprefix("www."))


# --- Helpers -------------------------------------------------------------------------------------


async def _start(body: CheckRequest) -> Report:
    if not body.url and not body.text and not body.media_url:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Send a url, text or mediaUrl to check.")

    if body.url and not body.media_url and body.kind not in runner.TEXT_SUBJECT_KINDS and is_image_url(body.url):
        # A pasted link to a picture file: the picture is the subject, exactly like an image picked in the extension
        body = body.model_copy(update={"media_url": body.url, "url": None, "kind": "image"})

    text_subject = body.kind in runner.TEXT_SUBJECT_KINDS and body.text
    key = content_key(url=None if text_subject else (body.media_url or body.url), text=body.text, extra=body.kind)
    since = datetime.now(timezone.utc) - timedelta(hours=get_settings().reuse_report_hours)
    if existing := await find_recent_report(key, since):
        return existing

    report = _new_report(kind=body.kind, url=body.url or body.media_url, title=body.title or (body.text or "")[:80] or None, text_subject=bool(text_subject))
    await save_report(report, content_key=key)
    _launch(runner.Job(report_id=report.id, kind=body.kind, url=body.url, text=body.text, title=body.title, media_url=body.media_url))
    return report


def _new_report(*, kind: str, url: str | None, title: str | None, text_subject: bool = False) -> Report:
    if kind == "upload":
        source = "upload"
    elif text_subject or not url:
        source = "text"
    else:
        source = detect_platform(url)
    return Report(
        id=f"rpt_{secrets.token_hex(6)}",
        title=title or (canonical_url(url) if url else "Untitled check"),
        url=canonical_url(url) if url else "",
        source=source,
        kind=kind,
        status="analyzing",
        created_at=datetime.now(timezone.utc),
    )


def _launch(job: runner.Job) -> None:
    task = asyncio.create_task(runner.run(job))
    _tasks[job.report_id] = task
    task.add_done_callback(lambda _: _tasks.pop(job.report_id, None))


async def _wait(report_id: str, seconds: float) -> None:
    task = _tasks.get(report_id)
    if task is None:
        return
    try:
        await asyncio.wait_for(asyncio.shield(task), timeout=seconds)
    except TimeoutError:
        pass


async def _get(report_id: str) -> Report:
    report = await load_report(report_id)
    if report is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Report not found.")
    return report


def _check_response(report: Report, request: Request) -> CheckResponse:
    if report.status == "analyzing":
        summary = "Still checking. Tracing sources and verifying claims can take a minute."
    elif report.status == "failed":
        summary = "This check failed. Try again in a moment."
    else:
        summary = report.summary
    return CheckResponse(
        id=report.id,
        status=report.status,
        verdict=report.verdict,
        trust_score=report.trust_score,
        summary=summary,
        checks=report.checks[:6],
        sections=report.sections if report.status == "complete" else [],
        report_url=f"{get_settings().studio_url.rstrip('/')}/reports/{report.id}",
        poll_url=str(request.url_for("get_check", report_id=report.id)),
    )
