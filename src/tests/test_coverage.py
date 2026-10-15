import asyncio
import json
import os
import tempfile
from types import SimpleNamespace

import httpx
import openai
from openai.types import Decision

os.environ.setdefault("DATA_DIR", tempfile.mkdtemp(prefix="trust0-test-"))

from app.db import init_db  # noqa: E402
from app.pipeline import coverage, outlets  # noqa: E402
from app.services import decisions  # noqa: E402
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


def _run(monkeypatch, articles, claims=(), query="flood in valencia", item=None, estimates=None, decision=..., decision_calls=None, on_story=None, on_story_calls=None):
    """decision: what the Decisions API returns for a lean (a decisions.Choice, or None for a failed call); left out,
    it isn't configured. on_story: probabilities by question name for the relevance check; None keeps every article."""

    async def fake_predicates(input, questions):
        if on_story_calls is not None:
            on_story_calls.append((input, questions))
        return on_story

    async def fake_news(q, client):
        return articles

    async def fake_research(**kwargs):
        return estimates

    async def fake_choice(input, instructions, choices):
        if decision_calls is not None:
            decision_calls.append(input)
        return decision

    monkeypatch.setattr(coverage.external, "search_news", fake_news)
    monkeypatch.setattr(coverage.llm, "research", fake_research)
    monkeypatch.setattr(coverage.decisions, "choice", fake_choice)
    monkeypatch.setattr(coverage.decisions, "predicates", fake_predicates)
    monkeypatch.setattr(coverage.get_settings(), "serpapi_api_key", "test")
    monkeypatch.setattr(type(coverage.get_settings()), "has_llm", property(lambda self: True))
    monkeypatch.setattr(type(coverage.get_settings()), "has_decisions", property(lambda self: decision is not ...))
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


def _estimate(domain, lean="lean-left", evidence="AllSides rates it Lean Left; Media Bias/Fact Check rates it Left-Center."):
    return coverage.OutletEstimates(outlets=[coverage.OutletEstimate(domain=domain, name="Some Paper", lean=lean, evidence=evidence)])


def test_decision_model_rates_the_lean_from_the_llms_evidence(monkeypatch):
    calls = []
    answer = decisions.Choice(choice="lean-left", probabilities={"lean-left": 0.9, "left": 0.1}, confidence=0.88)
    story, _ = _run(monkeypatch, [_article("decided.example")], estimates=_estimate("decided.example", lean="center"), decision=answer, decision_calls=calls)
    source = story.sources[0]
    assert (source.lean, source.rating, source.lean_confidence) == ("lean-left", "estimated", 0.88)
    # The decision model judges the write-up on its own: the LLM's label isn't in its input
    assert calls == [{"domain": "decided.example", "name": "Some Paper", "evidence": _estimate("x").outlets[0].evidence}]
    # Cached with its confidence, so a later check shows the same thing without asking again
    story, _ = _run(monkeypatch, [_article("decided.example")], decision=None, decision_calls=calls)
    assert (story.sources[0].lean, story.sources[0].lean_confidence) == ("lean-left", 0.88)
    assert len(calls) == 1


def test_outlet_stays_unrated_when_the_decision_is_unsure(monkeypatch):
    answer = decisions.Choice(choice="right", probabilities={"right": 0.4, "lean-right": 0.35, "center": 0.25}, confidence=0.28)
    story, _ = _run(monkeypatch, [_article("unsure.example")], estimates=_estimate("unsure.example", lean="right"), decision=answer)
    source = story.sources[0]
    assert (source.lean, source.rating, source.lean_confidence) == (None, None, 0.28)
    assert story.unrated == 1


def test_outlet_stays_unrated_when_the_decision_is_unrated(monkeypatch):
    answer = decisions.Choice(choice="unrated", probabilities={"unrated": 0.95, "center": 0.05}, confidence=0.94)
    story, _ = _run(monkeypatch, [_article("norating.example")], estimates=_estimate("norating.example", evidence="No rater covers it."), decision=answer)
    assert story.sources[0].lean is None


def test_llm_label_is_used_when_the_decision_fails(monkeypatch):
    story, _ = _run(monkeypatch, [_article("decisiondown.example")], estimates=_estimate("decisiondown.example", lean="lean-right"), decision=None)
    source = story.sources[0]
    assert (source.lean, source.rating, source.lean_confidence) == ("lean-right", "estimated", None)


def _fake_client(monkeypatch, result):
    """Swap the OpenAI client for one whose decisions.create returns (or raises) `result` and records its arguments."""
    sent = []

    async def create(**kwargs):
        sent.append(kwargs)
        if isinstance(result, Exception):
            raise result
        return result

    monkeypatch.setattr(decisions, "_client", lambda: SimpleNamespace(decisions=SimpleNamespace(create=create)))
    monkeypatch.setattr(decisions.get_settings(), "openai_api_key", "sk-test")
    return sent


def test_decisions_client_sends_a_choice_question_and_reads_the_answer(monkeypatch):
    sent = _fake_client(monkeypatch, Decision.model_validate({
        "model": "gpt-6-luna",
        "answers": [{
            "type": "choice",
            "name": "answer",
            "choice": "center",
            "probabilities": [{"value": "center", "probability": 0.8}, {"value": "unrated", "probability": 0.2}],
            "confidence": 0.73,
        }],
        "usage": {"input_tokens": 120, "input_tokens_details": {"cache_write_tokens": 0, "cached_tokens": 0}, "output_tokens": 0, "output_tokens_details": {"reasoning_tokens": 0}, "total_tokens": 120},
    }))
    answer = asyncio.run(decisions.choice({"evidence": "x"}, "Which?", {"center": "Middle", "unrated": "No rating"}))
    assert answer == decisions.Choice(choice="center", probabilities={"center": 0.8, "unrated": 0.2}, confidence=0.73)
    (request,) = sent
    assert request["model"] == "gpt-6-luna"
    assert json.loads(request["input"]) == {"evidence": "x"}
    assert request["questions"] == [{
        "type": "choice",
        "name": "answer",
        "instructions": "Which?",
        "choices": [{"value": "center", "description": "Middle"}, {"value": "unrated", "description": "No rating"}],
    }]


def test_decisions_client_treats_a_refusal_as_no_answer(monkeypatch):
    _fake_client(monkeypatch, Decision.model_validate({
        "model": "gpt-6-luna",
        "answers": [{"type": "refusal", "name": "answer"}],
        "usage": {"input_tokens": 50, "input_tokens_details": {"cache_write_tokens": 0, "cached_tokens": 0}, "output_tokens": 0, "output_tokens_details": {"reasoning_tokens": 0}, "total_tokens": 50},
    }))
    assert asyncio.run(decisions.choice("state", "Which?", {"a": "A", "b": "B"})) is None


def test_decisions_client_gives_up_on_an_api_error(monkeypatch):
    request = httpx.Request("POST", "https://api.openai.com/v1/decisions")
    _fake_client(monkeypatch, openai.AuthenticationError("invalid key", response=httpx.Response(401, request=request), body=None))
    assert asyncio.run(decisions.choice("state", "Which?", {"a": "A", "b": "B"})) is None


def test_no_coverage_when_only_the_claim_sources_are_news_outlets(monkeypatch):
    # An ad checked against news sites isn't a story outlets are covering, but its sources still show their lean
    claim = Claim(text="Figma launched an agent", verdict="supported", explanation="", sources=[SourceRef(url="https://www.reuters.com/tech/figma")])
    story, _ = _run(monkeypatch, [_article("cnn.com")], claims=[claim], query="")
    assert story is None
    assert claim.sources[0].lean == "center"


def test_articles_off_the_story_are_dropped(monkeypatch):
    calls = []
    articles = [_article("cnn.com"), _article("coursera.org", "Coursera"), _article("foxnews.com")]
    claim = Claim(text="It flooded", verdict="supported", explanation="", sources=[SourceRef(url="https://www.adsoftheworld.com/campaign")])
    # a0 cnn, a1 coursera, a2 foxnews, a3 the ad archive the fact check cited
    on_story = {"a0": 0.97, "a1": 0.02, "a2": 0.9, "a3": 0.1}
    story, _ = _run(monkeypatch, articles, claims=[claim], on_story=on_story, on_story_calls=calls)
    assert [s.domain for s in story.sources] == ["cnn.com", "foxnews.com"]
    (input, questions), = calls
    assert input["story"] == "flood in valencia"
    assert [a["id"] for a in input["articles"]] == ["a0", "a1", "a2", "a3"]
    assert "`a1`" in questions["a1"]


def test_checked_article_is_kept_even_if_nothing_else_is_on_the_story(monkeypatch):
    item = Ingested(platform="article", url="https://www.theguardian.com/world/story", title="Story")
    story, _ = _run(monkeypatch, [_article("coursera.org")], item=item, on_story={"a0": 0.01})
    assert [s.domain for s in story.sources] == ["theguardian.com"]


def test_decisions_client_asks_named_predicates_in_one_request(monkeypatch):
    usage = {"input_tokens": 90, "input_tokens_details": {"cache_write_tokens": 0, "cached_tokens": 0}, "output_tokens": 0, "output_tokens_details": {"reasoning_tokens": 0}, "total_tokens": 90}
    sent = _fake_client(monkeypatch, Decision.model_validate({
        "model": "gpt-6-luna",
        "answers": [
            {"type": "predicate", "name": "a0", "probability": 0.94},
            {"type": "refusal", "name": "a1"},
        ],
        "usage": usage,
    }))
    answers = asyncio.run(decisions.predicates({"story": "x"}, {"a0": "First holds", "a1": "Second holds"}))
    assert answers == {"a0": 0.94}
    (request,) = sent
    assert request["questions"] == [
        {"type": "predicate", "name": "a0", "instructions": "First holds"},
        {"type": "predicate", "name": "a1", "instructions": "Second holds"},
    ]


def test_article_reports_its_own_outlets_lean(monkeypatch):
    item = Ingested(platform="article", url="https://www.theguardian.com/world/story", title="Story")
    story, _ = _run(monkeypatch, [_article("reuters.com")], item=item)
    assert story.subject_outlet == "The Guardian"
    assert story.subject_lean == "left"


def test_no_coverage_for_content_that_isnt_news(monkeypatch):
    story, _ = _run(monkeypatch, [], query="")
    assert story is None
