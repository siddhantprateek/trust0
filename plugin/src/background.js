importScripts('shared.js')

const { VERDICTS, API_BASE, DEFAULT_ACTIVE_SITES } = globalThis.trust0
const ACTIVE_SITES_TTL_MS = 10 * 60 * 1000
const HISTORY_LIMIT = 50
const MAX_TEXT = 8000
const POLL_INTERVAL_MS = 3000
const POLL_LIMIT_MS = 3 * 60 * 1000

// Results for identical requests are reused while the worker stays alive
const cache = new Map()

chrome.runtime.onInstalled.addListener(() => {
  // Earlier versions stored made-up demo verdicts in the history; drop them
  chrome.storage.local.get('history').then(({ history = [] }) => {
    const real = history.filter((entry) => !entry.result?.demo)
    if (real.length !== history.length) chrome.storage.local.set({ history: real })
  })
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: 'check-selection', title: 'Check "%s" with trust0', contexts: ['selection'] })
    chrome.contextMenus.create({ id: 'check-link', title: 'Check this link with trust0', contexts: ['link'] })
    chrome.contextMenus.create({ id: 'check-media', title: 'Check this media with trust0', contexts: ['image', 'video'] })
    chrome.contextMenus.create({ id: 'check-page', title: 'Check this page with trust0', contexts: ['page'] })
  })
})

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id) return
  const base = { platform: hostnameOf(tab.url), url: tab.url, title: tab.title }
  const request = {
    'check-selection': { ...base, kind: 'selection', text: info.selectionText },
    'check-link': { ...base, kind: 'link', url: info.linkUrl },
    'check-media': { ...base, kind: info.mediaType === 'video' ? 'video' : 'image', mediaUrl: info.srcUrl },
    'check-page': { ...base, kind: 'page' },
  }[info.menuItemId]
  if (!request) return

  // The content script shows progress and the verdict; pages it can't run on (chrome://, the web store) are skipped
  chrome.tabs.sendMessage(tab.id, { type: 'check-request', request }).catch(() => {})
})

// The content script asks for the font here: pages like YouTube block it from loading extension files itself
let fontData = null
async function loadFont() {
  fontData ??= fetch(chrome.runtime.getURL('fonts/dm-sans-latin.woff2'))
    .then((response) => response.arrayBuffer())
    .then((buffer) => {
      let binary = ''
      const bytes = new Uint8Array(buffer)
      for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
      return btoa(binary)
    })
  return fontData
}

// Websites the extension scans automatically (set from the studio's Settings page). Cached in storage.local so
// every content script doesn't hit the API on every page load; falls back to the last cache, then the bundled
// defaults, if the API can't be reached — a check-request from the right-click menu always works regardless.
async function activeSites() {
  const { activeSitesCache: cached } = await chrome.storage.local.get('activeSitesCache')
  if (cached && Date.now() - cached.at < ACTIVE_SITES_TTL_MS) return cached.domains
  try {
    const response = await fetch(`${API_BASE}/v1/extension/active-sites`, { signal: AbortSignal.timeout(5000) })
    if (!response.ok) throw new Error(`active-sites responded ${response.status}`)
    const domains = (await response.json()).map((s) => s.domain)
    await chrome.storage.local.set({ activeSitesCache: { domains, at: Date.now() } })
    return domains
  } catch {
    return cached?.domains ?? DEFAULT_ACTIVE_SITES
  }
}

async function apiStatus() {
  try {
    const response = await fetch(`${API_BASE}/v1/health`, { signal: AbortSignal.timeout(4000) })
    return response.ok ? { ok: true, message: 'Connected' } : { ok: false, message: `API error ${response.status}` }
  } catch {
    return { ok: false, message: 'API offline' }
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'font') {
    loadFont()
      .then((data) => sendResponse({ ok: true, data }))
      .catch(() => sendResponse({ ok: false }))
    return true
  }
  if (message?.type === 'status') {
    apiStatus().then(sendResponse)
    return true
  }
  if (message?.type === 'active-sites') {
    activeSites().then((domains) => sendResponse({ domains }))
    return true
  }
  if (message?.type !== 'check') return
  // The tab the check was run from (not necessarily request.url, e.g. a right-click "check this link" to
  // elsewhere): that tab's site is what should start getting chips automatically from now on
  runCheck(message.request, sender.tab?.url)
    .then((result) => sendResponse({ ok: true, result }))
    .catch((error) => sendResponse({ ok: false, error: error.message }))
  return true // keep the channel open for the async response
})

async function runCheck(rawRequest, tabUrl) {
  const request = { ...rawRequest, text: rawRequest.text?.slice(0, MAX_TEXT) }
  const key = hash(JSON.stringify([request.kind, request.url, request.mediaUrl, request.text]))
  if (cache.has(key)) return cache.get(key)

  const result = await callApi(request)
  // A check still running on the server is asked again next time, so the chip can pick up the finished result
  if (result.status === 'complete') cache.set(key, result)
  await addToHistory(request, result)
  // Reaching trust0's API means the user cared enough to check something here; the popup's "Check this page"
  // has no sender tab, so fall back to the checked URL itself (that case is always a same-site page check)
  ensureSiteActive(tabUrl ?? request.url).catch(() => {})
  return result
}

// Adds the site to the "active sites" list (studio Settings) so it gets automatic chips from now on. Best-effort:
// a failure here never breaks the check itself, and the backend POST is idempotent, so retrying is always safe.
async function ensureSiteActive(pageUrl) {
  let host
  try {
    host = new URL(pageUrl).hostname.replace(/^www\./, '')
  } catch {
    return
  }
  if (!host) return

  const { activeSitesCache: cached } = await chrome.storage.local.get('activeSitesCache')
  if (cached?.domains.some((d) => host === d || host.endsWith(`.${d}`))) return // already active

  const response = await fetch(`${API_BASE}/v1/extension/active-sites`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ domain: host }),
    signal: AbortSignal.timeout(8000),
  })
  if (!response.ok) return
  const site = await response.json()
  const domains = cached?.domains ?? []
  if (!domains.includes(site.domain)) {
    await chrome.storage.local.set({ activeSitesCache: { domains: [...domains, site.domain], at: cached?.at ?? Date.now() } })
  }
}

async function callApi(request) {
  let response
  try {
    response = await fetch(`${API_BASE}/v1/checks`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(request),
    })
  } catch {
    throw new Error(`Can't reach the trust0 API at ${API_BASE}. Is the backend running?`)
  }
  if (!response.ok) throw new Error(await apiError(response))
  let data = await response.json()

  // Tracing sources can outlast the API's wait window; it then returns status "analyzing" and a pollUrl
  const deadline = Date.now() + POLL_LIMIT_MS
  while (data.status === 'analyzing' && data.pollUrl && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
    const poll = await fetch(data.pollUrl)
    if (!poll.ok) throw new Error(await apiError(poll))
    data = await poll.json()
  }
  // Slow and failed checks still have a report page, so hand them back with their link instead of throwing
  return normalize(data)
}

const clampScore = (value) => Math.max(0, Math.min(100, Math.round(Number(value) || 0)))
const normalizeChecks = (checks) => (Array.isArray(checks) ? checks.map((c) => ({ ok: Boolean(c.ok), label: String(c.label) })) : [])

function normalize(data) {
  return {
    status: ['complete', 'analyzing', 'failed'].includes(data.status) ? data.status : 'complete',
    verdict: data.verdict in VERDICTS ? data.verdict : 'unverified',
    trustScore: clampScore(data.trustScore),
    summary: String(data.summary ?? ''),
    checks: normalizeChecks(data.checks),
    // A post with both text and media gets a verdict for each, as in the studio
    sections: Array.isArray(data.sections)
      ? data.sections.map((s) => ({
          kind: s.kind === 'media' ? 'media' : 'text',
          title: String(s.title ?? ''),
          verdict: s.verdict in VERDICTS ? s.verdict : 'unverified',
          trustScore: clampScore(s.trustScore),
        }))
      : [],
    reportUrl: typeof data.reportUrl === 'string' && /^https?:\/\//.test(data.reportUrl) ? data.reportUrl : undefined,
  }
}

// FastAPI puts the reason in "detail"; show it rather than a bare status code
async function apiError(response) {
  try {
    const body = await response.json()
    if (typeof body.detail === 'string') return body.detail
  } catch {
    // not JSON
  }
  return `trust0 API responded ${response.status}`
}

async function addToHistory(request, result) {
  const { history = [] } = await chrome.storage.local.get('history')
  const entry = {
    at: new Date().toISOString(),
    kind: request.kind,
    platform: request.platform,
    url: request.url,
    title: request.title || request.text?.slice(0, 120) || request.url,
    result,
  }
  await chrome.storage.local.set({ history: [entry, ...history].slice(0, HISTORY_LIMIT) })
}

function hostnameOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return 'unknown'
  }
}

// djb2, returned base36 as a cache key
function hash(input) {
  let h = 5381
  for (let i = 0; i < input.length; i++) h = ((h << 5) + h + input.charCodeAt(i)) >>> 0
  return h.toString(36)
}
