from pathlib import Path

from PIL import Image, ImageDraw

from app.pipeline import media
from app.pipeline.platforms import canonical_url, content_key, detect_platform
from app.pipeline.scoring import assess, assess_media, assess_text
from app.schemas import Claim
from app.services.schema import strict_schema
from app.pipeline.factcheck import FactFindings


def test_detects_platforms():
    assert detect_platform("https://x.com/a/status/1") == "x"
    assert detect_platform("https://mobile.twitter.com/a/status/1") == "x"
    assert detect_platform("https://www.instagram.com/reel/abc/") == "instagram"
    assert detect_platform("https://youtu.be/abc") == "youtube"
    assert detect_platform("https://vm.tiktok.com/xyz") == "tiktok"
    assert detect_platform("https://www.reuters.com/world/story") == "article"
    assert detect_platform("https://i.pinimg.com/1200x/be/56/18/be5618.jpg") == "image"
    assert detect_platform("https://example.com/photo.PNG?w=800") == "image"
    assert detect_platform("https://example.com/jpg-guide") == "article"


def test_canonical_url_drops_tracking_and_normalises_hosts():
    assert canonical_url("https://twitter.com/a/status/1?s=20&t=abc") == "https://x.com/a/status/1"
    assert canonical_url("https://youtu.be/jNQXAC9IVRw?si=xyz") == "https://youtube.com/watch?v=jNQXAC9IVRw"
    assert canonical_url("https://www.youtube.com/shorts/abc123") == "https://youtube.com/watch?v=abc123"
    assert canonical_url("https://www.youtube.com/watch?v=abc&utm_source=x") == "https://youtube.com/watch?v=abc"
    assert canonical_url("instagram.com/reel/C9x/?igsh=1") == "https://instagram.com/reel/C9x"


def test_content_key_matches_reposted_urls():
    assert content_key(url="https://twitter.com/a/status/1?s=20") == content_key(url="https://x.com/a/status/1")
    assert content_key(text="Hello   World") == content_key(text="hello world")


def _claim(verdict: str) -> Claim:
    return Claim(text=f"claim {verdict}", verdict=verdict, explanation="", sources=[])


def _media(**overrides):
    args = dict(kind="video", has_media=True, ai_probability=None, embedded=None, originality="unknown", visual_matches=0, has_origin=False, modifications=[], claims=[])
    return assess(**(args | overrides))


def test_ai_detector_drives_likely_ai():
    result = _media(ai_probability=0.92)
    assert result.verdict == "likely-ai"
    assert result.trust_score < 40


def test_embedded_ai_marker_drives_likely_ai():
    assert _media(embedded="ai-generated").verdict == "likely-ai"


def test_one_detector_just_over_the_line_is_not_enough():
    # The misty landscape reel: t0-vision 0.72, nothing else
    result = _media(ai_probability=0.72, detectors={"t0-vision": 0.72}, originality="original")
    assert result.verdict == "unverified"
    assert any("no second signal" in c.label for c in result.checks)


def test_visual_review_agreeing_makes_it_likely_ai():
    result = _media(ai_probability=0.72, detectors={"t0-vision": 0.72}, ai_review=0.66)
    assert result.verdict == "likely-ai"
    assert any(c.label.startswith("Visual review agrees") for c in result.checks)


def test_visual_review_disagreeing_keeps_it_unverified():
    # Even a very sure detector can't call it AI when the review says camera footage
    result = _media(ai_probability=0.97, detectors={"t0-vision": 0.97}, ai_review=0.2, originality="original")
    assert result.verdict == "unverified"
    assert any("looks like camera footage" in c.label for c in result.checks)


def test_two_detectors_agreeing_make_it_likely_ai():
    assert _media(ai_probability=0.8, detectors={"t0-vision": 0.75, "hive": 0.85}).verdict == "likely-ai"


def test_visual_review_alone_never_flags_media():
    # A clean detector plus a review leaning AI is unverified, not likely-ai and not authentic
    result = _media(ai_probability=0.05, detectors={"t0-vision": 0.05}, ai_review=0.7, originality="original")
    assert result.verdict == "unverified"
    clean = _media(ai_probability=0.05, detectors={"t0-vision": 0.05}, ai_review=0.1, originality="original")
    assert clean.verdict == "authentic"


def test_untraced_media_without_detector_is_not_called_authentic():
    assert _media(originality="original").verdict == "unverified"


def test_reupload_traced_to_source_is_authentic():
    assert _media(originality="reupload", has_origin=True, visual_matches=2).verdict == "authentic"


def test_false_caption_on_real_media_is_edited():
    assert _media(originality="reupload", claims=[_claim("refuted")]).verdict == "edited"
    assert _media(originality="modified-reupload", modifications=["caption changes location"]).verdict == "edited"


def test_text_verdicts():
    text = dict(kind="ai-response", has_media=False)
    assert _media(**text, claims=[_claim("supported"), _claim("supported")]).verdict == "accurate"
    assert _media(**text, claims=[_claim("supported"), _claim("refuted")]).verdict == "inaccurate"
    assert _media(**text, claims=[_claim("supported"), _claim("supported"), _claim("mixed")]).verdict == "mixed"
    assert _media(**text, claims=[_claim("unverifiable")]).verdict == "unverified"
    assert _media(**text, claims=[]).verdict == "unverified"


def test_post_text_and_media_are_judged_separately():
    # Real photo with a false caption: the image is authentic, the text is not
    image = assess_media(ai_probability=0.05, embedded=None, originality="reupload", visual_matches=2, has_origin=True, modifications=[])
    text = assess_text([_claim("refuted")])
    assert image.verdict == "authentic"
    assert text.verdict == "inaccurate"
    assert image.trust_score > text.trust_score
    assert not any("claim" in c.label for c in image.checks)


def test_empty_sections_say_so():
    assert assess_text([]).checks[0].label == "No checkable claims in the text"
    assert assess_media(ai_probability=None, embedded=None, originality="unknown", visual_matches=0, has_origin=False, modifications=[]).verdict == "unverified"


def test_link_preview_reads_meta_tags_in_any_order():
    from app.pipeline.linkpreview import LinkPreview, _apply_html

    html = """<head><title>Fallback</title>
    <meta content="Ferrari collection" property="og:title">
    <meta property='og:image' content='/img/a.jpg' />
    <meta name="description" content="Four cars &amp; a garage"></head>"""
    result = LinkPreview(url="https://example.com/post")
    _apply_html(result, html, "https://example.com/post")
    assert result.title == "Ferrari collection"
    assert result.image == "https://example.com/img/a.jpg"
    assert result.description == "Four cars & a garage"


def test_link_preview_titles_blocked_pages_from_the_slug():
    from app.pipeline.linkpreview import _slug_title

    assert _slug_title("https://reddit.com/r/carporn/comments/1hjkc5b/ferrari_daytona_sp3_and_458") == "Ferrari daytona sp3 and 458"
    assert _slug_title("https://example.com/") == ""


def test_link_preview_refuses_private_hosts():
    import asyncio

    import pytest

    from app.pipeline.linkpreview import BlockedHost, _check_public

    for url in ("http://127.0.0.1:8000/v1/health", "http://localhost/", "http://169.254.169.254/latest", "file:///etc/passwd"):
        with pytest.raises(BlockedHost):
            asyncio.run(_check_public(url))


def test_strict_schema_closes_every_object():
    schema = strict_schema(FactFindings)

    def objects(node):
        if isinstance(node, dict):
            if node.get("type") == "object":
                yield node
            for value in node.values():
                yield from objects(value)
        elif isinstance(node, list):
            for value in node:
                yield from objects(value)

    found = list(objects(schema))
    assert len(found) >= 3  # findings, claim, source
    for obj in found:
        assert obj["additionalProperties"] is False
        assert set(obj["required"]) == set(obj["properties"])
    assert "$defs" not in schema and "$ref" not in str(schema)


def _picture(path: Path, shift: int = 0, size=(320, 240)) -> Path:
    image = Image.new("RGB", size, "white")
    draw = ImageDraw.Draw(image)
    draw.rectangle((40 + shift, 40, 160 + shift, 200), fill="black")
    draw.ellipse((180, 60, 300, 180), fill="red")
    image.save(path)
    return path


def test_reencoded_copy_matches_but_different_picture_does_not(tmp_path):
    original = _picture(tmp_path / "a.png")
    # Re-upload: resized and saved as a lossy JPEG
    with Image.open(original) as img:
        img.resize((160, 120)).save(tmp_path / "b.jpg", quality=40)
    other = Image.new("RGB", (320, 240), "white")
    ImageDraw.Draw(other).line((0, 0, 320, 240), fill="blue", width=30)
    other.save(tmp_path / "c.png")

    a, b, c = (media.hash_frames([p]) for p in (original, tmp_path / "b.jpg", tmp_path / "c.png"))
    assert media.frame_similarity(a, b) == 1.0
    assert media.frame_similarity(a, c) == 0.0


def test_embedded_ai_marker_detected(tmp_path):
    marked = tmp_path / "gen.jpg"
    marked.write_bytes(b"\xff\xd8...<Iptc4xmpExt:DigitalSourceType>http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia</...")
    plain = _picture(tmp_path / "plain.png")
    assert media.embedded_provenance(marked) == "ai-generated"
    assert media.embedded_provenance(plain) == "none"


def test_content_urls_exclude_profiles():
    from app.pipeline.platforms import is_content_url

    assert is_content_url("https://x.com/a/status/123")
    assert not is_content_url("https://x.com/a")
    assert is_content_url("https://www.youtube.com/watch?v=abc")
    assert is_content_url("https://youtube.com/shorts/abc")
    assert not is_content_url("https://www.youtube.com/@jawed")
    assert is_content_url("https://www.instagram.com/reel/C9x/")
    assert not is_content_url("https://www.instagram.com/someone/")
    assert is_content_url("https://www.reddit.com/r/pics/comments/1f/title/")
    assert is_content_url("https://www.reuters.com/world/some-story")
    assert not is_content_url("https://www.reuters.com/")


def test_hive_score_found_in_nested_response():
    from app.services.external import hive_class_score

    body = {
        "status": [
            {
                "response": {
                    "output": [
                        {"time": 0, "classes": [{"class": "ai_generated", "score": 0.12}, {"class": "not_ai_generated", "score": 0.88}]},
                        {"time": 1, "classes": [{"class": "ai_generated", "score": 0.91}, {"class": "midjourney", "score": 0.7}]},
                    ]
                }
            }
        ]
    }
    assert hive_class_score(body, "ai_generated") == 0.91
    assert hive_class_score({"status": []}, "ai_generated") is None


def test_local_models_skip_cleanly_when_not_configured(monkeypatch, tmp_path):
    import asyncio

    from app.config import get_settings
    from app.services import local_models

    monkeypatch.setattr(get_settings(), "t0_vision_model_path", "")
    monkeypatch.setattr(get_settings(), "whisper_model", "")
    frame = tmp_path / "f.jpg"
    Image.new("RGB", (64, 64)).save(frame)
    assert asyncio.run(local_models.ai_generated_score([frame])) is None
    assert asyncio.run(local_models.transcribe(frame)) == ""


def test_detector_scores_are_averaged_into_one_probability(monkeypatch):
    import asyncio

    from app.pipeline import runner
    from app.services import external, local_models

    async def t0(frames):
        return 0.9

    async def hive(frames, client):
        return 0.5

    class RecordingProgress:
        def __init__(self):
            self.events = []

        async def start(self, step_id, detail=None):
            self.events.append(("start", step_id, detail))

        async def complete(self, step_id, detail=None):
            self.events.append(("complete", step_id, detail))

        async def skip(self, step_id, detail):
            self.events.append(("skip", step_id, detail))

    review_result = runner.visual_review.Review(0.25, [0.2, 0.3], "jev-1.14.0")
    seen_keys = []

    async def review(frames, key=None):
        seen_keys.append(key)
        return review_result, []

    monkeypatch.setattr(local_models, "ai_generated_score", t0)
    monkeypatch.setattr(external, "ai_generated_score", hive)
    monkeypatch.setattr(runner.visual_review, "ai_review", review)
    progress = RecordingProgress()
    # The visual review is returned beside the detectors, not averaged into them
    assert asyncio.run(runner._detect_ai([Path("x.jpg")], None, progress, "c3d4")) == ({"t0-vision": 0.9, "hive": 0.5}, review_result, [])
    assert seen_keys == ["c3d4"]  # the first keyframe's hash, so a re-upload can reuse the review
    assert progress.events[-1] == ("complete", "ai", "70% likely AI-generated · t0-vision, hive · visual review 25%")

    skipped = RecordingProgress()
    assert asyncio.run(runner._detect_ai([], None, skipped)) == ({}, None, [])
    assert skipped.events == [("skip", "ai", "No image or video to scan")]


def test_httpx_request_urls_are_not_logged():
    import logging

    import app.main  # noqa: F401

    assert logging.getLogger("httpx").getEffectiveLevel() >= logging.WARNING


def test_parses_reverse_search_dates():
    from app.pipeline.ingest import _parse_date

    assert _parse_date("Aug 1, 2018").date().isoformat() == "2018-08-01"


def test_square_thumbnail_matches_portrait_original(tmp_path):
    original = tmp_path / "portrait.jpg"
    image = Image.new("RGB", (300, 500), "white")
    draw = ImageDraw.Draw(image)
    draw.polygon([(40, 300), (150, 120), (260, 300)], fill="gray")
    draw.rectangle((0, 340, 300, 500), fill="darkgreen")
    draw.ellipse((120, 400, 160, 430), fill="black")
    image.save(original)
    thumb = tmp_path / "thumb.jpg"
    image.crop((0, 100, 300, 400)).resize((92, 92)).save(thumb, quality=70)

    thumb_hash = media.hash_frames([thumb])
    full = media.hash_frames([original])
    assert media.frame_similarity(thumb_hash, full) == 0.0  # full frame alone misses the square crop
    assert media.frame_similarity(thumb_hash, full + media.crop_hashes([original])) == 1.0


def test_undated_matches_do_not_claim_the_submission_is_earliest():
    from app.pipeline.ingest import Ingested
    from app.pipeline.provenance import Candidate, _assemble

    item = Ingested(platform="article", url="https://img.example/a.jpg")
    matches = [Candidate("someone", "article", f"https://site{i}.example/p", None, "same", "visual-match", 1.0) for i in range(2)]
    result = _assemble(item, matches, None, [])
    assert result.originality == "unknown"
    assert "couldn't be determined" in result.summary


def test_unknown_originality_never_guesses_an_origin_from_undated_matches():
    """Regression: Claude saying 'I couldn't confirm an origin' (originality=unknown) must not still get
    an arbitrary visual-match candidate marked as the origin just because *a* chain existed."""
    from app.pipeline.ingest import Ingested
    from app.pipeline.provenance import Candidate, ProvenanceFindings, ResearchedStep, _assemble

    item = Ingested(platform="article", url="https://img.example/a.jpg")
    matches = [Candidate("someone", "pinterest", "https://pinterest.example/p/1", None, "same", "visual-match", 1.0)]
    findings = ProvenanceFindings(
        originality="unknown",
        chain=[ResearchedStep(account="someone", platform="pinterest", url="https://pinterest.example/p/1", posted_at=None, note="found but undated")],
        modifications=[],
        summary="Couldn't confirm the original photographer or any dates.",
    )
    result = _assemble(item, matches, findings, [])
    assert result.originality == "unknown"
    assert result.origin_url is None
    assert all(not s.is_origin for s in result.spread)


def test_has_llm_respects_the_selected_provider():
    from app.config import Settings

    assert Settings(llm_provider="anthropic", anthropic_api_key="k").has_llm is True
    assert Settings(llm_provider="anthropic", anthropic_api_key="").has_llm is False
    assert Settings(llm_provider="openai", openai_api_key="k").has_llm is True
    assert Settings(llm_provider="openai", anthropic_api_key="k").has_llm is False  # wrong key for the provider
    assert Settings(llm_provider="openrouter", openrouter_api_key="k", openrouter_model="openai/gpt-5.1").has_llm is True
    assert Settings(llm_provider="openrouter", openrouter_api_key="k", openrouter_model="").has_llm is False  # no model picked


def test_llm_dispatches_to_the_configured_provider(monkeypatch):
    import asyncio

    from app.config import get_settings
    from app.services import claude, llm, openai_compat
    from pydantic import BaseModel

    class Out(BaseModel):
        ok: bool

    async def fake_claude(**kw):
        return Out(ok=True)

    async def fake_openai_compat(**kw):
        return Out(ok=False)

    monkeypatch.setattr(claude, "research", fake_claude)
    monkeypatch.setattr(openai_compat, "research", fake_openai_compat)

    monkeypatch.setattr(get_settings(), "llm_provider", "anthropic")
    assert asyncio.run(llm.research(system="s", prompt="p", output=Out)).ok is True

    monkeypatch.setattr(get_settings(), "llm_provider", "openrouter")
    assert asyncio.run(llm.research(system="s", prompt="p", output=Out)).ok is False


def test_openai_compat_parses_tool_call_arguments():
    from app.services.openai_compat import _parse
    from pydantic import BaseModel

    class Out(BaseModel):
        value: int

    assert _parse(Out, '{"value": 3}') == Out(value=3)
    assert _parse(Out, "not json") is None
    assert _parse(Out, '{"wrong_field": 1}') is None
