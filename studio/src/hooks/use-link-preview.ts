import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { LinkMeta } from '@/lib/types'

// One request per URL for the whole session; failures resolve to null so cards fall back to the bare link
const cache = new Map<string, Promise<LinkMeta | null>>()

function load(url: string) {
  let pending = cache.get(url)
  if (!pending) {
    pending = api.linkPreview(url).catch(() => null)
    cache.set(url, pending)
  }
  return pending
}

/** Title, description and image for a link, fetched through the API. `null` url skips the fetch. */
export function useLinkPreview(url: string | null | undefined) {
  const [state, setState] = useState<{ url: string | null; data: LinkMeta | null }>({ url: null, data: null })

  useEffect(() => {
    if (!url) return
    let cancelled = false
    load(url).then((data) => {
      if (!cancelled) setState({ url, data })
    })
    return () => {
      cancelled = true
    }
  }, [url])

  const loading = Boolean(url) && state.url !== url
  return { data: state.url === url ? state.data : null, loading }
}
