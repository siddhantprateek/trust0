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

export type ReportStatus = 'complete' | 'analyzing' | 'failed'

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
