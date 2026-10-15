// Favicons for news outlets, via Google's favicon service (free, no key, degrades to a generic globe icon on failure).
export function faviconUrl(domain: string, size = 32) {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${size}`
}

/** Best-effort hostname extraction for sources that only carry a URL, not a bare domain. */
export function domainFromUrl(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}
