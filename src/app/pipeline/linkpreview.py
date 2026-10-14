"""Title, description and image for any link, so the studio can show a preview card instead of a bare URL.

The URL comes from the browser, so only public hosts are fetched: never loopback, private or link-local
addresses (including after redirects), which would let anyone reach services on the server's network.
"""

import asyncio
import ipaddress
import re
import socket
import time
from html import unescape
from urllib.parse import urljoin, urlsplit

import httpx
from pydantic import BaseModel, Field

from app.pipeline import ingest
from app.pipeline.platforms import canonical_url, detect_platform, label

CACHE_SECONDS = 6 * 3600
CACHE_SIZE = 500
MAX_HTML_BYTES = 1024 * 1024

META_RE = re.compile(r"<meta\b[^>]*>", re.I)
ATTR_RE = re.compile(r"""([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')""")
TITLE_RE = re.compile(r"<title[^>]*>(.*?)</title>", re.I | re.S)


class LinkPreview(BaseModel):
    url: str
    title: str = ""
    description: str = ""
    image: str | None = None
    site_name: str = Field(default="", serialization_alias="siteName")
    # "image" when the link is itself a picture, so the studio shows it as one
    kind: str = "page"


_cache: dict[str, tuple[float, LinkPreview]] = {}


class BlockedHost(ValueError):
    pass


async def preview(url: str) -> LinkPreview:
    url = canonical_url(url)
    now = time.monotonic()
    if (hit := _cache.get(url)) and hit[0] > now:
        return hit[1]

    await _check_public(url)
    result = await _fetch(url)
    if len(_cache) >= CACHE_SIZE:
        _cache.pop(next(iter(_cache)))
    _cache[url] = (now + CACHE_SECONDS, result)
    return result


async def _check_public(url: str) -> None:
    parts = urlsplit(url)
    if parts.scheme not in ("http", "https") or not parts.hostname:
        raise BlockedHost("Only http and https links can be previewed.")
    try:
        infos = await asyncio.get_running_loop().getaddrinfo(parts.hostname, parts.port or 443, type=socket.SOCK_STREAM)
    except socket.gaierror as exc:
        raise BlockedHost("That host could not be found.") from exc
    for info in infos:
        address = ipaddress.ip_address(info[4][0])
        if not address.is_global:
            raise BlockedHost("That link points to a private address.")


async def _fetch(url: str) -> LinkPreview:
    platform = detect_platform(url)
    host = (urlsplit(url).hostname or "").removeprefix("www.")
    result = LinkPreview(url=url, site_name=host if platform in ("article", "image") else label(platform))

    async def guard(request: httpx.Request) -> None:
        await _check_public(str(request.url))  # every redirect hop, not just the first URL

    async with httpx.AsyncClient(headers={"User-Agent": ingest.USER_AGENT}, follow_redirects=True, max_redirects=5, timeout=15, event_hooks={"request": [guard]}) as client:
        try:
            async with client.stream("GET", url) as response:
                response.raise_for_status()
                content_type = response.headers.get("content-type", "")
                if content_type.startswith("image/"):
                    result.kind = "image"
                    result.image = str(response.url)
                    result.title = urlsplit(str(response.url)).path.rsplit("/", 1)[-1]
                    return result
                if "html" not in content_type:
                    return result
                html = await _read_capped(response)
                base = str(response.url)
        except (httpx.HTTPError, BlockedHost):
            html, base = "", url

        _apply_html(result, html, base)

        # Social posts often hide their metadata from plain requests; yt-dlp knows how to read them
        if platform not in ("article", "image", "upload", "text") and not (result.title and result.image):
            try:
                item = await asyncio.wait_for(ingest.probe(url, client), timeout=20)
            except (TimeoutError, httpx.HTTPError):
                item = None
            if item:
                result.title = result.title or item.title
                result.description = result.description or item.text[:300]
                result.image = result.image or item.thumbnail_url

    # A blocked page often answers with just the site's name; the URL slug says more ("ferrari_daytona_sp3_...")
    if result.title.lower() in ("", host.lower(), result.site_name.lower(), label(platform).lower()):
        result.title = _slug_title(url) or result.title or host
    return result


def _slug_title(url: str) -> str:
    segments = [s for s in urlsplit(url).path.split("/") if s]
    slug = next((s for s in reversed(segments) if re.search(r"[a-z].*[_-].*[a-z]", s, re.I)), "")
    words = re.sub(r"\.\w{2,5}$", "", slug).replace("_", " ").replace("-", " ").strip()
    return words[:1].upper() + words[1:]


async def _read_capped(response: httpx.Response) -> str:
    chunks, size = [], 0
    async for chunk in response.aiter_bytes():
        chunks.append(chunk)
        size += len(chunk)
        if size >= MAX_HTML_BYTES:
            break
    return b"".join(chunks).decode(response.encoding or "utf-8", errors="replace")


def _apply_html(result: LinkPreview, html: str, base: str) -> None:
    tags: dict[str, str] = {}
    for tag in META_RE.findall(html):
        attrs = {k.lower(): (v1 or v2) for k, v1, v2 in ATTR_RE.findall(tag)}
        key = (attrs.get("property") or attrs.get("name") or "").lower()
        if key and "content" in attrs:
            tags.setdefault(key, unescape(attrs["content"]).strip())
    title_tag = TITLE_RE.search(html)
    result.title = tags.get("og:title") or tags.get("twitter:title") or (unescape(title_tag.group(1)).strip() if title_tag else "") or result.title
    result.description = (tags.get("og:description") or tags.get("twitter:description") or tags.get("description") or "")[:300]
    image = tags.get("og:image") or tags.get("og:image:url") or tags.get("twitter:image")
    result.image = urljoin(base, image) if image else None
    result.site_name = tags.get("og:site_name") or result.site_name
