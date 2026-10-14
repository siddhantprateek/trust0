// Loaded as a classic script by the background worker, the content scripts and the popup,
// so everything shared hangs off globalThis.trust0.
;(() => {
  const VERDICTS = {
    // AI answers and text claims
    accurate: { label: 'Factually accurate', tone: 'good' },
    mixed: { label: 'Partly accurate', tone: 'warn' },
    inaccurate: { label: 'Likely inaccurate', tone: 'bad' },
    // Media and posts, matching the studio's Verdict type
    authentic: { label: 'Likely authentic', tone: 'good' },
    edited: { label: 'Edited', tone: 'warn' },
    'likely-ai': { label: 'Likely AI-generated', tone: 'bad' },
    unverified: { label: 'Unverified', tone: 'neutral' },
  }

  const TONES = { good: '#16a34a', warn: '#d97706', bad: '#e54b4f', neutral: '#737373' }

  // The trust0 backend (src/). Change it here for a deployed API, and add that host to the manifest if it
  // isn't already covered by host_permissions.
  const API_BASE = 'http://localhost:8000'
  // The studio (studio/), linked from the popup's settings
  const STUDIO_URL = 'http://localhost:5173'

  const DEFAULT_SETTINGS = {
    autoCheckAi: true,
    showChips: true,
  }

  // Mirrors app/db.py's DEFAULT_ACTIVE_SITES: used only if the background worker can't reach the API and has
  // no cached list yet (a fresh install, offline), so the extension still works on the first page it sees.
  const DEFAULT_ACTIVE_SITES = [
    'chatgpt.com', 'chat.openai.com', 'claude.ai', 'gemini.google.com', 'perplexity.ai', 'copilot.microsoft.com',
    'x.com', 'twitter.com', 'instagram.com', 'reddit.com', 'linkedin.com', 'web.whatsapp.com', 'youtube.com', 'tiktok.com',
  ]

  function hostMatchesSite(host, domains) {
    host = host.replace(/^www\./, '')
    return domains.some((d) => host === d || host.endsWith(`.${d}`))
  }

  globalThis.trust0 = {
    VERDICTS,
    TONES,
    API_BASE,
    STUDIO_URL,
    DEFAULT_SETTINGS,
    DEFAULT_ACTIVE_SITES,
    hostMatchesSite,
    verdictInfo: (verdict) => VERDICTS[verdict] ?? VERDICTS.unverified,
    getSettings: async () => ({ ...DEFAULT_SETTINGS, ...(await chrome.storage.sync.get(Object.keys(DEFAULT_SETTINGS))) }),
  }
})()
