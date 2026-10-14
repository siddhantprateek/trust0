import asyncio
import os
import tempfile

os.environ.setdefault("DATA_DIR", tempfile.mkdtemp(prefix="trust0-test-"))

from app.db import init_db  # noqa: E402
from app.pipeline import coverage, outlets  # noqa: E402
from app.pipeline.factcheck import FactCheckResult  # noqa: E402
from app.pipeline.ingest import Ingested  # noqa: E402
from app.schemas import Claim, SourceRef  # noqa: E402


def test_outlet_lookup_matches_subdomains_and_skips_platforms():
    assert outlets.outlet_key("edition.cnn.com") == "cnn.com"
    assert outlets.outlet_key("sg.finance.yahoo.com") == "yahoo.com"
    assert outlets.outlet_key("www.smh.com.au") == "smh.com.au"
    assert outlets.outlet_key("news.yahoo.com") == "news.yahoo.com"  # curated entry wins
    assert outlets.known("www.abcnews.go.com") == ("ABC News", "lean-left")
    assert outlets.known("unknown-paper.example") is None
    assert not outlets.is_outlet("en.wikipedia.org")
    assert not outlets.is_outlet("www.cdc.gov")
    assert not outlets.is_outlet("x.com")
    assert outlets.is_outlet("reuters.com")


def test_percentages_always_sum_to_100():
    assert coverage._percentages([1, 1, 1]) == (34, 33, 33)
    assert sum(coverage._percentages([2, 5, 0])) == 100
    assert coverage._percentages([0, 3, 0]) == (0, 100, 0)


def _run(monkeypatch, articles, claims=(), query="flood in valencia", item=None, estimates=None):
    async def fake_news(q, client):
        return articles

    async def fake_research(**kwargs):
        return estimates

    monkeypatch.setattr(coverage.external, "search_news", fake_news)
    monkeypatch.setattr(coverage.llm, "research", fake_research)
    monkeypatch.setattr(coverage.get_settings(), "serpapi_api_key", "test")
    monkeypatch.setattr(type(coverage.get_settings()), "has_llm", property(lambda self: True))
    facts = FactCheckResult(claims=list(claims), summary="", news_query=query)

    async def go():
        await init_db()
        return await coverage.build(item or Ingested(platform="x", url="https://x.com/a/status/1"), facts, None)

    return asyncio.run(go())


def _article(domain, outlet=None):
    return {"url": f"https://www.{domain}/story", "title": "Story", "outlet": outlet, "date": None}


def test_distribution_counts_one_entry_per_outlet(monkeypatch):
    articles = [_article(d) for d in ("cnn.com", "edition.cnn.com", "nytimes.com", "reuters.com", "foxnews.com", "wikipedia.org")]
    story, _ = _run(monkeypatch, articles)
    assert [s.domain for s in story.sources] == ["cnn.com", "nytimes.com", "reuters.com", "foxnews.com"]
    assert (story.left, story.center, story.right, story.unrated) == (2, 1, 1, 0)
    assert (story.left_pct, story.center_pct, story.right_pct) == (50, 25, 25)
    assert story.sources[0].outlet == "CNN"  # curated name
    assert story.blindspot is None


def test_blindspot_when_one_side_barely_covers_it(monkeypatch):
    domains = ["foxnews.com", "breitbart.com", "dailywire.com", "nypost.com", "reuters.com", "newsmax.com"]
    story, _ = _run(monkeypatch, [_article(d) for d in domains])
    assert story.left == 0 and story.right == 5
    assert story.blindspot == "left"


def test_claim_sources_get_their_outlets_lean(monkeypatch):
    claim = Claim(
        text="It flooded",
        verdict="supported",
        explanation="",
        sources=[SourceRef(url="https://apnews.com/a"), SourceRef(url="https://www.foxnews.com/b"), SourceRef(url="https://who.int/c")],
    )
    story, _ = _run(monkeypatch, [], claims=[claim])
    assert [s.lean for s in claim.sources] == ["center", "right", None]
    assert {s.domain for s in story.sources} == {"apnews.com", "foxnews.com", "who.int"}


def test_unknown_outlets_are_estimated_and_cached(monkeypatch):
    estimates = coverage.OutletEstimates(outlets=[coverage.OutletEstimate(domain="smalltownherald.example", name="Small Town Herald", lean="lean-right")])
    story, _ = _run(monkeypatch, [_article("smalltownherald.example", "Herald")], estimates=estimates)
    assert story.sources[0].lean == "lean-right"
    assert story.sources[0].rating == "estimated"
    # Second run: no LLM answer available, so the rating must come from the cache
    story, _ = _run(monkeypatch, [_article("smalltownherald.example")], estimates=None)
    assert story.sources[0].lean == "lean-right"


def test_article_reports_its_own_outlets_lean(monkeypatch):
    item = Ingested(platform="article", url="https://www.theguardian.com/world/story", title="Story")
    story, _ = _run(monkeypatch, [_article("reuters.com")], item=item)
    assert story.subject_outlet == "The Guardian"
    assert story.subject_lean == "left"


def test_no_coverage_for_content_that_isnt_news(monkeypatch):
    story, _ = _run(monkeypatch, [], query="")
    assert story is None
