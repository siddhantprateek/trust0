import { useEffect } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

// Scrolls to the section named in the URL hash (waiting for it to mount after a page change), or to the
// top of a newly opened page. Back/forward keeps the browser's own scroll restoration.
export default function ScrollManager() {
  const { pathname, hash, key } = useLocation()
  const navigationType = useNavigationType()

  useEffect(() => {
    if (navigationType === 'POP') return

    if (!hash) {
      // Again after the exit animation: until the old page unmounts, the page is still as tall as it was
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
      const timer = window.setTimeout(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }), 250)
      return () => window.clearTimeout(timer)
    }

    const id = decodeURIComponent(hash.slice(1))
    const started = performance.now()
    let timer = 0
    // The target only exists once the new page has mounted, so look for it for a moment. A timer rather
    // than an animation frame, which a background tab pauses
    const seek = () => {
      const el = document.getElementById(id)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      else if (performance.now() - started < 8000) timer = window.setTimeout(seek, 50)
    }
    timer = window.setTimeout(seek, 0)
    return () => window.clearTimeout(timer)
  }, [pathname, hash, key, navigationType])

  return null
}
