import type { ActiveSite, ApiKey, CheckInput, CreatedApiKey, LinkMeta, ModelInfo, Preview, Report, RunSummary } from '@/lib/types'

export const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000').replace(/\/+$/, '')

// Fired after a check is started or cancelled, so the background-runs indicator updates without waiting for its next poll
export const RUNS_CHANGED_EVENT = 'trust0:runs-changed'

function announceRuns<T>(result: T): T {
  window.dispatchEvent(new Event(RUNS_CHANGED_EVENT))
  return result
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, init)
  } catch {
    throw new Error(`Can't reach the analysis API at ${API_URL}. Is the backend running?`)
  }
  if (!response.ok) {
    let detail = ''
    try {
      const body = await response.json()
      detail = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail ?? '')
    } catch {
      // not JSON
    }
    throw new Error(detail || `API error ${response.status}`)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

// Absolute URL for a path the API hands back, e.g. a report's kept media
export const apiUrl = (path: string) => `${API_URL}${path}`

// Fill fields an older API (or a report saved before they existed) leaves out, so pages can rely on them
function normalize(report: Report): Report {
  const preview: Preview | null = report.preview
    ? {
        ...report.preview,
        mediaPath: report.preview.mediaPath ?? null,
        mediaType: report.preview.mediaType ?? null,
        frames: report.preview.frames ?? [],
        title: report.preview.title ?? '',
        site: report.preview.site ?? '',
        text: report.preview.text ?? '',
        linkedUrls: report.preview.linkedUrls ?? [],
      }
    : null
  return {
    ...report,
    checks: report.checks ?? [],
    spread: report.spread ?? [],
    claims: report.claims ?? [],
    sections: report.sections ?? [],
    coverage: report.coverage ?? null,
    preview,
    steps: report.steps ?? [],
  }
}

export const api = {
  listReports: () => request<Report[]>('/v1/reports').then((reports) => reports.map(normalize)),
  getReport: (id: string) => request<Report>(`/v1/reports/${encodeURIComponent(id)}`).then(normalize),
  createReport: (input: CheckInput) =>
    request<Report>('/v1/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }).then(announceRuns),
  cancelReport: (id: string) =>
    request<Report>(`/v1/reports/${encodeURIComponent(id)}/cancel`, { method: 'POST' }).then(normalize).then(announceRuns),
  listRuns: () => request<RunSummary[]>('/v1/runs'),
  linkPreview: (url: string) => request<LinkMeta>(`/v1/link-preview?url=${encodeURIComponent(url)}`),
  listActiveSites: () => request<ActiveSite[]>('/v1/extension/active-sites'),
  addActiveSite: (domain: string) =>
    request<ActiveSite>('/v1/extension/active-sites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain }),
    }),
  removeActiveSite: (domain: string) =>
    request<void>(`/v1/extension/active-sites/${encodeURIComponent(domain)}`, { method: 'DELETE' }),
  listModels: () => request<ModelInfo[]>('/v1/models'),
  getModel: (id: string) => request<ModelInfo>(`/v1/models/${encodeURIComponent(id)}`),
  listApiKeys: () => request<ApiKey[]>('/v1/api-keys'),
  createApiKey: (name: string) =>
    request<CreatedApiKey>('/v1/api-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    }),
  deleteApiKey: (id: string) => request<void>(`/v1/api-keys/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  uploadReport: (file: File) => {
    const body = new FormData()
    body.append('file', file)
    return request<Report>('/v1/reports/upload', { method: 'POST', body }).then(announceRuns)
  },
}
