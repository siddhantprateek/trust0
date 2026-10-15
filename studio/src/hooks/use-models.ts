import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { ModelInfo } from '@/lib/types'

type ListState = { models: ModelInfo[]; loading: boolean; error: string | null }

/** trust0's own models, released and upcoming, with whether this server has each one loaded. */
export function useModels() {
  const [state, setState] = useState<ListState>({ models: [], loading: true, error: null })

  useEffect(() => {
    let cancelled = false
    api
      .listModels()
      .then((models) => !cancelled && setState({ models, loading: false, error: null }))
      .catch((err) => !cancelled && setState({ models: [], loading: false, error: err instanceof Error ? err.message : String(err) }))
    return () => {
      cancelled = true
    }
  }, [])

  return state
}

type DetailState = { model: ModelInfo | null; loading: boolean; error: string | null }

export function useModel(id: string | undefined) {
  const [state, setState] = useState<DetailState>({ model: null, loading: true, error: null })

  useEffect(() => {
    if (!id) return
    let cancelled = false
    api
      .getModel(id)
      .then((model) => !cancelled && setState({ model, loading: false, error: null }))
      .catch((err) => !cancelled && setState({ model: null, loading: false, error: err instanceof Error ? err.message : String(err) }))
    return () => {
      cancelled = true
    }
    // Re-fetch whenever the route's model id changes
  }, [id])

  return state
}
