// The public origin used for canonical links, social cards and the sitemap. Override with VITE_SITE_URL.
export const SITE_URL = (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, '') ?? 'https://trytrust0.online'

export const SITE_NAME = 'trust0'
export const DEFAULT_TITLE = 'trust0 · The trust layer for everything you see online'
export const DEFAULT_DESCRIPTION =
  'trust0 checks links, photos, videos and AI answers: a verdict, a trust score, where the content first appeared, and the evidence behind it.'
export const DEFAULT_IMAGE = `${SITE_URL}/og-image.jpg`
