const AUTH_PATHS = ['/sign-in', '/sign-up']

/**
 * Where to go after signing in: the `redirect_url` param when it's a page inside the studio, otherwise the overview.
 * Never an auth page (that's what left people stuck on /sign-in after a successful login) and never another site.
 */
export function afterAuthPath(search: string): string {
  const raw = new URLSearchParams(search).get('redirect_url')
  if (!raw) return '/'
  let url: URL
  try {
    url = new URL(raw, window.location.origin)
  } catch {
    return '/'
  }
  if (url.origin !== window.location.origin) return '/'
  if (AUTH_PATHS.some((p) => url.pathname === p || url.pathname.startsWith(`${p}/`))) return '/'
  return `${url.pathname}${url.search}${url.hash}`
}

export function signInPath(returnTo: string): string {
  return returnTo === '/' ? '/sign-in' : `/sign-in?redirect_url=${encodeURIComponent(returnTo)}`
}
