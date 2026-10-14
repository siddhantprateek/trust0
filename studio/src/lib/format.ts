import type { Report, SourceKind, Verdict } from '@/lib/types'

export const sourceLabels: Record<SourceKind, string> = {
  instagram: 'Instagram',
  x: 'X',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  reddit: 'Reddit',
  facebook: 'Facebook',
  article: 'Article',
  image: 'Image link',
  upload: 'Upload',
  text: 'Text',
}

const IMAGE_PATH = /\.(jpe?g|png|gif|webp|avif|bmp|heic)$/i

/** The report's source label. Reports saved before image links had their own source say "article". */
export function sourceLabel(report: Pick<Report, 'source' | 'url'>) {
  if (report.source === 'article' && report.url) {
    try {
      if (IMAGE_PATH.test(new URL(report.url).pathname)) return sourceLabels.image
    } catch {
      // not a URL
    }
  }
  return sourceLabels[report.source]
}

export const verdictLabels: Record<Verdict, string> = {
  'likely-ai': 'Likely AI-generated',
  edited: 'Edited',
  authentic: 'Likely authentic',
  accurate: 'Accurate',
  mixed: 'Mixed',
  inaccurate: 'Inaccurate',
  unverified: 'Unverified',
}

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(
    new Date(iso),
  )
}
