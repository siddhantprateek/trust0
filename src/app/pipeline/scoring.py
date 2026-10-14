"""Turn stage results into the verdict, trust score and the checklist shown in the studio and extension.

Kept deliberately simple and transparent: every point added or removed corresponds to a check the user can see.
"""

from dataclasses import dataclass

from app.schemas import Claim, ReportCheck, Verdict

TEXT_KINDS = {"ai-response", "selection", "message", "text", "article", "page"}

AI_LIKELY = 0.7
AI_POSSIBLE = 0.4


@dataclass
class Assessment:
    verdict: Verdict
    trust_score: int
    checks: list[ReportCheck]


def assess(
    *,
    kind: str,
    has_media: bool,
    ai_probability: float | None,
    embedded: str | None,
    originality: str,
    visual_matches: int,
    has_origin: bool,
    modifications: list[str],
    claims: list[Claim],
) -> Assessment:
    media_delta, checks = _media_checks(has_media, ai_probability, embedded, originality, visual_matches, has_origin, modifications)
    claims_delta, claim_checks, counts = _claim_checks(claims)
    checks += claim_checks
    score = 60.0 + media_delta + claims_delta

    if not checks:
        # Nothing could be checked (no claims, no media signals): say so instead of showing an empty list
        checks.append(ReportCheck(ok=False, label="Not enough evidence to verify this yet"))
        score = 50

    return Assessment(verdict=_verdict(kind, has_media, ai_probability, embedded, originality, counts, claims), trust_score=_clamp(score), checks=checks)


def assess_media(
    *,
    ai_probability: float | None,
    embedded: str | None,
    originality: str,
    visual_matches: int,
    has_origin: bool,
    modifications: list[str],
) -> Assessment:
    """The picture or video on its own: generated, edited, or traced to a source. The caption plays no part."""
    delta, checks = _media_checks(True, ai_probability, embedded, originality, visual_matches, has_origin, modifications)
    score = 60.0 + delta
    if not checks:
        checks.append(ReportCheck(ok=False, label="Not enough evidence to verify the media yet"))
        score = 50
    verdict = _verdict("post", True, ai_probability, embedded, originality, _counts([]), [])
    return Assessment(verdict=verdict, trust_score=_clamp(score), checks=checks)


def assess_text(claims: list[Claim]) -> Assessment:
    """The post's caption, description or speech on its own, judged by its claims like any other text."""
    delta, checks, counts = _claim_checks(claims)
    score = 60.0 + delta
    if not checks:
        checks.append(ReportCheck(ok=False, label="No checkable claims in the text"))
        score = 50
    verdict = _verdict("text", False, None, None, "unknown", counts, claims)
    return Assessment(verdict=verdict, trust_score=_clamp(score), checks=checks)


def _clamp(score: float) -> int:
    return int(max(0, min(100, round(score))))


def _counts(claims: list[Claim]) -> dict[str, int]:
    return {v: sum(1 for c in claims if c.verdict == v) for v in ("supported", "refuted", "mixed", "unverifiable")}


def _media_checks(has_media, ai_probability, embedded, originality, visual_matches, has_origin, modifications) -> tuple[float, list[ReportCheck]]:
    checks: list[ReportCheck] = []
    score = 0.0

    # --- AI generation ---
    if embedded == "ai-generated":
        checks.append(ReportCheck(ok=False, label="File metadata marks it as AI-generated"))
        score -= 40
    elif embedded == "content-credentials":
        checks.append(ReportCheck(ok=True, label="Carries content credentials (C2PA)"))
        score += 5
    if ai_probability is not None:
        if ai_probability >= AI_LIKELY:
            checks.append(ReportCheck(ok=False, label=f"AI-generation detector: {ai_probability:.0%} likely generated"))
            score -= 40
        elif ai_probability >= AI_POSSIBLE:
            checks.append(ReportCheck(ok=False, label=f"AI-generation detector: possibly generated ({ai_probability:.0%})"))
            score -= 15
        else:
            checks.append(ReportCheck(ok=True, label=f"No generation artifacts detected ({ai_probability:.0%})"))
            score += 10

    # --- Provenance ---
    if has_media or originality != "unknown":
        if originality == "original":
            checks.append(ReportCheck(ok=True, label="No earlier uploads found; this looks like the original"))
            score += 10
        elif originality == "reupload":
            checks.append(ReportCheck(ok=True, label="Re-upload of earlier media, traced to its source"))
        elif originality == "modified-reupload":
            detail = f": {modifications[0]}" if modifications else ""
            checks.append(ReportCheck(ok=False, label=f"Changed from the original{detail}"))
            score -= 20
        elif has_media:
            checks.append(ReportCheck(ok=False, label="Could not trace where this media first appeared"))
            score -= 5
        if visual_matches:
            checks.append(ReportCheck(ok=True, label=f"Matched {visual_matches} other upload(s) of the same media"))
        if has_origin:
            score += 5
    return score, checks


def _claim_checks(claims: list[Claim]) -> tuple[float, list[ReportCheck], dict[str, int]]:
    counts = _counts(claims)
    checks: list[ReportCheck] = []
    score = 0.0
    for claim in claims:
        ok = claim.verdict == "supported"
        prefix = {"supported": "Supported", "refuted": "Contradicted by sources", "mixed": "Partly true", "unverifiable": "Unverified"}[claim.verdict]
        checks.append(ReportCheck(ok=ok, label=f"{prefix}: {claim.text}"))
    if claims:
        checked = len(claims)
        score += 25 * counts["supported"] / checked
        score -= 45 * counts["refuted"] / checked
        score -= 15 * counts["mixed"] / checked
    return score, checks, counts


def _verdict(kind, has_media, ai_probability, embedded, originality, counts, claims) -> Verdict:
    if embedded == "ai-generated" or (ai_probability is not None and ai_probability >= AI_LIKELY):
        return "likely-ai"

    if kind in TEXT_KINDS and not has_media:
        if not claims or counts["unverifiable"] == len(claims):
            return "unverified"
        if counts["refuted"] and counts["refuted"] >= counts["supported"]:
            return "inaccurate"
        if counts["refuted"] or counts["mixed"]:
            return "mixed"
        return "accurate"

    # Media: a false caption on real footage is "edited" (manipulated context), not authentic
    if originality == "modified-reupload" or counts["refuted"]:
        return "edited"
    if counts["mixed"] or (ai_probability is not None and ai_probability >= AI_POSSIBLE):
        return "unverified"
    # "Authentic" needs positive evidence: a clean detector result, or the media traced back to an earlier source.
    # An untraced original with no detector run could just as well be generated.
    detector_clear = ai_probability is not None
    if originality == "reupload" or (detector_clear and (originality == "original" or counts["supported"])):
        return "authentic"
    return "unverified"
