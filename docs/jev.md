# Jev in trust0

trust0 uses [Jev](https://docs.typesafe.ai/introduction), TypeSafe's System One model, for three small decisions where a wrong answer is costly and the uncertainty has to be visible:

1. **Outlet lean**: the political lean of a news outlet that isn't in our curated table.
2. **Coverage relevance**: which news search results are actually about the story.
3. **Visual review**: a second opinion on keyframes before media is called AI-generated.

Each one falls back to the behaviour before Jev when there's no `TYPESAFE_API_KEY` or the call fails, so no check ever breaks because of Jev. When a key is set and a call fails anyway, the report says so in `signals.skipped` (see [Failure handling](#failure-handling)).

The model is pinned to `jev-1.14.0`, every review's raw per-frame answers are stored in the report for later calibration, and a visual review is cached by the media's first keyframe so re-uploads don't ask Jev again.

Code: `src/app/services/jev.py` (client), `src/app/pipeline/coverage.py` (1 and 2), `src/app/pipeline/visual_review.py` and `src/app/pipeline/scoring.py` (3). Tests: `src/tests/test_coverage.py`, `src/tests/test_visual_review.py`, `src/tests/test_units.py`. Measurement script: `experiments/jev-review/eval.py`.

## What Jev is, briefly

You send Jev a **state** (text, JSON, or images) and typed **questions** about it. It doesn't write prose or search the web; it returns answers code can branch on:

| Primitive | Answer | We use it for |
|---|---|---|
| **Choice** | the picked option, a probability for every option, and a confidence | outlet lean, how a frame was made |
| **Noul** | probability (0–1) that a statement is true | whether an article is on the story |
| **Score** | probability-weighted position on 2–10 ordered levels, with confidence | not used yet |
| **Box** | a bounding box (fractions of width and height) and a confidence; preview, Jev 1.14 only | not used yet |

**Confidence** for a Choice is `(p_max − 1/n) / (1 − 1/n)`: 1 when all probability is on one option, 0 when it's spread evenly. It describes how concentrated the answer is, not the chance it's right. TypeSafe trains Jev for calibrated probabilities: over many answers given 0.8, about 80% should be right. That holds for groups of predictions in Jev's training domain, so we still measure on our own data before trusting a threshold.

Things TypeSafe documents that shaped our design:

- Jev leans slightly toward the **first option** in a Choice. We put the safe answer first.
- One narrow judgment per question works better than a compound one.
- Image models are weaker than text, and longer or noisier state hurts.

### Images, Box and Jev 1.14

As of Jev 1.14 (`jev-1.14.0`; the `jev-preview` alias points at it for now, and `jev-latest` moves to it about a week after release):

- **Images** work on Jev 1.13 and 1.14, behind the header `TypeSafe-Danger-Zone-Images: true`. TypeSafe calls them a "Dreamer-ready" preview, not production-ready: formats, answers and accuracy can change between releases.
- Each image is listed once in a top-level `assets` map under a reference string (we use `img-<uuid>`) and referenced anywhere in `state`, `instructions` or `criteria`. That means Choice options, Score levels and Noul definitions can be pictures.
  - Send base64 (`data_base64` plus `format`), or multipart file parts (about a third smaller).
  - PNG or JPEG only, 280–1,568 px per side, at most 16 MiB per image and 32 MiB per request.
  - No EXIF rotation is applied, and any bad image fails the whole request.
- Images are billed as ordinary input tokens. Our keyframes cost 700–3,300 tokens each.
- **Box** (Jev 1.14 only) returns one bounding box per question as normalised `top/bottom/left/right` edges, plus a confidence.
  - It always returns a box, even when the target isn't there; pair it with a Noul ("is there an X?") to check presence.
  - Small targets in big images may need tiling or cropping first.
- 1.14 also brings small broad quality gains (mostly multilingual), an opt-in long-context flag (`TypeSafe-Danger-Zone-Long-Context: true`, not recommended) and opt-in query sharing.
- Deprecation: 60 days for 1.13, 30 days for 1.14.

`JEV_MODEL` defaults to `jev-1.14.0`, pinned rather than the moving `jev-preview` alias: images are a preview feature whose answers can change between releases, and `REVIEW_AGREES` and `JEV_MIN_CONFIDENCE` were tuned on 1.14's answers. Moving to a new version is a deliberate change: rerun `experiments/jev-review/eval.py` on it first. 1.14 is deprecated 30 days after its successor ships.

## 1. Outlet lean

Coverage & bias shows how a news story's coverage splits Left / Center / Right. Lean belongs to outlets, never to facts. Outlets come from the curated table in `pipeline/outlets.py`, then the `outlets` cache, then a fresh estimate for the long tail.

A fresh estimate is two steps:

1. **The LLM researches** (it can search) and writes `evidence`: what kind of site it is, which raters (AllSides, Ad Fontes Media, Media Bias/Fact Check) rate it and how, and where they disagree. It still returns its own label, used only as a fallback.
2. **Jev decides.** It gets one Choice per outlet, run concurrently.
   - The state is `{domain, name, evidence}`, without the LLM's label, so Jev judges the evidence rather than echoing it.
   - The options are `unrated` (first, so Jev's first-option lean points at abstaining), then `left`, `lean-left`, `center`, `lean-right` and `right`. Each option is described in the raters' own vocabulary ("Lean Right", "Right-Center", "Skews Right").

Code then routes:

| Jev's answer | Shown |
|---|---|
| a lean, confidence ≥ `JEV_MIN_CONFIDENCE` (0.5) | that lean, "est.", with `leanConfidence` |
| a lean below 0.5, or `unrated` | unrated |
| no answer (no key, error, unknown option) | the LLM's label, `leanConfidence: null` |

With six options, 0.5 confidence means the top option holds at least 58.3% of the probability. Results are cached in `outlets` with `lean_confidence`; `init_db` adds that column to older databases.

## 2. Coverage relevance

A coverage card appears only when the fact check returns a `news_query`, which its prompt reserves for news events and public controversies (not ads, product launches, tutorials, entertainment or personal posts).

The Google News search for that query, plus the fact check's own sources, can include stock tips, course pages and other stories sharing a keyword. Up to 60 candidates go to Jev in **one request**:

- The state is `{story, checked_content, fact_check_summary, articles[]}`.
- There's one Noul per article: "The article `articles[i]` is a news report or opinion piece by a news outlet about the same specific event or controversy as `story`…"
- Articles at ≥ 0.5 stay, and the checked article itself always stays.
- If the call fails, every candidate is kept.

## 3. Visual review of AI-generated media

### Why

A reel of a misty Meghalaya landscape was reported **likely-ai** on one signal: t0-vision's 0.72 mean over its frames, just past the 0.70 line. A real, live-action Figma dance commercial got 0.97. Both are real camera footage. t0-vision is trained on still photos and generator outputs, and soft landscapes, studio sets and graded commercials look unlike its training data. A single detector score wasn't enough evidence to call something AI.

### How

`visual_review.ai_review` sends four evenly spaced keyframes to Jev, one request per frame, with a three-way Choice: "How was `image` made?"

- **camera**: a real camera, even if compressed, filtered, graded, or with text or UI laid on top;
- **ai-generated**: an AI image or video generator;
- **graphics**: illustration, 3D render, animation, or interface screenshots made with design tools.

The mean P(`ai-generated`) across frames is stored as `signals.aiReview`. It's a second opinion, not a detector, so it isn't averaged into `aiGeneratedProbability`.

The raw answers behind it are stored too, so the thresholds can be recalibrated on real reports later instead of only on the eval sample:

- `signals.aiReviewFrames`: P(`ai-generated`) for each frame that got an answer, in frame order.
- `signals.aiReviewModel`: the Jev version that gave them.

### Reuse for repeat media

A review is stored in the `visual_reviews` table, keyed by the perceptual hash of the media's first keyframe (from `pipeline/media.fingerprint`) and the Jev model, the same way the `outlets` table caches leans. A re-upload of the same media reuses the stored review without asking Jev again; a different `JEV_MODEL` asks again. Two things are never cached:

- failed reviews, so the next check tries Jev again;
- near-blank first frames (fewer than 4 bits set in the hash, e.g. a black opening frame), which hash alike for unrelated videos.

### The rule (`scoring.ai_call`)

| Detectors | Visual review | Call | Verdict |
|---|---|---|---|
| ≥ 0.70 | ≥ 0.50 (agrees) | likely | likely-ai |
| ≥ 0.70 from two detectors | any | likely | likely-ai |
| ≥ 0.70 | < 0.50 (disagrees) | disputed | unverified; both numbers shown |
| ≥ 0.90 | none (no key) | likely | likely-ai |
| 0.70–0.90 | none | possible | unverified; "no second signal to confirm it" |
| 0.40–0.70, or < 0.40 with review ≥ 0.50 | — | possible | unverified |
| < 0.40 | < 0.50 or none | clear | can be authentic |

A C2PA "AI-generated" marker still makes media likely-ai on its own. The review alone can never call media AI, and it can't clear media a detector flagged; disagreement only keeps the verdict at unverified, the cautious answer.

### What we measured

`experiments/jev-review/eval.py`, run on 2026-10-16 with `jev-preview` (then Jev 1.14, the version now pinned as `jev-1.14.0`):

- 20 AI images: Midjourney v6, FLUX 2, FLUX 1 faces, SD 1.5 and GenImage Midjourney, 4 each.
- 20 real photos: 10 Real-faces, 10 GenImage real.
- Four frames from each of three real reels.

| Set | Picked `ai-generated` | P(ai-generated) |
|---|---|---|
| 20 AI images | 14 / 20 | 0.10 – 0.95 (14 at ≥ 0.5) |
| 20 real photos | 0 / 20 | max 0.35 |
| Landscape reel, real (t0-vision 0.72) | 0 / 4 | 0.14 – 0.24 |
| Protest reel, real | 0 / 4 | 0.03 – 0.06 |
| Figma dance ad, real (t0-vision 0.97) | 4 / 4 | 0.53 – 0.80 |

A yes/no Noul ("was this made by an AI generator?") was tried in the same run and dropped: it put 13 of 20 real photos above 0.5.

End to end with the real pipeline (16 keyframes, t0-vision, then the review on 4 of them):

| Media | t0-vision | Review | Before | Now |
|---|---|---|---|---|
| Landscape reel (real) | 0.72 | 0.19 | likely-ai | **unverified** |
| Protest reel (real) | 0.45 | 0.12 | unverified | unverified |
| Figma dance ad (real) | 0.97 | 0.60 | likely-ai | likely-ai (still wrong) |
| Midjourney v6 image (AI) | 1.00 | 0.91 | likely-ai | likely-ai |
| FLUX 2 image (AI) | 1.00 | 0.89 | likely-ai | likely-ai |

The sample is small, and the AI images come from the set t0-vision was trained on, so the detector numbers are optimistic. Treat these as a sanity check, not a benchmark.

### Known miss and the trade-off

Both models misjudge the Figma commercial: a stark white studio, uniform styling and a UI frame drawn around the footage. Raising `REVIEW_AGREES` to about 0.65 would turn it into "disputed", but in our sample it would also have let 3 of the 20 AI images through (P(ai-generated) 0.55–0.62), leaving them unverified. We kept 0.5. The way to settle it is a labelled set of real social videos the detector gets wrong, which is the next thing to build.

## Configuration

| Variable | Default | |
|---|---|---|
| `TYPESAFE_API_KEY` | empty | From console.typesafe.ai/keys. Empty turns all three off |
| `JEV_MODEL` | `jev-1.14.0` | Pinned Jev 1.14. Rerun the eval before changing it |
| `JEV_MIN_CONFIDENCE` | `0.5` | Outlet lean below this stays unrated |
| `JEV_VISUAL_REVIEW` | `true` | `false` skips the keyframe review (four image requests per check) |

## Failure handling

- **429 and 529**: retried with backoff (0.5 s, then 1 s), three attempts in all.
- **Other errors or unexpected bodies**: logged, and the step falls back.
- **Visible fallbacks**: with `TYPESAFE_API_KEY` set, a failed call adds a note to the report's `signals.skipped`, so a report built without Jev doesn't look like one Jev agreed with:
  - "Jev visual review unavailable; verdict used detectors only" (only when the media is the report's subject);
  - "Jev coverage relevance check unavailable; all candidate articles kept";
  - "Jev outlet rating unavailable for N outlets; the LLM's lean label was used".
- **Images**: each keyframe is resized into Jev's 280–1,568 px range and re-encoded as JPEG. A frame that can't be read is skipped, and if no frame gets an answer the review is `null`.

## API and studio

- `signals.aiReview` (0–1 or `null`) is in every report. It's `null` on older reports and when Jev is off.
- `signals.aiReviewFrames` (list of 0–1, empty without a review) and `signals.aiReviewModel` hold the raw answers; both are optional in the studio's `Signals` type.
- Its check line says whether the review agrees ("Visual review agrees: looks AI-generated (60%)") or disagrees ("…flagged it (72%), but a visual review says it looks like camera footage (19% AI)").
- `coverage.sources[].leanConfidence` and the "est." badge tooltip are unchanged.

## Next steps

- **A labelled set of real social videos**: reels, ads and screen recordings, especially ones t0-vision flags. Use it to tune `REVIEW_AGREES` and `AI_ALONE`, and to retrain t0-vision on social-video frames.
- **Box for evidence**: ask Jev where an artifact is (a garbled sign, a malformed hand) and show the crop in the report, so "likely AI" comes with something you can see.
- **Image provenance matching**: compare a frame against reverse-search thumbnails with a Choice whose options are the candidate images, alongside the perceptual hashes.
