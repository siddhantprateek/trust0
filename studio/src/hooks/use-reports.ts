import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { Report } from '@/lib/types'

const POLL_MS = 3000

type State<T> = { data: T; loading: boolean; error: string | null }

/** Fetches with `load`, and keeps refetching every few seconds while `isPending(data)` is true. */
function usePolled<T>(load: () => Promise<T>, isPending: (data: T) => boolean, initial: T, key: string): State<T> {
  const [state, setState] = useState<State<T>>({ data: initial, loading: true, error: null })

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>

    const tick = async () => {
      try {
        const data = await load()
        if (cancelled) return
        setState({ data, loading: false, error: null })
        if (isPending(data)) timer = setTimeout(tick, POLL_MS)
      } catch (err) {
        if (cancelled) return
        setState((prev) => ({ ...prev, loading: false, error: err instanceof Error ? err.message : String(err) }))
      }
    }
    tick()

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return state
}

export function useReports() {
  return usePolled<Report[]>(api.listReports, (reports) => reports.some((r) => r.status === 'analyzing'), [], 'list')
}

export function useReport(id: string | undefined) {
  return usePolled<Report | null>(
    () => (id ? api.getReport(id) : Promise.resolve(null)),
    (report) => report?.status === 'analyzing',
    null,
    id ?? '',
  )
}
