# trust0 browser extension

Chrome extension (Manifest V3) that tags what you read with a trust verdict and score:

- **AI answers** on ChatGPT, Claude, Gemini, Perplexity and Copilot get a chip. The newest answer is checked automatically once it finishes streaming.
- **Posts** on X, Instagram, Reddit and LinkedIn, and incoming **WhatsApp Web** messages, get a chip you click to check.
- **Videos and articles** (YouTube, Instagram reels, TikTok, and any page marked as an article) get a floating chip in the bottom-right corner.
- **Anything else**: right-click a selection, link, image, video or page and choose *Check with trust0*.

Click a finished chip to see the summary and individual checks. The popup checks the current page, lists recent checks and holds the settings.

Plain JavaScript, no build step.

## Load it

1. Open `chrome://extensions` and turn on **Developer mode**.
2. Click **Load unpacked** and pick this `plugin/` folder.
3. After editing files, click the reload icon on the extension card, then refresh the tab you're testing on.

It also loads in Edge, Brave and Arc, which accept Chrome extensions.

## Connect the API

The extension needs the trust0 backend in `src/` running; there are no offline or demo results. The API address is `API_BASE` in `src/shared.js` (`http://localhost:8000` by default), and the pill in the popup header says whether it is reachable. If it isn't, chips show *Check failed* with the reason on hover.

## API contract

The background worker sends:

```http
POST {API_BASE}/v1/checks
Content-Type: application/json

{
  "kind": "ai-response" | "post" | "message" | "video" | "article" | "image" | "link" | "selection" | "page",
  "platform": "chatgpt" | "x" | "youtube" | "<hostname>" | …,
  "url": "https://…",            // permalink to the item, or the page URL
  "title": "…",                   // page title
  "text": "…",                    // extracted text, up to 8000 chars (absent for media)
  "mediaUrl": "https://…"         // image or video src from the context menu
}
```

and expects:

```json
{
  "verdict": "accurate | mixed | inaccurate | authentic | edited | likely-ai | unverified",
  "trustScore": 0,
  "summary": "One or two sentences explaining the verdict.",
  "checks": [{ "ok": true, "label": "Claims match cited sources" }],
  "sections": [{ "kind": "text", "title": "Post text", "verdict": "inaccurate", "trustScore": 18 }],
  "reportUrl": "https://studio…/reports/abc",
  "status": "complete | analyzing | failed",
  "pollUrl": "https://api…/v1/checks/rpt_abc"
}
```

`accurate`, `mixed` and `inaccurate` are for text claims. The rest match the studio's `Verdict` type for media. Unknown verdicts show as *Unverified*, and the score is clamped to 0–100. The API must allow CORS from `chrome-extension://` origins, or skip CORS checks for this route.

`sections` is optional. A post with both text and an image or video gets one entry for each, and the popover shows them above the checks.

Every popover, and every check in the toolbar popup, has a **View full report** button that opens `reportUrl` in the studio. Recent checks in the popup open their report too, with a separate link to the original page.

Slow checks (video download, provenance research) come back as `status: "analyzing"`. The extension then polls `pollUrl` every 3 seconds for up to 3 minutes. A check still running after that shows *Still checking* with a link to follow it in the full report. It is not cached, so checking the same content again picks up the finished result. A failed check shows its report link and retries on the next click. The backend in `src/` implements this contract; run it and put its URL (e.g. `http://localhost:8000`) in the popup.

## Layout

```
manifest.json
icons/                  toolbar and store icons
src/shared.js           verdict labels, colours and settings, shared by every script
src/background.js       context menu, API calls, font loading, history
src/content/sites.js    per-site selectors (update these when a site changes its markup)
src/content/content.js  chips, floating panel, auto-check of AI answers
src/popup/              popup UI: page check, recent checks, settings
```

## Known gaps

- Site selectors are best-effort and will break when sites ship redesigns. Each site has one entry in `sites.js`.
- Chips use the OS light/dark setting, not the site's theme.
- Not packaged for Firefox yet. It needs `background.scripts` in place of `service_worker`.
- The extension can read every site (`<all_urls>`), which the Chrome Web Store reviews closely. Narrow `matches` to the supported sites if article checks on other sites aren't needed.
