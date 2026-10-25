import { useEffect, useState } from 'react'
import { sampleReport } from '@/data/sample-report'
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

// The bundled sample report is always listed and opens without the API, so the studio has something to show
// even before a backend is connected
export function useReports() {
  const state = usePolled<Report[]>(api.listReports, (reports) => reports.some((r) => r.status === 'analyzing'), [], 'list', LIST_POLL_MS)
  const data = state.data.some((r) => r.id === sampleReport.id) ? state.data : [...state.data, sampleReport]
  return { ...state, data }
}

export function useReport(id: string | undefined) {
  return usePolled<Report | null>(
    () => (id === sampleReport.id ? Promise.resolve(sampleReport) : id ? api.getReport(id) : Promise.resolve(null)),
    (report) => report?.status === 'analyzing',
    null,
    id ?? '',
    REPORT_POLL_MS,
  )
}
