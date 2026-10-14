"""Keyed third-party services. Each returns empty results when its key isn't configured."""

import logging
from pathlib import Path

import httpx

from app.config import get_settings

log = logging.getLogger(__name__)


async def reverse_image_search(image_url: str, client: httpx.AsyncClient) -> list[dict]:
    """Google Lens via SerpAPI. Needs a publicly reachable image URL.

    Exact matches (pages showing this same picture) first; visual matches (lookalikes, sometimes crops or
    re-edits) only when there are none, since each call is a billed search.
    """
    key = get_settings().serpapi_api_key
    if not key or not image_url:
        return []
    return await _lens(image_url, "exact_matches", key, client) or await _lens(image_url, "visual_matches", key, client)


async def _lens(image_url: str, kind: str, key: str, client: httpx.AsyncClient) -> list[dict]:
    # Without an explicit type, Lens now returns only an AI overview and no matching pages
    try:
        response = await client.get(
            "https://serpapi.com/search.json",
            params={"engine": "google_lens", "type": kind, "url": image_url, "api_key": key},
            timeout=60,
        )
        response.raise_for_status()
    except httpx.HTTPError as exc:
        log.warning("Reverse image search (%s) failed: %s", kind, exc.__class__.__name__)
        return []
    results = response.json().get("organic_results" if kind == "exact_matches" else "visual_matches", [])
    return [
        {
            "url": m["link"],
            "title": m.get("title"),
            "source": m.get("source"),
            "thumbnail": m.get("thumbnail"),
            "date": m.get("date"),
            "exact": kind == "exact_matches",
        }
        for m in results[:20]
        if m.get("link")
    ]


async def search_news(query: str, client: httpx.AsyncClient) -> list[dict]:
    """Google News results for a story via SerpAPI: who else is covering it. One billed search per call."""
    key = get_settings().serpapi_api_key
    if not key or not query.strip():
        return []
    try:
        response = await client.get(
            "https://serpapi.com/search.json",
            params={"engine": "google_news", "q": query[:200], "hl": "en", "api_key": key},
            timeout=30,
        )
        response.raise_for_status()
    except httpx.HTTPError as exc:
        log.warning("News search failed: %s", exc.__class__.__name__)
        return []
    articles = []
    for result in response.json().get("news_results", []):
        # Google groups some stories: a headline plus related articles from other outlets
        for entry in [result, result.get("highlight"), *(result.get("stories") or [])]:
            if entry and entry.get("link"):
                articles.append(
                    {
                        "url": entry["link"],
                        "title": entry.get("title"),
                        "outlet": (entry.get("source") or {}).get("name"),
                        "date": entry.get("iso_date") or entry.get("date"),
                    }
                )
    return articles


async def search_fact_checks(query: str, client: httpx.AsyncClient) -> list[dict]:
    """Published fact checks (ClaimReview) that match a claim, from Google's Fact Check Tools API."""
    key = get_settings().google_factcheck_api_key
    if not key:
        return []
    try:
        response = await client.get(
            "https://factchecktools.googleapis.com/v1alpha1/claims:search",
            params={"query": query[:500], "key": key, "pageSize": 5, "languageCode": "en"},
            timeout=20,
        )
        response.raise_for_status()
    except httpx.HTTPError as exc:
        log.warning("Fact check search failed: %s", exc)
        return []
    results = []
    for claim in response.json().get("claims", []):
        for review in claim.get("claimReview", []):
            results.append(
                {
                    "claim": claim.get("text"),
                    "claimant": claim.get("claimant"),
                    "publisher": (review.get("publisher") or {}).get("name"),
                    "rating": review.get("textualRating"),
                    "url": review.get("url"),
                    "date": review.get("reviewDate"),
                }
            )
    return results


async def ai_generated_score(frames: list[Path], client: httpx.AsyncClient) -> float | None:
    """Hive's AI-generated media model on a few keyframes. Returns the highest per-frame probability, or None."""
    key = get_settings().hive_api_key
    if not key or not frames:
        return None
    # Spread the sample across the clip; detector calls are billed per image
    step = max(len(frames) // 4, 1)
    scores = []
    for frame in frames[::step][:4]:
        try:
            with frame.open("rb") as f:
                response = await client.post(
                    "https://api.thehive.ai/api/v2/task/sync",
                    headers={"Authorization": f"token {key}"},
                    files={"media": (frame.name, f, "image/jpeg")},
                    timeout=60,
                )
            response.raise_for_status()
            score = hive_class_score(response.json(), "ai_generated")
            if score is not None:
                scores.append(score)
        except (httpx.HTTPError, ValueError) as exc:
            log.warning("AI detection failed on %s: %s", frame.name, exc)
    return max(scores) if scores else None


def hive_class_score(body: object, class_name: str) -> float | None:
    """Highest score for `class_name` anywhere in a Hive response.

    Hive nests results as status[].response.output[].classes[{class, score}], with one output per frame for
    video. Searching the whole body keeps this working if the nesting shifts between API versions.
    """
    best: float | None = None
    stack = [body]
    while stack:
        node = stack.pop()
        if isinstance(node, dict):
            if node.get("class") == class_name and isinstance(node.get("score"), (int, float)):
                best = max(best or 0.0, float(node["score"]))
            stack.extend(node.values())
        elif isinstance(node, list):
            stack.extend(node)
    return best
