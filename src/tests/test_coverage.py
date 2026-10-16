import asyncio
import json
import os
import tempfile

import httpx

os.environ.setdefault("DATA_DIR", tempfile.mkdtemp(prefix="trust0-test-"))

from app.db import init_db  # noqa: E402
from app.pipeline import coverage, outlets  # noqa: E402
from app.services import jev  # noqa: E402
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


def _run(monkeypatch, articles, claims=(), query="flood in valencia", item=None, estimates=None, jev_answer=..., jev_calls=None, on_story=None, on_story_calls=None):
    """jev_answer: Jev's lean answer (a jev.Choice, or None for a failed call); left out, Jev isn't configured.
    on_story: probabilities by question name for the relevance check; None keeps every article."""

    async def fake_nouls(state, questions):
        if on_story_calls is not None:
            on_story_calls.append((state, questions))
        return on_story

    async def fake_news(q, client):
        return articles

    async def fake_research(**kwargs):
        return estimates

    async def fake_choice(state, instructions, criteria, assets=None):
        if jev_calls is not None:
            jev_calls.append(state)
        return jev_answer

    monkeypatch.setattr(coverage.external, "search_news", fake_news)
    monkeypatch.setattr(coverage.llm, "research", fake_research)
    monkeypatch.setattr(coverage.jev, "choice", fake_choice)
    monkeypatch.setattr(coverage.jev, "nouls", fake_nouls)
    monkeypatch.setattr(coverage.get_settings(), "serpapi_api_key", "test")
    monkeypatch.setattr(type(coverage.get_settings()), "has_llm", property(lambda self: True))
    monkeypatch.setattr(type(coverage.get_settings()), "has_jev", property(lambda self: jev_answer is not ...))
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


def test_jev_rates_the_lean_from_the_llms_evidence(monkeypatch):
    calls = []
    answer = jev.Choice(choice="lean-left", probabilities={"lean-left": 0.9, "left": 0.1}, confidence=0.88)
    story, _ = _run(monkeypatch, [_article("decided.example")], estimates=_estimate("decided.example", lean="center"), jev_answer=answer, jev_calls=calls)
    source = story.sources[0]
    assert (source.lean, source.rating, source.lean_confidence) == ("lean-left", "estimated", 0.88)
    # Jev judges the write-up on its own: the LLM's label isn't in the state
    assert calls == [{"domain": "decided.example", "name": "Some Paper", "evidence": _estimate("x").outlets[0].evidence}]
    # Cached with its confidence, so a later check shows the same thing without asking again
    story, _ = _run(monkeypatch, [_article("decided.example")], jev_answer=None, jev_calls=calls)
    assert (story.sources[0].lean, story.sources[0].lean_confidence) == ("lean-left", 0.88)
    assert len(calls) == 1


def test_outlet_stays_unrated_when_jev_is_unsure(monkeypatch):
    answer = jev.Choice(choice="right", probabilities={"right": 0.4, "lean-right": 0.35, "center": 0.25}, confidence=0.28)
    story, _ = _run(monkeypatch, [_article("unsure.example")], estimates=_estimate("unsure.example", lean="right"), jev_answer=answer)
    source = story.sources[0]
    assert (source.lean, source.rating, source.lean_confidence) == (None, None, 0.28)
    assert story.unrated == 1


def test_outlet_stays_unrated_when_jev_picks_unrated(monkeypatch):
    answer = jev.Choice(choice="unrated", probabilities={"unrated": 0.95, "center": 0.05}, confidence=0.94)
    story, _ = _run(monkeypatch, [_article("norating.example")], estimates=_estimate("norating.example", evidence="No rater covers it."), jev_answer=answer)
    assert story.sources[0].lean is None


def test_llm_label_is_used_when_jev_fails(monkeypatch):
    story, _ = _run(monkeypatch, [_article("jevdown.example")], estimates=_estimate("jevdown.example", lean="lean-right"), jev_answer=None)
    source = story.sources[0]
    assert (source.lean, source.rating, source.lean_confidence) == ("lean-right", "estimated", None)


def _mock_jev(monkeypatch, *responses):
    """Point jev.ask at a mock transport answering with `responses` in turn; returns the requests it saw."""
    sent = []
    replies = iter(responses)

    def handler(request):
        sent.append(request)
        return next(replies)

    real_client = httpx.AsyncClient
    monkeypatch.setattr(jev.httpx, "AsyncClient", lambda **kw: real_client(transport=httpx.MockTransport(handler)))
    monkeypatch.setattr(jev.get_settings(), "typesafe_api_key", "ts_test")

    async def no_sleep(_):
        pass

    monkeypatch.setattr(jev.asyncio, "sleep", no_sleep)
    return sent


def _answers(answers):
    return httpx.Response(200, json={"model": "jev-1.14.0", "answers": answers, "usage": {"input_tokens": 120, "output_tokens": 4}})


def test_jev_client_retries_when_overloaded_and_reads_a_choice(monkeypatch):
    sent = _mock_jev(
        monkeypatch,
        httpx.Response(529, json={"error": "overloaded"}),
        _answers({"answer": {"type": "choice", "choice": "center", "probabilities": {"center": 0.8, "unrated": 0.2}, "confidence": 0.73}}),
    )
    answer = asyncio.run(jev.choice({"evidence": "x"}, "Which?", {"center": None, "unrated": None}))
    assert answer == jev.Choice(choice="center", probabilities={"center": 0.8, "unrated": 0.2}, confidence=0.73)
    assert len(sent) == 2
    assert sent[0].headers["authorization"] == "Bearer ts_test"
    assert "typesafe-danger-zone-images" not in sent[0].headers


def test_jev_client_gives_up_on_a_bad_key(monkeypatch):
    _mock_jev(monkeypatch, httpx.Response(401, json={"error": "invalid key"}))
    assert asyncio.run(jev.choice("state", "Which?", {"a": None})) is None


def test_jev_client_asks_nouls_in_one_request(monkeypatch):
    sent = _mock_jev(monkeypatch, _answers({"a0": {"type": "noul", "noul": 0.94}, "a1": {"type": "noul", "noul": 0.1}}))
    answers = asyncio.run(jev.nouls({"story": "x"}, {"a0": "First holds", "a1": "Second holds"}))
    assert answers == {"a0": 0.94, "a1": 0.1}
    (request,) = sent
    assert json.loads(request.content)["questions"] == {"a0": {"type": "noul", "instructions": "First holds"}, "a1": {"type": "noul", "instructions": "Second holds"}}


def test_jev_client_sends_images_as_assets_with_the_preview_header(monkeypatch, tmp_path):
    from PIL import Image

    frame = tmp_path / "frame.png"
    Image.new("RGB", (200, 120), "white").save(frame)  # smaller than Jev accepts: gets scaled up
    ref, asset = jev.image_asset(frame)
    sent = _mock_jev(monkeypatch, _answers({"answer": {"type": "choice", "choice": "camera", "probabilities": {"camera": 0.9, "ai-generated": 0.1}, "confidence": 0.85}}))
    answer = asyncio.run(jev.choice({"image": ref}, "How was `image` made?", {"camera": "c", "ai-generated": "a"}, assets={ref: asset}))
    assert answer.choice == "camera"
    (request,) = sent
    body = json.loads(request.content)
    assert request.headers["typesafe-danger-zone-images"] == "true"
    assert body["state"] == {"image": ref} and set(body["assets"]) == {ref}
    assert body["assets"][ref]["format"] == "jpg" and "data:" not in body["assets"][ref]["data_base64"]
    import base64, io
    with Image.open(io.BytesIO(base64.b64decode(body["assets"][ref]["data_base64"]))) as sent_image:
        assert min(sent_image.size) >= jev.MIN_SIDE and max(sent_image.size) <= jev.MAX_SIDE


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
    (state, questions), = calls
    assert state["story"] == "flood in valencia"
    assert [a["url"] for a in state["articles"]][1] == "https://www.coursera.org/story"
    # Each question points at its article by state path
    assert "`articles[1]`" in questions["a1"]


def test_checked_article_is_kept_even_if_nothing_else_is_on_the_story(monkeypatch):
    item = Ingested(platform="article", url="https://www.theguardian.com/world/story", title="Story")
    story, _ = _run(monkeypatch, [_article("coursera.org")], item=item, on_story={"a0": 0.01})
    assert [s.domain for s in story.sources] == ["theguardian.com"]


def test_article_reports_its_own_outlets_lean(monkeypatch):
    item = Ingested(platform="article", url="https://www.theguardian.com/world/story", title="Story")
    story, _ = _run(monkeypatch, [_article("reuters.com")], item=item)
    assert story.subject_outlet == "The Guardian"
    assert story.subject_lean == "left"


def test_no_coverage_for_content_that_isnt_news(monkeypatch):
    story, _ = _run(monkeypatch, [], query="")
    assert story is None


def test_failed_jev_calls_are_noted_in_skipped(monkeypatch):
    # TYPESAFE_API_KEY set, but both the relevance check and the lean call fail: each falls back and says so
    story, skipped = _run(monkeypatch, [_article("jevfails.example")], estimates=_estimate("jevfails.example", lean="lean-right"), jev_answer=None)
    assert story.sources[0].lean == "lean-right"
    assert coverage.ON_STORY_UNAVAILABLE in skipped
    assert "Jev outlet rating unavailable for 1 outlet; the LLM's lean label was used" in skipped


def test_no_jev_notes_without_a_key_or_when_jev_answers(monkeypatch):
    _, skipped = _run(monkeypatch, [_article("nokey.example")], estimates=_estimate("nokey.example", lean="center"))
    assert skipped == []
    answer = jev.Choice(choice="center", probabilities={"center": 0.9}, confidence=0.8)
    _, skipped = _run(monkeypatch, [_article("answered.example")], estimates=_estimate("answered.example"), jev_answer=answer, on_story={"a0": 0.9})
    assert skipped == []


def test_failed_lean_call_is_noted_even_without_a_news_story(monkeypatch):
    claim = Claim(text="c", verdict="supported", explanation="e", sources=[SourceRef(title="t", url="https://www.claimpaper.example/a", publisher="Paper")])
    story, skipped = _run(monkeypatch, [], claims=[claim], query="", estimates=_estimate("claimpaper.example", lean="left"), jev_answer=None)
    assert story is None
    assert skipped == ["Jev outlet rating unavailable for 1 outlet; the LLM's lean label was used"]

