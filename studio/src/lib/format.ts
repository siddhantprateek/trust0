import type { SourceKind, Verdict } from '@/lib/types'

export const sourceLabels: Record<SourceKind, string> = {
  instagram: 'Instagram',
  x: 'X',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  reddit: 'Reddit',
  article: 'Article',
  upload: 'Upload',
}

export const verdictLabels: Record<Verdict, string> = {
  'likely-ai': 'Likely AI-generated',
  edited: 'Edited',
  authentic: 'Likely authentic',
  unverified: 'Unverified',
}

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(
    new Date(iso),
  )
}
