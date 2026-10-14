"""Recognise which platform a URL belongs to and normalise it, so the same post submitted twice
(with tracking params, mobile hosts, short links) maps to the same content key."""

import hashlib
import re
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from app.schemas import SourceKind

_HOSTS: dict[str, SourceKind] = {
    "x.com": "x",
    "twitter.com": "x",
    "instagram.com": "instagram",
    "youtube.com": "youtube",
    "youtu.be": "youtube",
    "tiktok.com": "tiktok",
    "reddit.com": "reddit",
    "redd.it": "reddit",
    "facebook.com": "facebook",
    "fb.watch": "facebook",
}

# Query parameters that identify the content; everything else (utm_*, si, igsh, ...) is tracking noise
_KEEP_PARAMS = {"youtube": {"v", "t"}, "facebook": {"v", "story_fbid", "id"}}

_HOST_ALIASES = {"twitter.com": "x.com", "mobile.twitter.com": "x.com", "m.youtube.com": "youtube.com", "m.facebook.com": "facebook.com", "old.reddit.com": "reddit.com"}

# Human-readable platform names, matching the studio's sourceLabels
LABELS: dict[str, str] = {
    "instagram": "Instagram",
    "x": "X",
    "youtube": "YouTube",
    "tiktok": "TikTok",
    "reddit": "Reddit",
    "facebook": "Facebook",
    "article": "Article",
    "image": "Image link",
    "upload": "Upload",
    "text": "Text",
}


def _bare_host(url: str) -> str:
    host = urlsplit(url).hostname or ""
    return host.removeprefix("www.")


_DOMAIN_RE = re.compile(r"^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$")


def normalize_domain(raw: str) -> str | None:
    """A bare, lowercase domain (no scheme, path or port) for the extension's active-sites list, or None if raw
    isn't a plausible domain. Accepts a bare domain or a full URL and keeps only the host."""
    raw = raw.strip().lower()
    if not raw:
        return None
    host = urlsplit(raw if "//" in raw else f"//{raw}").hostname or raw.split("/")[0].split(":")[0]
    host = host.removeprefix("www.")
    return host if _DOMAIN_RE.match(host) else None


_IMAGE_PATH = re.compile(r"\.(jpe?g|png|gif|webp|avif|bmp|heic)$", re.I)


def is_image_url(url: str) -> bool:
    """A link straight to a picture file rather than a page, judged by its path."""
    return bool(_IMAGE_PATH.search(urlsplit(url).path))


def detect_platform(url: str) -> SourceKind:
    host = _bare_host(url)
    for domain, platform in _HOSTS.items():
        if host == domain or host.endswith("." + domain):
            return platform
    return "image" if is_image_url(url) else "article"


def canonical_url(url: str) -> str:
    url = url.strip()
    if not re.match(r"^https?://", url, re.I):
        url = "https://" + url
    parts = urlsplit(url)
    host = _bare_host(url)
    host = _HOST_ALIASES.get(host, host)
    platform = detect_platform(url)

    if platform == "youtube" and host == "youtu.be":
        video_id = parts.path.strip("/")
        return f"https://youtube.com/watch?v={video_id}"
    if platform == "youtube" and parts.path.startswith("/shorts/"):
        return f"https://youtube.com/watch?v={parts.path.split('/')[2]}"

    keep = _KEEP_PARAMS.get(platform, set())
    query = urlencode([(k, v) for k, v in parse_qsl(parts.query) if k in keep])
    path = parts.path.rstrip("/") or "/"
    return urlunsplit(("https", host, path, query, ""))


# Paths that point at a single post or video, as opposed to a profile, channel, feed or search page
_CONTENT_PATHS: dict[str, re.Pattern] = {
    "x": re.compile(r"/status/\d+"),
    "youtube": re.compile(r"^/(watch|shorts/|live/)"),
    "instagram": re.compile(r"^/(p|reel|reels|tv)/"),
    "tiktok": re.compile(r"/video/\d+|^/t/"),
    "reddit": re.compile(r"/comments/"),
    "facebook": re.compile(r"/(videos|posts|reel|photo|watch|share)|story_fbid"),
}


def is_content_url(url: str) -> bool:
    """True for a URL that points at one piece of content. Profile pages show an account's thumbnails and
    match visually, but they aren't uploads and shouldn't appear as steps in a spread path."""
    canonical = canonical_url(url)
    parts = urlsplit(canonical)
    platform = detect_platform(canonical)
    pattern = _CONTENT_PATHS.get(platform)
    if pattern is None:  # articles: anything deeper than the homepage
        return parts.path not in ("", "/")
    return bool(pattern.search(parts.path + ("?" + parts.query if parts.query else "")))


def label(platform: str) -> str:
    return LABELS.get(platform, platform.title())


def content_key(*, url: str | None = None, text: str | None = None, extra: str = "") -> str:
    basis = canonical_url(url) if url else " ".join((text or "").split()).lower()
    return hashlib.sha256(f"{basis}|{extra}".encode()).hexdigest()
