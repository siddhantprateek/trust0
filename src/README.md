# trust0 API

FastAPI backend that checks a link, upload or piece of text and returns a verdict, a 0–100 trust score, the checks behind it, the claims it verified, and the **spread path**: where the content first appeared and how it reached the post you checked.

The studio and the browser extension (`plugin/`) both call it.

## Run it

```bash
cd src
python -m venv .venv
.venv/Scripts/activate          # macOS/Linux: source .venv/bin/activate
pip install -e ".[dev]" "yt-dlp[default]"
# Optional: t0-vision + Whisper on this machine (GPU build of torch first)
pip install torch --index-url https://download.pytorch.org/whl/cu126
pip install -e ".[local]"
cp .env.example .env            # add the keys you have
uvicorn app.main:app --reload --port 8000
```

Interactive docs: http://localhost:8000/docs · tests: `pytest`

Needs **ffmpeg** on `PATH` (keyframes) and **Node or Deno** (yt-dlp uses one to read YouTube).

Every API key is optional. A stage whose key is missing is skipped, and the report lists it under `signals.skipped`. `GET /v1/health` shows which providers are configured.

| Key | Used for |
|---|---|
| `LLM_PROVIDER` | `anthropic` (default), `openai` or `openrouter` -- which backend does claim extraction, fact checking and provenance research |
| `ANTHROPIC_API_KEY` | Used when `LLM_PROVIDER=anthropic`: Claude (`claude-opus-5-5`) with its own web search + web fetch tools |
| `OPENAI_API_KEY` / `OPENAI_MODEL` | Used when `LLM_PROVIDER=openai`: OpenAI direct, via the Responses API and its hosted web search tool |
| `OPENROUTER_API_KEY` / `OPENROUTER_MODEL` | Used when `LLM_PROVIDER=openrouter`: any model OpenRouter proxies to, with its "web" plugin for live search |
| `SERPAPI_API_KEY` | Reverse image search (Google Lens) on the post's thumbnail, and the Google News search behind coverage & bias |
| `GOOGLE_FACTCHECK_API_KEY` | Published fact checks (ClaimReview) matching the content |
| `T0_VISION_MODEL_PATH` | Our own AI-image detector, run locally (`[local]` extra). Trained in `experiments/ai-detect` |
| `WHISPER_MODEL` | Local speech-to-text for videos without captions (`[local]` extra). Default `openai/whisper-large-v3-turbo` |
| `LOCAL_DEVICE` | `auto`, `cuda` or `cpu` for the two local models. Use `cpu` while training on the GPU |
| `HIVE_API_KEY` | AI-generated image/video detection on keyframes. Optional with t0-vision; both are averaged when set |
| `DECISION_MODEL` / `DECISION_MIN_CONFIDENCE` | With `OPENAI_API_KEY` set, OpenAI's Decisions API (default `gpt-6-luna`) rates the lean of uncurated outlets from the LLM's research, with a confidence; below `DECISION_MIN_CONFIDENCE` (default 0.5) an outlet stays unrated. See `docs/decisions-outlet-lean.md` |
| `REDDIT_CLIENT_ID` / `_SECRET` | Reddit post metadata, crosspost parents and link targets (Reddit blocks anonymous API calls) |
| `YTDLP_COOKIES_FILE` | Logged-in access for Instagram, Facebook and some X posts |
| `PREFER_IPV4` | Set `true` on networks where IPv6 is advertised but broken (requests hang otherwise) |

## Endpoints

| Method | Path | For |
|---|---|---|
| `POST` | `/v1/checks` | Extension. Starts a check and waits up to `CHECK_WAIT_SECONDS`. Returns the result, or `status: "analyzing"` plus a `pollUrl` |
| `GET` | `/v1/checks/{id}` | Extension polling |
| `POST` | `/v1/reports` | Studio link/text check (`{"kind": "link", "url": "…"}` or `{"kind": "text", "text": "…"}`). Returns `202` with the report |
| `POST` | `/v1/reports/upload` | Studio file upload (multipart `file`, image or video) |
| `GET` | `/v1/reports`, `/v1/reports/{id}` | Report list and detail. Same shape as the studio's `Report` type, plus `claims`, `summary`, `signals`, and `steps` (each pipeline stage's status, detail and timings, saved live while the check runs) |
| `GET` | `/v1/runs` | Checks still running plus any started in the last 15 minutes: id, title, status, verdict and `steps` only, light enough to poll |
| `GET` | `/v1/extension/active-sites` | Websites the extension scans automatically (studio Settings manages this; a right-click check always works regardless) |
| `POST` | `/v1/extension/active-sites` | Add a website (`{"domain": "example.com"}`) |
| `DELETE` | `/v1/extension/active-sites/{domain}` | Remove a website |
| `GET` | `/v1/models`, `/v1/models/{id}` | trust0's own models (t0-vision, upcoming ones) and whether this server has each loaded |
| `POST` | `/v1/models/predict` | Public API. Needs `Authorization: Bearer t0_…`. Multipart `model` (e.g. `t0-vision`) and `file` (JPEG/PNG/WebP, ≤ 20 MB). Returns `label`, `aiGenerated` (0–1) and per-label `scores` |
| `GET`, `POST` | `/v1/api-keys` | Studio. List keys, or create one (`{"name": "…"}`); the full key is only in the create response |
| `DELETE` | `/v1/api-keys/{id}` | Revoke a key |

The same URL checked again within `REUSE_REPORT_HOURS` returns the existing report. Tracking parameters and host aliases are ignored, so `twitter.com/…?s=20` and `x.com/…` count as the same URL.

## How a check works

```
ingest ─▶ fingerprint ─▶ provenance ─┬─▶ fact check ─▶ coverage & bias ─▶ score
                     └─▶ AI detection ┘
```

1. **Ingest** (`pipeline/ingest.py`): yt-dlp reads posts and downloads ≤480p video on X, Instagram, TikTok, YouTube, Reddit and Facebook. Fallbacks cover what yt-dlp can't read:
   - fxtwitter for X image and text posts, and quote tweets
   - Reddit OAuth for crossposts and link targets
   - trafilatura for articles
   - Open Graph tags as a last resort

   Creator or auto captions are pulled as a transcript. Videos without captions are transcribed with local Whisper.
2. **Fingerprint** (`pipeline/media.py`): ffmpeg samples 16 keyframes, each gets a perceptual hash (pHash), and the file is scanned for C2PA/IPTC "trained algorithmic media" markers. Perceptual hashes survive re-encoding, resizing and compression, so a re-upload hashes close to the original.
3. **Provenance** (`pipeline/provenance.py`) builds the spread path from evidence, strongest first:
   - `visual-match`: frames match media from any earlier check (the `media` table is a growing index of every upload seen), or a candidate's thumbnail matches.
   - `metadata`: the platform names the parent (Reddit crosspost, X quote tweet, link post).
   - `reverse-search`: Google Lens hits. Each hit's thumbnail is re-hashed to confirm it; unconfirmed hits become leads.
   - `research`: Claude searches the web for the earliest appearance, given everything above as leads.

   The earliest dated step is marked `isOrigin`. Originality comes out as `original`, `reupload`, `modified-reupload` or `unknown`.
4. **AI detection** (`services/local_models.py`, `services/external.py`): t0-vision on up to eight keyframes (mean score), and Hive on four if a key is set. With both, the report uses their mean and lists each under `signals.aiDetectors`. File metadata markers count too.
5. **Fact check** (`pipeline/factcheck.py`): the configured LLM (`services/llm.py`, `LLM_PROVIDER`) picks up to five checkable claims, including what the media is said to show, and verifies each against the web. It prefers primary sources, wires, established outlets and fact-checkers. The provenance result goes into the prompt, because a video's real origin is often what exposes a false caption.
6. **Coverage & bias** (`pipeline/coverage.py`), Ground News style, only for news stories: the fact check returns a short news query when the content is about a news event or public controversy, and leaves it empty for ads, product launches, tutorials, entertainment and personal posts. No query, no coverage card (claim sources still get their outlet's lean). With a query, a Google News search (SerpAPI) finds other outlets covering it, alongside the outlets the fact check cited. With an OpenAI key, one Decisions API request then keeps only the articles that are news reports on this same story, dropping tutorials, stock tips, product pages and other stories that share a keyword; without a key, every result is kept. Each outlet counts once and gets a lean (`left`, `lean-left`, `center`, `lean-right`, `right`):
   - From the curated table in `pipeline/outlets.py`, which follows public raters (AllSides, Ad Fontes Media, Media Bias/Fact Check). Edit it freely.
   - Otherwise it's estimated once, stored in the `outlets` table, and marked `estimated`. The LLM researches the outlet and writes up what the raters say; with an OpenAI key, OpenAI's Decisions API rates the lean from that write-up and returns a confidence (`leanConfidence`), and outlets it's unsure about stay unrated. Without a key, the LLM's own label is used. Platforms, government and academic sites are left unrated. Details in `docs/decisions-outlet-lean.md`.

   The report gets the Left / Center / Right counts and percentages, a `blindspot` when one side carries ≤20% of the rated coverage (needs at least 5 rated outlets), the checked article's own outlet lean, and a lean on every claim source. Lean belongs to outlets, never to facts.
7. **Score** (`pipeline/scoring.py`): transparent rules. Each point added or removed matches a check shown to the user. "Authentic" requires positive evidence (a clean detector result or a traced earlier source), so an untraced video with no detector run stays "unverified".

Downloaded media is deleted when a check finishes; only the hashes are kept.

## Not done yet

- **Auth and rate limiting.** The API is open. Put it behind the studio's Clerk session (verify the JWT) before deploying.
- **Job queue.** Checks run as in-process asyncio tasks, so a restart drops running checks. Move to a queue (arq, Celery or Cloud Tasks) for production.
- **Hash index scale.** Matching is a linear scan of the `media` table. Swap in a BK-tree or LSH index once it holds tens of thousands of uploads.
- **SQLite.** Fine for development. Use Postgres in production; the SQLAlchemy models carry over.
