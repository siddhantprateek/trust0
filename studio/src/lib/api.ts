import type { CheckInput, LinkMeta, Preview, Report } from '@/lib/types'

const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000').replace(/\/+$/, '')

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
    preview,
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
    }),
  linkPreview: (url: string) => request<LinkMeta>(`/v1/link-preview?url=${encodeURIComponent(url)}`),
  uploadReport: (file: File) => {
    const body = new FormData()
    body.append('file', file)
    return request<Report>('/v1/reports/upload', { method: 'POST', body })
  },
}
