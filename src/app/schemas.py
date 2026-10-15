"""API models. Report mirrors the studio's Report type (studio/src/lib/types.ts) plus the evidence behind it."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

# "image" is a link straight to a picture file (i.pinimg.com/....jpg), as opposed to a page about it
SourceKind = Literal["instagram", "x", "youtube", "tiktok", "reddit", "facebook", "article", "image", "upload", "text"]

# Media verdicts match the studio; accurate/mixed/inaccurate are for text claims (AI answers, articles, selections)
Verdict = Literal["likely-ai", "edited", "authentic", "accurate", "mixed", "inaccurate", "unverified"]

ReportStatus = Literal["analyzing", "complete", "failed", "cancelled"]

CheckKind = Literal["ai-response", "post", "message", "video", "article", "image", "link", "selection", "page", "text", "upload"]


class CheckRequest(BaseModel):
    """What the extension sends. Studio link/text checks use the same shape."""

    kind: CheckKind = "link"
    url: str | None = None
    text: str | None = Field(default=None, max_length=20000)
    title: str | None = None
    platform: str | None = None
    media_url: str | None = Field(default=None, alias="mediaUrl")

    model_config = {"populate_by_name": True}


class ReportCheck(BaseModel):
    ok: bool
    label: str


class SpreadStep(BaseModel):
    account: str
    platform: str
    posted_at: str = Field(serialization_alias="postedAt")
    note: str
    url: str | None = None
    # How the step was found: explicit link in the post, visual match, reverse search hit, or web research
    evidence: Literal["metadata", "visual-match", "reverse-search", "research", "submitted"] = "research"
    is_origin: bool = Field(default=False, serialization_alias="isOrigin")


# Political lean of a news outlet (never of a fact). Ratings follow public media-bias raters; see pipeline/outlets.py
Lean = Literal["left", "lean-left", "center", "lean-right", "right"]


class SourceRef(BaseModel):
    url: str
    title: str | None = None
    publisher: str | None = None
    # Lean of the outlet that published this source, when it is a rated news outlet
    lean: Lean | None = None


class Claim(BaseModel):
    text: str
    verdict: Literal["supported", "refuted", "mixed", "unverifiable"]
    explanation: str
    sources: list[SourceRef] = []


class Signals(BaseModel):
    """Raw stage outputs that the verdict and score are computed from."""

    ai_generated_probability: float | None = Field(default=None, serialization_alias="aiGeneratedProbability")
    # Each detector's score, e.g. {"t0-vision": 0.12, "hive": 0.08}; ai_generated_probability is their mean
    ai_detectors: dict[str, float] = Field(default={}, serialization_alias="aiDetectors")
    c2pa: str | None = None  # "ai-generated" | "camera-capture" | "edited" | "none"
    originality: Literal["original", "reupload", "modified-reupload", "unknown"] = "unknown"
    origin_url: str | None = Field(default=None, serialization_alias="originUrl")
    skipped: list[str] = []


class Preview(BaseModel):
    """What the checked content looks like, so the studio can show it without re-fetching the original."""

    kind: Literal["image", "video", "text", "link"] = "link"
    # Small JPEG as a data URL, cut from a keyframe. Works for uploads and for platforms that block hotlinking.
    image: str | None = None
    # The platform's own thumbnail URL, used when we have no frame of our own
    remote_image: str | None = Field(default=None, serialization_alias="remoteImage")
    # API path of the checked image or video kept at full size (GET /v1/reports/{id}/media), for viewing it properly
    media_path: str | None = Field(default=None, serialization_alias="mediaPath")
    media_type: Literal["image", "video"] | None = Field(default=None, serialization_alias="mediaType")
    # A few keyframes of a video as small data URLs, so the clip can be skimmed without playing it
    frames: list[str] = []
    title: str = ""
    site: str = ""
    text: str = ""
    account: str = ""
    account_url: str | None = Field(default=None, serialization_alias="accountUrl")
    posted_at: datetime | None = Field(default=None, serialization_alias="postedAt")
    duration: float | None = None
    linked_urls: list[str] = Field(default=[], serialization_alias="linkedUrls")

    model_config = {"populate_by_name": True}


class ReportSection(BaseModel):
    """One part of a post judged on its own: its text (caption, description, speech) or its image/video."""

    kind: Literal["text", "media"]
    title: str
    verdict: Verdict = "unverified"
    trust_score: int = Field(default=0, serialization_alias="trustScore")
    summary: str = ""
    checks: list[ReportCheck] = []

    model_config = {"populate_by_name": True}


StepStatus = Literal["pending", "running", "complete", "skipped", "failed", "cancelled"]


class ReportStep(BaseModel):
    """One stage of the check pipeline, saved as it starts and ends so the studio can show live progress."""

    id: str
    label: str
    status: StepStatus = "pending"
    detail: str | None = None
    started_at: datetime | None = Field(default=None, serialization_alias="startedAt")
    ended_at: datetime | None = Field(default=None, serialization_alias="endedAt")

    model_config = {"populate_by_name": True}


class CoverageSource(BaseModel):
    """One outlet covering the story, Ground News style: one entry per outlet, however many articles it ran."""

    outlet: str
    domain: str
    url: str
    title: str | None = None
    published_at: str | None = Field(default=None, serialization_alias="publishedAt")
    lean: Lean | None = None
    # "table": from the curated ratings in pipeline/outlets.py. "estimated": researched by the LLM, cached per outlet
    rating: Literal["table", "estimated"] | None = None
    # How sure the decision model was of an estimated lean, 0-1. None for curated ratings and estimates made without it
    lean_confidence: float | None = Field(default=None, serialization_alias="leanConfidence")

    model_config = {"populate_by_name": True}


class Coverage(BaseModel):
    """Who is covering the story and how that coverage splits politically. Leans belong to outlets, not to facts."""

    query: str = ""
    sources: list[CoverageSource] = []
    left: int = 0
    center: int = 0
    right: int = 0
    unrated: int = 0
    # Shares of the rated sources, 0-100, summing to 100 when anything is rated
    left_pct: int = Field(default=0, serialization_alias="leftPct")
    center_pct: int = Field(default=0, serialization_alias="centerPct")
    right_pct: int = Field(default=0, serialization_alias="rightPct")
    # The side that is barely covering it (Ground News' "blindspot"), when coverage is lopsided
    blindspot: Literal["left", "right"] | None = None
    # Lean of the outlet that published the checked content itself
    subject_outlet: str | None = Field(default=None, serialization_alias="subjectOutlet")
    subject_lean: Lean | None = Field(default=None, serialization_alias="subjectLean")

    model_config = {"populate_by_name": True}


class Report(BaseModel):
    id: str
    title: str
    url: str
    source: SourceKind
    kind: CheckKind
    status: ReportStatus
    verdict: Verdict = "unverified"
    trust_score: int = Field(default=0, serialization_alias="trustScore")
    summary: str = ""
    created_at: datetime = Field(serialization_alias="createdAt")
    checks: list[ReportCheck] = []
    spread: list[SpreadStep] = []
    claims: list[Claim] = []
    signals: Signals = Signals()
    # Separate verdicts for a post's text and its media, when it has both. The top-level verdict covers the whole post
    sections: list[ReportSection] = []
    # Ground News-style coverage and bias distribution, for content about a news story
    coverage: Coverage | None = None
    preview: Preview | None = None
    error: str | None = None
    steps: list[ReportStep] = []

    model_config = {"populate_by_name": True}


class RunSummary(BaseModel):
    """A check that's running or just finished, without the heavy evidence, for the studio's background-runs list."""

    id: str
    title: str
    status: ReportStatus
    verdict: Verdict = "unverified"
    created_at: datetime = Field(serialization_alias="createdAt")
    steps: list[ReportStep] = []

    model_config = {"populate_by_name": True}


class ActiveSite(BaseModel):
    """A website the browser extension is allowed to run on automatically (manual right-click checks always work)."""

    domain: str
    added_at: datetime = Field(serialization_alias="addedAt")

    model_config = {"populate_by_name": True}


class AddActiveSite(BaseModel):
    domain: str


class CheckResponse(BaseModel):
    """Shape the extension reads (plugin/src/background.js normalize())."""

    id: str
    status: ReportStatus
    verdict: Verdict
    trust_score: int = Field(serialization_alias="trustScore")
    summary: str
    checks: list[ReportCheck]
    # Separate verdicts for a post's text and media, so the extension can show both like the studio does
    sections: list[ReportSection] = []
    report_url: str = Field(serialization_alias="reportUrl")
    poll_url: str = Field(serialization_alias="pollUrl")


# --- Models API ----------------------------------------------------------------------------------

ModelStatus = Literal["available", "offline", "coming-soon"]


class ModelInfo(BaseModel):
    """One of trust0's own models, as the studio's Models page and GET /v1/models list it."""

    id: str
    name: str
    task: str
    description: str
    inputs: list[str]
    labels: list[str]
    endpoint: str | None
    # "offline" is a released model this server hasn't loaded (no checkpoint configured)
    status: ModelStatus
    # Short, true facts the models page lists next to the description (limits, auth, how it runs)
    notes: list[str] = []

    model_config = {"populate_by_name": True}


class VisionPrediction(BaseModel):
    model: str
    label: str
    # Probability the image is AI-generated, 0–1
    ai_generated: float = Field(serialization_alias="aiGenerated")
    scores: dict[str, float]

    model_config = {"populate_by_name": True}


class ApiKey(BaseModel):
    id: str
    name: str
    prefix: str
    created_at: datetime = Field(serialization_alias="createdAt")
    last_used_at: datetime | None = Field(serialization_alias="lastUsedAt")

    model_config = {"populate_by_name": True, "from_attributes": True}


class CreatedApiKey(ApiKey):
    """Returned once, when the key is created. Only a hash is kept after that."""

    key: str


class CreateApiKey(BaseModel):
    name: str = Field(min_length=1, max_length=100)
