import { useEffect } from 'react'
import { DEFAULT_DESCRIPTION, DEFAULT_IMAGE, DEFAULT_TITLE, SITE_URL } from '@/lib/seo'

type PageMeta = {
  description?: string
  // Path of the page on the site, e.g. "/blog/some-post". Defaults to the current location.
  path?: string
  image?: string
  type?: 'website' | 'article'
  noindex?: boolean
}

function setMeta(selector: string, attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.content = content
}

function setCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.rel = 'canonical'
    document.head.appendChild(el)
  }
  el.href = href
}

// "Page · trust0" while the page is mounted, back to the site defaults after.
// Also keeps the description, canonical link and social card tags in step with the page, for crawlers that run scripts.
export function useDocumentTitle(title?: string, meta: PageMeta = {}) {
  const { description = DEFAULT_DESCRIPTION, path, image = DEFAULT_IMAGE, type = 'website', noindex = false } = meta

  useEffect(() => {
    const full = title ? `${title} · trust0` : DEFAULT_TITLE
    const url = `${SITE_URL}${path ?? (window.location.pathname === '/' ? '' : window.location.pathname)}`
    document.title = full
    setMeta('meta[name="description"]', 'name', 'description', description)
    setMeta('meta[name="robots"]', 'name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large')
    setCanonical(url || `${SITE_URL}/`)
    setMeta('meta[property="og:title"]', 'property', 'og:title', full)
    setMeta('meta[property="og:description"]', 'property', 'og:description', description)
    setMeta('meta[property="og:url"]', 'property', 'og:url', url || `${SITE_URL}/`)
    setMeta('meta[property="og:type"]', 'property', 'og:type', type)
    setMeta('meta[property="og:image"]', 'property', 'og:image', image)
    setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', full)
    setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description)
    setMeta('meta[name="twitter:image"]', 'name', 'twitter:image', image)
    return () => {
      document.title = DEFAULT_TITLE
    }
  }, [title, description, path, image, type, noindex])
}
