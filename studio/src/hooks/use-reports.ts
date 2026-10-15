import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { Report } from '@/lib/types'

// The list carries every report's preview, so it polls gently; one report polls fast enough to watch its stages
const LIST_POLL_MS = 3000
const REPORT_POLL_MS = 1000

type State<T> = { data: T; loading: boolean; error: string | null }

/** Fetches with `load`, and keeps refetching every few seconds while `isPending(data)` is true. */
function usePolled<T>(
  load: () => Promise<T>,
  isPending: (data: T) => boolean,
  initial: T,
  key: string,
  intervalMs: number,
): State<T> {
  const [state, setState] = useState<State<T>>({ data: initial, loading: true, error: null })

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>

    const tick = async () => {
      try {
        const data = await load()
        if (cancelled) return
        setState({ data, loading: false, error: null })
        if (isPending(data)) timer = setTimeout(tick, intervalMs)
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
  return usePolled<Report[]>(api.listReports, (reports) => reports.some((r) => r.status === 'analyzing'), [], 'list', LIST_POLL_MS)
}

export function useReport(id: string | undefined) {
  return usePolled<Report | null>(
    () => (id ? api.getReport(id) : Promise.resolve(null)),
    (report) => report?.status === 'analyzing',
    null,
    id ?? '',
    REPORT_POLL_MS,
  )
}
