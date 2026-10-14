// Per-site adapters: which elements get a chip, and how to read their text and permalink.
// Selectors follow each site's current markup, so expect to update them when a site ships a redesign.
;(() => {
  const host = location.hostname.replace(/^www\./, '')
  const on = (...domains) => domains.some((d) => host === d || host.endsWith(`.${d}`))
  const textOf = (node, selector) => ((selector ? node.querySelector(selector) : node)?.innerText ?? '').trim()

  const sites = [
    // AI assistants: every answer gets a chip, and the latest one is checked once it stops streaming
    { platform: 'chatgpt', test: () => on('chatgpt.com', 'chat.openai.com'), kind: 'ai-response', selector: '[data-message-author-role="assistant"]' },
    { platform: 'claude', test: () => on('claude.ai'), kind: 'ai-response', selector: '.font-claude-response, .font-claude-message' },
    { platform: 'gemini', test: () => on('gemini.google.com'), kind: 'ai-response', selector: 'model-response' },
    { platform: 'perplexity', test: () => on('perplexity.ai'), kind: 'ai-response', selector: '[id^="markdown-content-"]' },
    { platform: 'copilot', test: () => on('copilot.microsoft.com'), kind: 'ai-response', selector: '[data-content="ai-message"]' },

    // Social posts
    {
      platform: 'x',
      test: () => on('x.com', 'twitter.com'),
      kind: 'post',
      selector: 'article[data-testid="tweet"]',
      getText: (n) => textOf(n, '[data-testid="tweetText"]'),
      getUrl: (n) => n.querySelector('a[href*="/status/"] time')?.closest('a')?.href,
      compact: true,
      // Header row, just left of the Grok button and the ⋯ menu; falls back to under the action bar
      place: (n, chip) => {
        const caret = n.querySelector('[data-testid="caret"]')
        const grok = n.querySelector('button[aria-label*="Grok" i]')
        const first = grok && caret ? (grok.compareDocumentPosition(caret) & Node.DOCUMENT_POSITION_FOLLOWING ? grok : caret) : grok ?? caret
        if (!first) return (n.querySelector('[role="group"]')?.parentElement ?? n).append(chip)
        // Climb to the child of the row that holds both buttons, so the chip becomes a sibling in that row
        let item = first
        while (item.parentElement && !(caret && grok ? item.parentElement.contains(caret) && item.parentElement.contains(grok) : item.parentElement.childElementCount > 1)) {
          item = item.parentElement
        }
        item.before(chip)
      },
    },
    {
      platform: 'instagram',
      test: () => on('instagram.com'),
      kind: 'post',
      selector: 'article',
      getText: (n) => textOf(n, 'h1'),
      getUrl: (n) => n.querySelector('a[href*="/p/"], a[href*="/reel/"]')?.href,
      page: () => /^\/(reels?|p)\//.test(location.pathname) && { kind: 'video' },
    },
    {
      platform: 'reddit',
      test: () => on('reddit.com'),
      kind: 'post',
      selector: 'shreddit-post',
      getText: (n) => n.getAttribute('post-title') ?? textOf(n),
      getUrl: (n) => n.getAttribute('permalink') && new URL(n.getAttribute('permalink'), location.origin).href,
      // shreddit-post renders through its own shadow root, so a light-DOM child would not show
      place: (n, chip) => n.after(chip),
    },
    { platform: 'linkedin', test: () => on('linkedin.com'), kind: 'post', selector: '.feed-shared-update-v2', getText: (n) => textOf(n, '.update-components-text') },

    // Messages
    { platform: 'whatsapp', test: () => on('web.whatsapp.com'), kind: 'message', selector: '.message-in', getText: (n) => textOf(n, '.copyable-text') },

    // Video pages get a single floating chip for the page
    { platform: 'youtube', test: () => on('youtube.com'), page: () => /^\/(watch|shorts)/.test(location.pathname) && { kind: 'video' } },
    { platform: 'tiktok', test: () => on('tiktok.com'), page: () => /\/video\//.test(location.pathname) && { kind: 'video' } },
  ]

  // Anywhere else, a page that declares itself an article gets the floating chip
  const genericArticle = {
    platform: host,
    page: () => {
      const isArticle =
        document.querySelector('meta[property="og:type"][content="article"]') || document.querySelectorAll('article p').length >= 3
      return isArticle && { kind: 'article', text: textOf(document, 'article') }
    },
  }

  const site = sites.find((s) => s.test()) ?? genericArticle
  globalThis.trust0Site = { getText: (n) => textOf(n), getUrl: () => undefined, place: (n, chip) => n.append(chip), ...site }
})()
