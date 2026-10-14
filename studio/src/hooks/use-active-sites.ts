import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { ActiveSite } from '@/lib/types'

type State = { sites: ActiveSite[]; loading: boolean; error: string | null }

/** Websites the browser extension runs on automatically, with add/remove that update optimistically. */
export function useActiveSites() {
  const [state, setState] = useState<State>({ sites: [], loading: true, error: null })
  const [pending, setPending] = useState<Set<string>>(new Set())

  useEffect(() => {
    let cancelled = false
    api
      .listActiveSites()
      .then((sites) => !cancelled && setState({ sites, loading: false, error: null }))
      .catch((err) => !cancelled && setState({ sites: [], loading: false, error: err instanceof Error ? err.message : String(err) }))
    return () => {
      cancelled = true
    }
  }, [])

  async function add(domain: string) {
    const site = await api.addActiveSite(domain)
    setState((prev) => (prev.sites.some((s) => s.domain === site.domain) ? prev : { ...prev, sites: [...prev.sites, site] }))
    return site
  }

  async function remove(domain: string) {
    setPending((prev) => new Set(prev).add(domain))
    try {
      await api.removeActiveSite(domain)
      setState((prev) => ({ ...prev, sites: prev.sites.filter((s) => s.domain !== domain) }))
    } finally {
      setPending((prev) => {
        const next = new Set(prev)
        next.delete(domain)
        return next
      })
    }
  }

  return { ...state, add, remove, isPending: (domain: string) => pending.has(domain) }
}
