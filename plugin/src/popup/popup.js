const { verdictInfo, TONES, getSettings, STUDIO_URL } = globalThis.trust0

const $ = (id) => document.getElementById(id)

function h(tag, className, text) {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

function verdictRow(result) {
  const row = h('div', 'verdict')
  if (result.status === 'analyzing' || result.status === 'failed') {
    row.append(h('span', 'muted', result.status === 'analyzing' ? 'Still checking…' : 'Check failed'))
    return row
  }
  const info = verdictInfo(result.verdict)
  const dot = h('span', 'dot')
  dot.style.background = TONES[info.tone]
  row.append(dot, h('span', '', info.label))
  row.append(h('span', 'score', `${result.trustScore}/100`))
  return row
}

function reportLink(url, label = 'View full report') {
  const link = h('a', 'report-button', `${label} ↗`)
  link.href = url
  link.target = '_blank'
  link.rel = 'noopener'
  return link
}

function renderResult(container, result) {
  const box = h('div', 'result')
  box.append(verdictRow(result))
  for (const section of result.sections ?? []) {
    const row = verdictRow(section)
    row.classList.add('section')
    row.prepend(h('span', 'section-title', section.title))
    box.append(row)
  }
  if (result.status === 'analyzing') {
    box.append(h('p', 'muted', 'This one is taking a while. The full report fills in as soon as it finishes.'))
  } else if (result.summary) {
    box.append(h('p', 'muted', result.summary))
  }
  if (result.reportUrl) box.append(reportLink(result.reportUrl, result.status === 'analyzing' ? 'Follow in full report' : 'View full report'))
  container.replaceChildren(box)
}

async function renderHistory() {
  const { history: stored = [] } = await chrome.storage.local.get('history')
  const history = stored.filter((entry) => !entry.result?.demo) // made-up results from older versions
  $('history-empty').hidden = history.length > 0
  $('history').replaceChildren(
    ...history.slice(0, 8).map((entry) => {
      const item = h('li')
      // The entry opens its report; the original page stays one click away
      const link = h('a', 'entry')
      link.href = entry.result.reportUrl ?? entry.url
      link.target = '_blank'
      link.rel = 'noopener'
      link.title = entry.result.reportUrl ? 'Open the full report' : 'Open the checked page'
      link.append(h('div', 'truncate', entry.title), verdictRow(entry.result))
      item.append(link)
      if (entry.result.reportUrl && entry.url) {
        const source = h('a', 'source', 'Original ↗')
        source.href = entry.url
        source.target = '_blank'
        source.rel = 'noopener'
        item.append(source)
      }
      return item
    }),
  )
}

async function setupPageCheck() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  $('page-title').textContent = tab?.title ?? ''
  const button = $('check-page')
  if (!tab?.url?.startsWith('http')) {
    button.disabled = true
    button.textContent = 'Only web pages can be checked'
    return
  }

  button.addEventListener('click', async () => {
    button.disabled = true
    button.textContent = 'Checking…'
    const response = await chrome.runtime.sendMessage({
      type: 'check',
      request: { kind: 'page', platform: new URL(tab.url).hostname.replace(/^www\./, ''), url: tab.url, title: tab.title },
    })
    button.disabled = false
    button.textContent = 'Check again'
    if (response?.ok) {
      renderResult($('page-result'), response.result)
      renderHistory()
    } else {
      $('page-result').replaceChildren(h('p', 'muted', `Check failed: ${response?.error ?? 'no response'}`))
    }
  })
}

// Asks the API for real, so the pill says whether checks will work right now
async function refreshStatus() {
  const pill = $('mode')
  pill.textContent = 'Connecting…'
  pill.className = 'pill'
  const status = await chrome.runtime.sendMessage({ type: 'status' }).catch(() => null)
  pill.textContent = status?.message ?? 'API offline'
  pill.classList.add(status?.ok ? 'ok' : 'off')
}

async function setupSettings() {
  const form = $('settings')
  $('active-sites-link').href = `${STUDIO_URL}/settings`
  const settings = await getSettings()
  form.autoCheckAi.checked = settings.autoCheckAi
  form.showChips.checked = settings.showChips
  refreshStatus()

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    await chrome.storage.sync.set({ autoCheckAi: form.autoCheckAi.checked, showChips: form.showChips.checked })
    $('saved').hidden = false
    setTimeout(() => ($('saved').hidden = true), 1500)
  })
}

setupPageCheck()
setupSettings()
renderHistory()
