"""Turn a URL (or upload, or pasted text) into the text, account, timestamps and media the other stages work on."""

import asyncio
import logging
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from html import unescape
from pathlib import Path
from urllib.parse import urlsplit

import httpx
import trafilatura
import yt_dlp

from app.config import get_settings
from app.pipeline.platforms import canonical_url, detect_platform
from app.schemas import SourceKind

log = logging.getLogger(__name__)

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"
URL_RE = re.compile(r"https?://[^\s<>\"')\]]+")


@dataclass
class Ingested:
    platform: SourceKind
    url: str
    title: str = ""
    text: str = ""
    account: str = ""
    account_url: str | None = None
    posted_at: datetime | None = None
    thumbnail_url: str | None = None
    media_path: Path | None = None
    media_type: str | None = None  # "video" | "image"
    duration: float | None = None
    transcript: str = ""
    # Links found in the post itself (caption, description, the URL a Reddit post points to)
    linked_urls: list[str] = field(default_factory=list)
    # Earlier posts the platform itself says this one came from (Reddit crossposts, X quote tweets)
    parents: list[dict] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)


def _from_timestamp(value) -> datetime | None:
    try:
        return datetime.fromtimestamp(float(value), tz=timezone.utc) if value else None
    except (TypeError, ValueError, OSError):
        return None


def _parse_date(value: str | None) -> datetime | None:
    if not value:
        return None
    for fmt in ("%Y%m%d", "%Y-%m-%d", "%a %b %d %H:%M:%S %z %Y", "%b %d, %Y"):
        try:
            parsed = datetime.strptime(value, fmt)
            return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
        except ValueError:
            pass
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    except ValueError:
        return None


def _links_in(text: str) -> list[str]:
    return list(dict.fromkeys(m.rstrip(".,;") for m in URL_RE.findall(text or "")))


async def ingest_url(url: str, report_dir: Path, client: httpx.AsyncClient) -> Ingested:
    url = canonical_url(url)
    platform = detect_platform(url)

    if platform == "image":
        return await ingest_media_url(url, None, report_dir, client)
    if platform == "article":
        return await _ingest_article(url, report_dir, client)

    item = Ingested(platform=platform, url=url)
    if platform == "reddit":
        await _reddit_metadata(item, client)
    if platform == "x":
        await _x_metadata(item, client)

    # yt-dlp covers video on every supported platform, and metadata for most of them
    info = await asyncio.to_thread(_ytdlp_extract, url, report_dir)
    if info:
        _apply_ytdlp_info(item, info)
        item.transcript = item.transcript or await _fetch_transcript(info, client)
    elif not item.text:
        item.notes.append("Could not read the post with yt-dlp; it may be private, deleted or need login cookies.")

    if not item.text and not item.thumbnail_url:
        await _open_graph(item, client)

    # No video downloaded: fall back to the post's image so it can still be fingerprinted
    if item.media_path is None and item.thumbnail_url:
        item.media_path = await _download(item.thumbnail_url, report_dir / "image", client)
        item.media_type = "image" if item.media_path else None

    item.linked_urls = [u for u in dict.fromkeys(item.linked_urls + _links_in(item.text)) if canonical_url(u) != url]
    return item


async def probe(url: str, client: httpx.AsyncClient) -> Ingested | None:
    """Metadata and thumbnail for a candidate source, without downloading its media."""
    url = canonical_url(url)
    platform = detect_platform(url)
    item = Ingested(platform=platform, url=url)
    if platform == "image":
        return Ingested(platform=platform, url=url, thumbnail_url=url)
    if platform == "article":
        await _open_graph(item, client)
        return item if item.title or item.thumbnail_url else None
    info = await asyncio.to_thread(_ytdlp_metadata, url)
    if not info:
        return None
    _apply_ytdlp_info(item, info)
    return item


def _ytdlp_metadata(url: str) -> dict | None:
    opts = {**_ytdlp_base_opts(), "skip_download": True}
    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            return ydl.extract_info(url, download=False)
    except yt_dlp.utils.DownloadError:
        return None


def ingest_text(text: str, title: str | None = None) -> Ingested:
    return Ingested(platform="text", url="", title=title or text[:80], text=text, linked_urls=_links_in(text))


async def ingest_media_url(media_url: str, page_url: str | None, report_dir: Path, client: httpx.AsyncClient) -> Ingested:
    """An image picked out of any page (extension right-click). The page gives context; the image is the subject."""
    item = Ingested(platform=detect_platform(page_url) if page_url else "image", url=media_url, thumbnail_url=media_url)
    item.media_path = await _download(media_url, report_dir / "image", client)
    item.media_type = "image" if item.media_path else None
    if not item.media_path:
        item.notes.append("Could not download the image.")
    return item


def ingest_upload(path: Path, filename: str, content_type: str) -> Ingested:
    media_type = "video" if content_type.startswith("video/") else "image"
    return Ingested(platform="upload", url="", title=filename, media_path=path, media_type=media_type)


# --- yt-dlp -----------------------------------------------------------------------------------


def _ytdlp_base_opts() -> dict:
    settings = get_settings()
    opts = {
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        "socket_timeout": 20,
        # YouTube's player needs a JavaScript runtime to resolve formats; use whichever is installed
        "js_runtimes": {"deno": {"path": None}, "node": {"path": None}},
    }
    if settings.prefer_ipv4:
        opts["source_address"] = "0.0.0.0"
    if settings.ytdlp_cookies_file:
        opts["cookiefile"] = settings.ytdlp_cookies_file
    return opts


def _ytdlp_extract(url: str, report_dir: Path) -> dict | None:
    settings = get_settings()
    opts = {
        **_ytdlp_base_opts(),
        # Low resolution is plenty for fingerprinting and keeps downloads small. Keep the audio for speech-to-text
        "format": "b[height<=480]/bv*[height<=480]+ba/bv*[height<=480]/wv*+wa/w",
        "merge_output_format": "mp4",
        "outtmpl": str(report_dir / "video.%(ext)s"),
        "max_filesize": settings.max_media_mb * 1024 * 1024,
        "match_filter": yt_dlp.utils.match_filter_func(f"!is_live & duration <=? {settings.max_video_seconds}"),
    }
    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(url, download=True)
            if info and info.get("_type") == "playlist":
                info = (info.get("entries") or [None])[0]
            if info:
                downloads = info.get("requested_downloads") or []
                info["_filepath"] = downloads[0].get("filepath") if downloads else None
            return info
    except yt_dlp.utils.DownloadError as exc:
        log.info("yt-dlp could not read %s: %s", url, exc)
        return None


def _apply_ytdlp_info(item: Ingested, info: dict) -> None:
    item.title = item.title or info.get("title") or ""
    description = info.get("description") or ""
    if description and description not in item.text:
        item.text = f"{item.text}\n\n{description}".strip()
    item.account = item.account or info.get("uploader") or info.get("channel") or info.get("uploader_id") or ""
    item.account_url = item.account_url or info.get("uploader_url") or info.get("channel_url")
    item.posted_at = item.posted_at or _from_timestamp(info.get("timestamp")) or _parse_date(info.get("upload_date"))
    item.thumbnail_url = item.thumbnail_url or info.get("thumbnail")
    item.duration = info.get("duration")
    filepath = info.get("_filepath")
    if filepath and Path(filepath).exists():
        item.media_path = Path(filepath)
        item.media_type = "video"


async def _fetch_transcript(info: dict, client: httpx.AsyncClient) -> str:
    """Spoken claims matter as much as the caption. Use creator or auto captions when the platform has them."""
    for key in ("subtitles", "automatic_captions"):
        tracks = (info.get(key) or {}).get("en") or (info.get(key) or {}).get("en-US") or []
        vtt = next((t for t in tracks if t.get("ext") == "vtt"), None)
        if not vtt:
            continue
        try:
            response = await client.get(vtt["url"], timeout=20)
            response.raise_for_status()
        except httpx.HTTPError:
            continue
        lines = []
        for line in response.text.splitlines():
            line = re.sub(r"<[^>]+>", "", line).strip()
            if not line or "-->" in line or line.startswith(("WEBVTT", "Kind:", "Language:")) or line.isdigit():
                continue
            if not lines or lines[-1] != line:  # auto captions repeat each line as it scrolls
                lines.append(line)
        return " ".join(lines)[:15000]
    return ""


# --- Platform-specific metadata ------------------------------------------------------------------


_reddit_token: tuple[str, float] | None = None


async def _reddit_auth(client: httpx.AsyncClient) -> str | None:
    """App-only OAuth token. Reddit refuses unauthenticated JSON requests, so this is the reliable path."""
    global _reddit_token
    settings = get_settings()
    if not (settings.reddit_client_id and settings.reddit_client_secret):
        return None
    loop_time = asyncio.get_running_loop().time()
    if _reddit_token and _reddit_token[1] > loop_time:
        return _reddit_token[0]
    try:
        response = await client.post(
            "https://www.reddit.com/api/v1/access_token",
            data={"grant_type": "client_credentials"},
            auth=(settings.reddit_client_id, settings.reddit_client_secret),
            headers={"User-Agent": "trust0/0.1"},
            timeout=20,
        )
        response.raise_for_status()
        body = response.json()
    except (httpx.HTTPError, ValueError):
        return None
    _reddit_token = (body["access_token"], loop_time + body.get("expires_in", 3600) - 60)
    return _reddit_token[0]


async def _reddit_metadata(item: Ingested, client: httpx.AsyncClient) -> None:
    token = await _reddit_auth(client)
    if token is None:
        item.notes.append("Reddit metadata needs REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET; using the public page instead.")
        return
    path = urlsplit(item.url).path.rstrip("/")
    try:
        response = await client.get(
            f"https://oauth.reddit.com{path}.json", headers={"Authorization": f"Bearer {token}", "User-Agent": "trust0/0.1"}, timeout=20
        )
        response.raise_for_status()
        post = response.json()[0]["data"]["children"][0]["data"]
    except (httpx.HTTPError, ValueError, KeyError, IndexError):
        item.notes.append("Reddit metadata unavailable.")
        return
    item.title = post.get("title", "")
    item.text = "\n\n".join(filter(None, [post.get("title"), post.get("selftext")]))
    item.account = f"u/{post.get('author')}" if post.get("author") else ""
    item.posted_at = _from_timestamp(post.get("created_utc"))
    target = post.get("url_overridden_by_dest") or post.get("url")
    if target and "reddit.com" not in target and "redd.it" not in target and not re.search(r"\.(jpe?g|png|webp|gif)$", target, re.I):
        # A link post names its source directly
        item.parents.append({"account": detect_platform(target), "platform": detect_platform(target), "url": target, "posted_at": None, "note": "The Reddit post links to this source"})
    if target and re.search(r"\.(jpe?g|png|webp|gif)$", target, re.I):
        item.thumbnail_url = target
    for parent in post.get("crosspost_parent_list") or []:
        item.parents.append(
            {
                "account": f"u/{parent.get('author')}",
                "platform": "reddit",
                "url": "https://reddit.com" + parent.get("permalink", ""),
                "posted_at": _from_timestamp(parent.get("created_utc")),
                "note": f"Crossposted from r/{parent.get('subreddit')}",
            }
        )


async def _x_metadata(item: Ingested, client: httpx.AsyncClient) -> None:
    """fxtwitter's public API works for image posts and quote tweets, which yt-dlp does not cover."""
    match = re.search(r"x\.com/([^/]+)/status/(\d+)", item.url)
    if not match:
        return
    try:
        response = await client.get(f"https://api.fxtwitter.com/{match.group(1)}/status/{match.group(2)}", timeout=20)
        response.raise_for_status()
        tweet = response.json().get("tweet") or {}
    except (httpx.HTTPError, ValueError):
        item.notes.append("X metadata unavailable.")
        return
    author = tweet.get("author") or {}
    item.text = tweet.get("text") or ""
    item.title = item.text[:100]
    item.account = f"@{author['screen_name']}" if author.get("screen_name") else ""
    item.account_url = author.get("url")
    item.posted_at = _from_timestamp(tweet.get("created_timestamp")) or _parse_date(tweet.get("created_at"))
    photos = (tweet.get("media") or {}).get("photos") or []
    if photos:
        item.thumbnail_url = photos[0].get("url")
    quote = tweet.get("quote")
    if quote:
        quoted_author = (quote.get("author") or {}).get("screen_name")
        item.parents.append(
            {
                "account": f"@{quoted_author}" if quoted_author else "unknown",
                "platform": "x",
                "url": quote.get("url"),
                "posted_at": _from_timestamp(quote.get("created_timestamp")),
                "note": "Quoted in this post",
            }
        )


async def _ingest_article(url: str, report_dir: Path, client: httpx.AsyncClient) -> Ingested:
    item = Ingested(platform="article", url=url)
    try:
        response = await client.get(url, headers={"User-Agent": USER_AGENT}, timeout=25, follow_redirects=True)
        response.raise_for_status()
        html = response.text
    except httpx.HTTPError as exc:
        item.notes.append(f"Could not fetch the article: {exc.__class__.__name__}.")
        return item

    doc = await asyncio.to_thread(trafilatura.bare_extraction, html, url=url, with_metadata=True)
    data = doc.as_dict() if hasattr(doc, "as_dict") else (doc or {})
    item.title = data.get("title") or ""
    item.text = data.get("text") or ""
    item.account = data.get("author") or data.get("sitename") or urlsplit(url).hostname or ""
    item.posted_at = _parse_date(data.get("date"))
    item.thumbnail_url = data.get("image")
    if not item.text:
        item.notes.append("Could not extract article text.")
    if item.thumbnail_url:
        item.media_path = await _download(item.thumbnail_url, report_dir / "image", client)
        item.media_type = "image" if item.media_path else None
    item.linked_urls = _links_in(item.text)
    return item


async def _open_graph(item: Ingested, client: httpx.AsyncClient) -> None:
    """Last resort for posts yt-dlp can't open: most public pages still carry Open Graph tags."""
    try:
        response = await client.get(item.url, headers={"User-Agent": USER_AGENT}, timeout=20, follow_redirects=True)
        response.raise_for_status()
    except httpx.HTTPError:
        return
    tags = dict(re.findall(r'<meta[^>]+(?:property|name)="(og:[^"]+|article:published_time)"[^>]+content="([^"]*)"', response.text))
    item.title = item.title or unescape(tags.get("og:title", ""))
    item.text = item.text or unescape(tags.get("og:description", ""))
    item.thumbnail_url = item.thumbnail_url or unescape(tags.get("og:image", "")) or None
    item.posted_at = item.posted_at or _parse_date(tags.get("article:published_time"))


async def _download(url: str, stem: Path, client: httpx.AsyncClient) -> Path | None:
    try:
        response = await client.get(url, headers={"User-Agent": USER_AGENT}, timeout=30, follow_redirects=True)
        response.raise_for_status()
    except httpx.HTTPError:
        return None
    content_type = response.headers.get("content-type", "")
    if not content_type.startswith("image/"):
        return None
    ext = {"image/png": ".png", "image/webp": ".webp", "image/gif": ".gif"}.get(content_type.split(";")[0], ".jpg")
    path = stem.with_suffix(ext)
    path.write_bytes(response.content)
    return path
