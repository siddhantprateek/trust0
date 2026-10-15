export type SourceKind =
  | 'instagram'
  | 'x'
  | 'youtube'
  | 'tiktok'
  | 'reddit'
  | 'facebook'
  | 'article'
  // A link straight to a picture file, not a page
  | 'image'
  | 'upload'
  | 'text'

// Media verdicts, plus accurate/mixed/inaccurate for text claims
export type Verdict = 'likely-ai' | 'edited' | 'authentic' | 'accurate' | 'mixed' | 'inaccurate' | 'unverified'

export type ReportStatus = 'complete' | 'analyzing' | 'failed' | 'cancelled'

export type SpreadStep = {
  account: string
  platform: string
  postedAt: string
  note: string
  url?: string | null
  evidence?: 'metadata' | 'visual-match' | 'reverse-search' | 'research' | 'submitted'
  isOrigin?: boolean
}

export type ReportCheck = {
  ok: boolean
  label: string
}

// Political lean of a news outlet (never of a fact)
export type Lean = 'left' | 'lean-left' | 'center' | 'lean-right' | 'right'

export type ClaimSource = {
  url: string
  title?: string | null
  publisher?: string | null
  lean?: Lean | null
}

export type CoverageSource = {
  outlet: string
  domain: string
  url: string
  title: string | null
  publishedAt: string | null
  lean: Lean | null
  // 'table': curated rating; 'estimated': the model's estimate for an outlet missing from the table
  rating: 'table' | 'estimated' | null
  // The decision model's confidence (0-1) in an estimated lean; missing on curated ratings and older reports
  leanConfidence?: number | null
}

export type Coverage = {
  query: string
  sources: CoverageSource[]
  left: number
  center: number
  right: number
  unrated: number
  leftPct: number
  centerPct: number
  rightPct: number
  blindspot: 'left' | 'right' | null
  subjectOutlet: string | null
  subjectLean: Lean | null
}

export type Claim = {
  text: string
  verdict: 'supported' | 'refuted' | 'mixed' | 'unverifiable'
  explanation: string
  sources: ClaimSource[]
}

export type Signals = {
  aiGeneratedProbability: number | null
  aiDetectors: Record<string, number>
  c2pa: string | null
  originality: 'original' | 'reupload' | 'modified-reupload' | 'unknown'
  originUrl: string | null
  skipped: string[]
}

export type Preview = {
  kind: 'image' | 'video' | 'text' | 'link'
  image: string | null
  remoteImage: string | null
  // API path of the full-size checked image or video
  mediaPath: string | null
  mediaType: 'image' | 'video' | null
  frames: string[]
  title: string
  site: string
  text: string
  account: string
  accountUrl: string | null
  postedAt: string | null
  duration: number | null
  linkedUrls: string[]
}

export type ReportSection = {
  kind: 'text' | 'media'
  title: string
  verdict: Verdict
  trustScore: number
  summary: string
  checks: ReportCheck[]
}

export type StepStatus = 'pending' | 'running' | 'complete' | 'skipped' | 'failed' | 'cancelled'

// One stage of the check pipeline (ingest, fingerprint, trace, …), saved live as the check runs
export type ReportStep = {
  id: string
  label: string
  status: StepStatus
  detail: string | null
  startedAt: string | null
  endedAt: string | null
}

// A running or just-finished check, without the evidence, for the background-runs list
export type RunSummary = {
  id: string
  title: string
  status: ReportStatus
  verdict: Verdict
  createdAt: string
  steps: ReportStep[]
}

export type Report = {
  id: string
  title: string
  url: string
  source: SourceKind
  status: ReportStatus
  verdict: Verdict
  trustScore: number
  summary: string
  createdAt: string
  checks: ReportCheck[]
  spread: SpreadStep[]
  claims: Claim[]
  signals: Signals
  sections: ReportSection[]
  coverage: Coverage | null
  preview: Preview | null
  error: string | null
  steps: ReportStep[]
}

export type CheckInput = { kind: 'link'; url: string } | { kind: 'text'; text: string }

export type LinkMeta = {
  url: string
  title: string
  description: string
  image: string | null
  siteName: string
  kind: 'page' | 'image'
}

// A website the browser extension runs on automatically; managed from Settings
export type ActiveSite = {
  domain: string
  addedAt: string
}

export type ModelStatus = 'available' | 'offline' | 'coming-soon'

export type ModelInfo = {
  id: string
  name: string
  task: string
  description: string
  inputs: string[]
  labels: string[]
  endpoint: string | null
  status: ModelStatus
  notes: string[]
}

export type ApiKey = {
  id: string
  name: string
  prefix: string
  createdAt: string
  lastUsedAt: string | null
}

/** Only returned when a key is created; the full key is never shown again */
export type CreatedApiKey = ApiKey & { key: string }

export type VisionPrediction = {
  model: string
  label: string
  aiGenerated: number
  scores: Record<string, number>
}
