// Live website screenshots from microlink.io (free tier, rate limited). The page URL is sent to microlink.
export function screenshotUrl(url: string, width = 400, height = 250) {
  const params = new URLSearchParams({
    url,
    screenshot: 'true',
    meta: 'false',
    embed: 'screenshot.url',
    'viewport.isMobile': 'true',
    'viewport.deviceScaleFactor': '1',
    'viewport.width': String(width * 3),
    'viewport.height': String(height * 3),
  })
  return `https://api.microlink.io/?${params}`
}

/** Only real web pages get a screenshot: not '#', data URLs or a direct image link. */
export function canScreenshot(url: string | null | undefined): url is string {
  return Boolean(url && /^https?:\/\//i.test(url) && !/\.(jpe?g|png|gif|webp|avif|svg|mp4|webm)(\?|$)/i.test(url))
}
