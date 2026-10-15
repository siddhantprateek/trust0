// Tags AI answers, posts, messages and media on the page with a trust0 chip that shows the verdict and score.
;(() => {
  const { verdictInfo, TONES, getSettings, DEFAULT_SETTINGS, hostMatchesSite } = globalThis.trust0
  const site = globalThis.trust0Site
  const STREAM_SETTLE_MS = 1500
  const SCAN_DEBOUNCE_MS = 300

  let settings = { ...DEFAULT_SETTINGS }

  // DM Sans ships with the extension and is registered from its bytes: a url() source would be blocked
  // by font-src CSP on sites like X, and @font-face rules inside a shadow root are ignored. The background
  // worker reads the file, because pages like YouTube refuse to let the page load chrome-extension:// URLs.
  const FONT = '"trust0 DM Sans", system-ui, -apple-system, "Segoe UI", sans-serif'
  chrome.runtime
    .sendMessage({ type: 'font' })
    .then((response) => {
      if (!response?.ok) return
      const bytes = Uint8Array.from(atob(response.data), (c) => c.charCodeAt(0))
      return new FontFace('trust0 DM Sans', bytes.buffer, { weight: '400 700' }).load()
    })
    .then((face) => face && document.fonts.add(face))
    .catch(() => {}) // falls back to the system font

  const STYLE = `
    :host { all: initial; display: block; margin: 8px 0; }
    /* Set on elements, not :host, because the popover host is reset with an inline all: initial */
    .chip, .details {
      --bg: #fff; --fg: #0a0a0a; --muted: #5c5c66; --border: #e7e7ee; --subtle: #f2f2f6; --brand: #7e47ff;
      font-family: ${FONT}; font-size: 13px; line-height: 1.4; letter-spacing: -0.01em; -webkit-font-smoothing: antialiased;
    }
    @media (prefers-color-scheme: dark) {
      .chip, .details { --bg: #17171b; --fg: #f2f2f5; --muted: #a1a1aa; --border: #2c2c33; --subtle: #25252b; --brand: #a07cff; }
    }

    .wrap { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; }
    .wrap.floating { flex-direction: column-reverse; align-items: flex-end; }

    .chip { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border: 1px solid color-mix(in srgb, var(--brand) 35%, transparent);
      border-radius: 999px; background: var(--bg); color: var(--fg); font-size: 12.5px; cursor: pointer; }
    .chip:hover { border-color: var(--brand); }
    .brand { font-weight: 600; color: var(--brand); }
    .dot { width: 8px; height: 8px; border-radius: 50%; }
    .score { font-weight: 600; font-variant-numeric: tabular-nums; }
    .close { margin-left: 2px; padding: 0 2px; border: 0; background: none; color: var(--muted); font: inherit; cursor: pointer; }
    :host(.compact) { display: inline-flex; align-self: center; margin: 0 6px; }
    .compact .chip { gap: 5px; padding: 2px 8px; }

    .details { box-sizing: border-box; width: 300px; padding: 12px 14px; border: 1px solid var(--border); border-radius: 12px;
      background: var(--bg); color: var(--fg); box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06), 0 10px 28px rgba(0, 0, 0, 0.14); }
    .details[hidden] { display: none; }
    .head { display: flex; align-items: center; gap: 8px; }
    .head .dot { width: 10px; height: 10px; }
    .verdict { font-size: 14px; font-weight: 600; }
    .total { margin-left: auto; font-size: 16px; font-weight: 700; font-variant-numeric: tabular-nums; }
    .total small { margin-left: 1px; font-size: 11px; font-weight: 500; color: var(--muted); }
    .bar { height: 4px; margin: 10px 0 12px; border-radius: 999px; background: var(--subtle); overflow: hidden; }
    .bar span { display: block; height: 100%; border-radius: inherit; }
    .summary { margin: 0 0 12px; color: var(--muted); }
    .checks { display: grid; gap: 7px; margin: 0; padding: 0; list-style: none; }
    .checks li { display: flex; align-items: flex-start; gap: 8px; }
    .icon { display: grid; flex: none; place-items: center; width: 16px; height: 16px; margin-top: 1px; border-radius: 50%; }
    .icon svg { width: 9px; height: 9px; }
    .report { display: flex; align-items: center; justify-content: center; gap: 6px; box-sizing: border-box; width: 100%; margin-top: 12px;
      padding: 8px 12px; border-radius: 8px; background: var(--brand); color: #fff; font-weight: 600; text-decoration: none; }
    .report:hover { background: color-mix(in srgb, var(--brand) 88%, #000); }
    .report:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }
    .report svg { width: 12px; height: 12px; }
    .sections { display: grid; gap: 6px; margin: 0 0 12px; }
    .section { display: flex; align-items: center; gap: 8px; padding: 7px 9px; border-radius: 8px; background: var(--subtle); }
    .section .dot { width: 8px; height: 8px; }
    .section-title { color: var(--muted); }
    .section-verdict { font-weight: 600; }
    .section-score { margin-left: auto; font-weight: 600; font-variant-numeric: tabular-nums; }
    .pending { margin: 10px 0 0; color: var(--muted); }
    .spinner { flex: none; width: 10px; height: 10px; box-sizing: border-box; border: 2px solid var(--border); border-top-color: var(--brand);
      border-radius: 50%; animation: spin 800ms linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Popover: the arrow points at the chip and flips when the popover opens above it */
    .pop { position: relative; animation: pop-in 120ms ease-out; }
    .pop::before { content: ""; position: absolute; top: -6px; left: var(--arrow-x, 50%); width: 10px; height: 10px; margin-left: -6px;
      border-top: 1px solid var(--border); border-left: 1px solid var(--border); border-top-left-radius: 2px; background: var(--bg); transform: rotate(45deg); }
    .pop.above { animation-name: pop-in-above; }
    .pop.above::before { top: auto; bottom: -6px; transform: rotate(225deg); }
    @keyframes pop-in { from { opacity: 0; transform: translateY(-4px); } }
    @keyframes pop-in-above { from { opacity: 0; transform: translateY(4px); } }
    @media (prefers-reduced-motion: reduce) { .pop, .spinner { animation: none; } }
  `

  const ICONS = {
    ok: '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 6.5 5 9l4.5-6"/></svg>',
    bad: '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 3l6 6M9 3 3 9"/></svg>',
    external: '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 2H2.5v7.5H10V7M7 2h3v3M10 2 5.5 6.5"/></svg>',
  }

  // After the extension is reloaded or updated, scripts already on open tabs lose their connection to it and
  // every chrome.* call throws "Extension context invalidated". chrome.runtime.id is gone in that state.
  const contextAlive = () => Boolean(globalThis.chrome?.runtime?.id)
  const STALE_MESSAGE = 'trust0 was updated. Refresh this page to keep checking.'

  function h(tag, className, text) {
    const node = document.createElement(tag)
    if (className) node.className = className
    if (text !== undefined) node.textContent = text
    return node
  }

  function createShell(tag) {
    const host = document.createElement(tag)
    const root = host.attachShadow({ mode: 'open' })
    root.append(h('style', '', STYLE))
    return { host, root }
  }

  function reportButton(url, label = 'View full report') {
    const link = h('a', 'report')
    link.href = url
    link.target = '_blank'
    link.rel = 'noopener'
    link.append(h('span', '', label))
    link.insertAdjacentHTML('beforeend', ICONS.external)
    return link
  }

  function renderDetails(details, result) {
    // Still running on the server, or failed there: say so, and point at the report, which fills in on its own
    if (result.status !== 'complete') {
      const analyzing = result.status === 'analyzing'
      const head = h('div', 'head')
      if (analyzing) head.append(h('span', 'spinner'))
      head.append(h('span', 'verdict', analyzing ? 'Still checking' : 'Check failed'))
      details.replaceChildren(
        head,
        h(
          'p',
          'pending',
          analyzing
            ? 'Tracing sources and verifying claims is taking a while. The full report fills in as soon as it finishes.'
            : 'Something went wrong on the server. Click the chip to try again.',
        ),
      )
      if (result.reportUrl) details.append(reportButton(result.reportUrl, analyzing ? 'Follow in full report' : 'View report'))
      return
    }

    const info = verdictInfo(result.verdict)
    const tone = TONES[info.tone]

    const head = h('div', 'head')
    const dot = h('span', 'dot')
    dot.style.background = tone
    const total = h('span', 'total', String(result.trustScore))
    total.append(h('small', '', '/100'))
    head.append(dot, h('span', 'verdict', info.label), total)

    const bar = h('div', 'bar')
    const fill = h('span')
    fill.style.cssText = `width: ${result.trustScore}%; background: ${tone};`
    bar.append(fill)

    details.replaceChildren(head, bar)

    // Text and media judged separately: a real photo with a false caption scores differently on each
    if (result.sections?.length) {
      const list = h('div', 'sections')
      for (const section of result.sections) {
        const sectionInfo = verdictInfo(section.verdict)
        const row = h('div', 'section')
        const sectionDot = h('span', 'dot')
        sectionDot.style.background = TONES[sectionInfo.tone]
        row.append(
          sectionDot,
          h('span', 'section-title', section.title),
          h('span', 'section-verdict', sectionInfo.label),
          h('span', 'section-score', String(section.trustScore)),
        )
        list.append(row)
      }
      details.append(list)
    }

    if (result.summary) details.append(h('p', 'summary', result.summary))

    if (result.checks.length) {
      const list = h('ul', 'checks')
      for (const check of result.checks) {
        const color = check.ok ? TONES.good : TONES.bad
        const icon = h('span', 'icon')
        icon.style.cssText = `color: ${color}; background: color-mix(in srgb, ${color} 16%, transparent);`
        icon.innerHTML = check.ok ? ICONS.ok : ICONS.bad
        const item = h('li')
        item.append(icon, h('span', '', check.label))
        list.append(item)
      }
      details.append(list)
    }

    if (result.reportUrl) details.append(reportButton(result.reportUrl))
  }

  // Compact chips sit in tight spots like a tweet header, so their details open in a page-level popover
  // instead of expanding in place. It lives outside the post because X wraps posts in transformed, clipped containers.
  let popover = null

  function closePopover() {
    popover?.host.remove()
    popover = null
  }

  function togglePopover(anchor, result) {
    const reopening = popover?.anchor !== anchor
    closePopover()
    if (!reopening) return
    const { host, root } = createShell('trust0-popover')
    host.style.cssText = 'all: initial; position: fixed; z-index: 2147483647;'
    const details = h('div', 'details pop')
    renderDetails(details, result)
    root.append(details)
    document.documentElement.append(host)

    // Centre on the chip, stay inside the viewport, and open upwards when there's no room below
    const GAP = 10
    const rect = anchor.getBoundingClientRect()
    const { offsetWidth: width, offsetHeight: height } = details
    const center = rect.left + rect.width / 2
    const left = Math.max(8, Math.min(center - width / 2, innerWidth - width - 8))
    const above = rect.bottom + GAP + height > innerHeight - 8 && rect.top - GAP - height > 8
    host.style.left = `${left}px`
    host.style.top = `${above ? rect.top - GAP - height : rect.bottom + GAP}px`
    details.classList.toggle('above', above)
    details.style.setProperty('--arrow-x', `${Math.max(16, Math.min(center - left, width - 16))}px`)
    popover = { host, anchor }
  }

  addEventListener('scroll', closePopover, { capture: true, passive: true })
  addEventListener('resize', closePopover, { passive: true })
  // Capture phase, so it runs before the chip host stops the event from reaching the page
  document.addEventListener(
    'pointerdown',
    (event) => {
      if (!popover) return
      const path = event.composedPath()
      if (!path.includes(popover.host) && !path.includes(popover.anchor)) closePopover()
    },
    true,
  )

  function createChip(getRequest, { floating = false, compact = false, onClose } = {}) {
    const { host, root } = createShell('trust0-chip')
    if (compact) host.classList.add('compact')
    const wrap = h('div', floating ? 'wrap floating' : compact ? 'wrap compact' : 'wrap')
    const button = h('button', 'chip')
    const details = h('div', 'details')
    details.hidden = true
    wrap.append(button, details)
    root.append(wrap)

    let state = 'idle'
    let result = null
    let error = ''

    function paint() {
      button.replaceChildren(h('span', 'brand', 'trust0'))
      if (state === 'idle') button.append(h('span', '', 'Check'))
      if (state === 'loading') button.append(h('span', '', 'Checking…'))
      if (state === 'error') {
        const stale = error === STALE_MESSAGE
        button.append(h('span', '', stale ? (compact ? 'Refresh page' : 'Updated, refresh the page') : compact ? 'Retry' : 'Check failed, retry'))
        button.title = error
      }
      if (state === 'done' && result.status !== 'complete') {
        const analyzing = result.status === 'analyzing'
        if (analyzing) button.append(h('span', 'spinner'), h('span', '', compact ? 'Checking' : 'Still checking'))
        else button.append(h('span', '', compact ? 'Failed' : 'Check failed, retry'))
        button.title = analyzing ? 'Still checking. Click for the full report.' : 'The check failed. Click to try again.'
      } else if (state === 'done') {
        const info = verdictInfo(result.verdict)
        const dot = h('span', 'dot')
        dot.style.background = TONES[info.tone]
        if (compact) button.append(dot, h('span', 'score', String(result.trustScore)))
        else button.append(dot, h('span', '', info.label), h('span', 'score', `${result.trustScore}/100`))
        button.title = `${info.label}, ${result.trustScore}/100. Click for details.`
      }
      if (onClose) {
        const close = h('span', 'close', '×')
        close.title = 'Dismiss'
        close.addEventListener('click', (event) => {
          event.stopPropagation()
          onClose()
        })
        button.append(close)
      }
    }

    async function run() {
      if (state === 'loading') return
      state = 'loading'
      details.hidden = true
      paint()
      try {
        if (!contextAlive()) throw new Error(STALE_MESSAGE)
        const response = await chrome.runtime.sendMessage({ type: 'check', request: getRequest() })
        if (!response?.ok) throw new Error(response?.error ?? 'No response from trust0')
        result = response.result
        renderDetails(details, result)
        state = 'done'
        if (floating) details.hidden = false
      } catch (err) {
        error = /context invalidated/i.test(err.message) ? STALE_MESSAGE : err.message
        state = 'error'
      }
      paint()
    }

    // Keep clicks from reaching the host page, e.g. X opens the tweet when its article is clicked
    for (const type of ['click', 'mousedown', 'pointerdown']) host.addEventListener(type, (event) => event.stopPropagation())
    button.addEventListener('click', (event) => {
      event.preventDefault()
      if (state !== 'done' || result.status === 'failed') run()
      else if (compact) togglePopover(host, result)
      else details.hidden = !details.hidden
    })

    paint()
    return { host, run, getState: () => state }
  }

  // Floating stack in the bottom-right for page-level checks and right-click checks
  let stack = null
  function floatingStack() {
    if (stack?.isConnected) return stack
    const { host, root } = createShell('trust0-floating')
    host.style.cssText = 'all: initial; position: fixed; right: 16px; bottom: 16px; z-index: 2147483647;'
    stack = h('div')
    stack.style.cssText = 'display: flex; flex-direction: column; align-items: flex-end; gap: 8px;'
    root.append(stack)
    document.documentElement.append(host)
    return stack
  }

  function showFloating(request, { autoRun = true } = {}) {
    const chip = createChip(() => request, { floating: true, onClose: () => chip.host.remove() })
    floatingStack().append(chip.host)
    if (autoRun) chip.run()
    return chip
  }

  // Inline chips on matching elements
  const tracked = new WeakMap()

  function requestFor(node) {
    return { kind: site.kind, platform: site.platform, url: site.getUrl(node) || location.href, title: document.title, text: site.getText(node) }
  }

  function scanElements() {
    if (!site.selector) return
    const nodes = [...document.querySelectorAll(site.selector)]
    for (const node of nodes) {
      let entry = tracked.get(node)
      if (!entry) {
        entry = { chip: createChip(() => requestFor(node), { compact: Boolean(site.compact) }), lastText: '', checkedText: '', timer: 0 }
        tracked.set(node, entry)
      }
      // Sites that re-render (ChatGPT, X) can drop the chip, so put it back
      if (!entry.chip.host.isConnected) site.place(node, entry.chip.host)
    }

    // Only the newest answer is auto-checked, once its text has stopped changing
    const latest = nodes.at(-1)
    if (site.kind === 'ai-response' && settings.autoCheckAi && latest) autoCheckWhenSettled(latest, tracked.get(latest))
  }

  function autoCheckWhenSettled(node, entry) {
    const text = site.getText(node)
    if (!text || text === entry.lastText) return
    entry.lastText = text
    clearTimeout(entry.timer)
    entry.timer = setTimeout(() => {
      if (text === entry.checkedText || entry.chip.getState() === 'loading') return
      entry.checkedText = text
      entry.chip.run()
    }, STREAM_SETTLE_MS)
  }

  // One floating chip per page for videos, reels and articles; reset on SPA navigation
  let pageChip = null
  let pageUrl = ''
  function scanPage() {
    if (location.href === pageUrl) return
    pageUrl = location.href
    pageChip?.host.remove()
    pageChip = null
    const page = site.page?.()
    if (!page) return
    pageChip = showFloating(
      { platform: site.platform, url: location.href, title: document.title, ...page, text: page.text?.slice(0, 8000) },
      { autoRun: false },
    )
  }

  // Whether this site is in the "active sites" list (studio Settings). Automatic chips are gated on it; a
  // check started from the right-click menu (the listener just below) always works, site list or not.
  let activeHere = false

  let scanTimer = 0
  let observer = null
  function scheduleScan() {
    clearTimeout(scanTimer)
    scanTimer = setTimeout(() => {
      if (!contextAlive()) return observer?.disconnect()
      if (!activeHere || !settings.showChips) return
      scanElements()
      scanPage()
    }, SCAN_DEBOUNCE_MS)
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === 'check-request') showFloating({ title: document.title, ...message.request })
  })

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return
    for (const [key, { newValue }] of Object.entries(changes)) if (key in settings) settings[key] = newValue
    if (!settings.showChips) {
      document.querySelectorAll('trust0-chip, trust0-floating').forEach((node) => node.remove())
      pageChip = null
      pageUrl = ''
    }
    scheduleScan()
  })

  // sendMessage resolves undefined when the background worker doesn't answer (e.g. the extension was just reloaded)
  const activeSites = chrome.runtime.sendMessage({ type: 'active-sites' }).then((reply) => reply ?? { domains: [] }, () => ({ domains: [] }))
  Promise.all([getSettings(), activeSites]).then(([loaded, { domains }]) => {
    settings = loaded
    activeHere = hostMatchesSite(location.hostname, domains)
    observer = new MutationObserver(scheduleScan)
    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true })
    scheduleScan()
  })
})()
