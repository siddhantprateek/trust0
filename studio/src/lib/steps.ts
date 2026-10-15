import type { ReportStep } from '@/lib/types'

// Rough share of a check's time each stage takes, so the progress bar moves at a believable pace
const WEIGHTS: Record<string, number> = { ingest: 1, media: 2, provenance: 3, ai: 1, factcheck: 3, coverage: 2, score: 1 }

export const stepWeight = (step: ReportStep) => WEIGHTS[step.id] ?? 1

/** How much of a stage's segment is filled: done stages are full, a running one is half way. */
export function stepFill(step: ReportStep) {
  if (step.status === 'pending') return 0
  if (step.status === 'running') return 0.5
  return 1
}

export function stepsProgress(steps: ReportStep[]) {
  const total = steps.reduce((sum, step) => sum + stepWeight(step), 0)
  const done = steps.reduce((sum, step) => sum + stepWeight(step) * stepFill(step), 0)
  return total ? Math.round((done / total) * 100) : 0
}

/** Provenance and AI detection run side by side, so more than one stage can be running. */
export const runningSteps = (steps: ReportStep[]) => steps.filter((step) => step.status === 'running')

/** Milliseconds a stage took, or has taken so far while it's running. */
export function stepElapsedMs(step: ReportStep, now: number) {
  if (!step.startedAt) return null
  const end = step.endedAt ? Date.parse(step.endedAt) : now
  return Math.max(0, end - Date.parse(step.startedAt))
}

/** Wall-clock time from the first stage starting to the last one ending (or now, while running). */
export function runElapsedMs(steps: ReportStep[], now: number) {
  const starts = steps.flatMap((step) => (step.startedAt ? [Date.parse(step.startedAt)] : []))
  if (starts.length === 0) return null
  const running = steps.some((step) => step.status === 'running')
  const ends = steps.flatMap((step) => (step.endedAt ? [Date.parse(step.endedAt)] : []))
  const end = running || ends.length === 0 ? now : Math.max(...ends)
  return Math.max(0, end - Math.min(...starts))
}

export function formatDuration(ms: number) {
  if (ms < 1000) return `${(ms / 1000).toFixed(1)}s`
  const seconds = Math.round(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  return `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, '0')}s`
}

export function formatAgo(iso: string, now: number) {
  const seconds = Math.max(0, Math.round((now - Date.parse(iso)) / 1000))
  if (seconds < 45) return 'just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  return `${Math.round(minutes / 60)}h ago`
}
