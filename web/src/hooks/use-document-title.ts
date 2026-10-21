import { useEffect } from 'react'

const DEFAULT_TITLE = "trust0 · The trust layer for everything you see online"

// "Page · trust0" while the page is mounted, back to the site title after
export function useDocumentTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · trust0` : DEFAULT_TITLE
    return () => {
      document.title = DEFAULT_TITLE
    }
  }, [title])
}
