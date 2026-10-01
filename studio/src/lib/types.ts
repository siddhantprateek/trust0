export type SourceKind = 'instagram' | 'x' | 'youtube' | 'tiktok' | 'reddit' | 'article' | 'upload'

export type Verdict = 'likely-ai' | 'edited' | 'authentic' | 'unverified'

export type ReportStatus = 'complete' | 'analyzing' | 'failed'

export type SpreadStep = {
  account: string
  platform: string
  postedAt: string
  note: string
}

export type ReportCheck = {
  ok: boolean
  label: string
}

export type Report = {
  id: string
  title: string
  url: string
  source: SourceKind
  status: ReportStatus
  verdict: Verdict
  trustScore: number
  createdAt: string
  checks: ReportCheck[]
  spread: SpreadStep[]
}
