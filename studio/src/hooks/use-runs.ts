import { useEffect, useState } from 'react'
import { api, RUNS_CHANGED_EVENT } from '@/lib/api'
import type { RunSummary } from '@/lib/types'

const ACTIVE_POLL_MS = 2000
// Checks sent from the browser extension don't fire the in-app event, so idle polling still finds them
const IDLE_POLL_MS = 15000

/** Running and just-finished checks, polled quickly while any are running. */
export function useRuns() {
  const [runs, setRuns] = useState<RunSummary[]>([])

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>

    const tick = async () => {
      clearTimeout(timer)
      let anyRunning = false
      try {
        const next = await api.listRuns()
        if (cancelled) return
        setRuns(next)
        anyRunning = next.some((run) => run.status === 'analyzing')
      } catch {
        // The header shouldn't surface API errors; pages already do
      }
      if (cancelled) return
      timer = setTimeout(tick, anyRunning ? ACTIVE_POLL_MS : IDLE_POLL_MS)
    }
    tick()

    window.addEventListener(RUNS_CHANGED_EVENT, tick)
    window.addEventListener('focus', tick)
    return () => {
      cancelled = true
      clearTimeout(timer)
      window.removeEventListener(RUNS_CHANGED_EVENT, tick)
      window.removeEventListener('focus', tick)
    }
  }, [])

  return runs
}
