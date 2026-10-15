import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { ApiKey } from '@/lib/types'

type State = { keys: ApiKey[]; loading: boolean; error: string | null }

/** The workspace's API keys for calling trust0 models, with create and revoke. */
export function useApiKeys() {
  const [state, setState] = useState<State>({ keys: [], loading: true, error: null })
  const [pending, setPending] = useState<Set<string>>(new Set())

  useEffect(() => {
    let cancelled = false
    api
      .listApiKeys()
      .then((keys) => !cancelled && setState({ keys, loading: false, error: null }))
      .catch((err) => !cancelled && setState({ keys: [], loading: false, error: err instanceof Error ? err.message : String(err) }))
    return () => {
      cancelled = true
    }
  }, [])

  async function create(name: string) {
    const created = await api.createApiKey(name)
    // Keep the secret out of the list; the caller shows it once
    const listed: ApiKey = { id: created.id, name: created.name, prefix: created.prefix, createdAt: created.createdAt, lastUsedAt: null }
    setState((prev) => ({ ...prev, keys: [listed, ...prev.keys] }))
    return created
  }

  async function revoke(id: string) {
    setPending((prev) => new Set(prev).add(id))
    try {
      await api.deleteApiKey(id)
      setState((prev) => ({ ...prev, keys: prev.keys.filter((k) => k.id !== id) }))
    } finally {
      setPending((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  return { ...state, create, revoke, isPending: (id: string) => pending.has(id) }
}
