import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { motion } from 'motion/react'
import { ChevronDown, Download, Newspaper } from 'lucide-react'
import { site } from '@/config/site'
import heroImage from '@/assets/hero-hills.webp'
import instagramLogo from '@/assets/logos/instagram.svg'
import redditLogo from '@/assets/logos/reddit.svg'
import tiktokLogo from '@/assets/logos/tiktok.svg'
import xLogo from '@/assets/logos/x.svg'
import youtubeLogo from '@/assets/logos/youtube.svg'
import ReportMockup from '@/components/custom/report-mockup/report-mockup.component'
import { Button } from '@/components/ui/button'
import { fadeUp, stagger } from '@/lib/motion'

const maskOf = (url: string): CSSProperties => ({
  maskImage: `url("${url}")`,
  maskSize: 'contain',
  maskPosition: 'center',
  maskRepeat: 'no-repeat',
  WebkitMaskImage: `url("${url}")`,
  WebkitMaskSize: 'contain',
  WebkitMaskPosition: 'center',
  WebkitMaskRepeat: 'no-repeat',
})

function ChromeLogo() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className="size-4">
      <path fill="#EA4335" d="M24 4a20 20 0 0 1 17.32 10H24a10 10 0 0 0-8.66 5L7.4 10.4A20 20 0 0 1 24 4Z" />
      <path fill="#FBBC05" d="M6.68 14 15.34 19A10 10 0 0 0 19 34.3L10.6 41.4A20 20 0 0 1 6.68 14Z" />
      <path fill="#34A853" d="M24 44a20 20 0 0 1-13.4-2.6L19 34.3A10 10 0 0 0 33.66 29l8.6 5A20 20 0 0 1 24 44Z" />
      <path fill="#4285F4" d="M41.32 14A20 20 0 0 1 42.26 34l-8.6-5A10 10 0 0 0 24 14Z" />
      <circle cx="24" cy="24" r="8" fill="#fff" />
      <circle cx="24" cy="24" r="6.2" fill="#4285F4" />
    </svg>
  )
}

function ExtensionMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <Button
        size="lg"
        className="bg-white text-neutral-900 hover:bg-white/90"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <ChromeLogo /> Add Chrome extension <ChevronDown className={open ? 'rotate-180' : ''} />
      </Button>
      {open && (
        <div
          role="menu"
          className="absolute top-full left-0 z-20 mt-2 w-72 overflow-hidden rounded-xl border border-black/10 bg-white p-1 text-left text-neutral-900 shadow-xl"
        >
          <button
            type="button"
            role="menuitem"
            disabled
            className="flex w-full cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2.5 text-sm opacity-60"
          >
            <ChromeLogo />
            <span className="flex-1 text-left">Chrome Web Store</span>
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium">Coming soon</span>
          </button>
          <a
            role="menuitem"
            href={site.githubUrl}
            target="_blank"
            rel="noreferrer"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-neutral-100"
          >
            <Download className="size-4" />
            <span className="flex-1">Download from GitHub</span>
          </a>
        </div>
      )}
    </div>
  )
}

// Brand marks from Simple Icons (CC0), drawn in the text colour through a mask
const sources = [
  { name: 'Instagram', logo: instagramLogo },
  { name: 'X', logo: xLogo },
  { name: 'YouTube', logo: youtubeLogo },
  { name: 'TikTok', logo: tiktokLogo },
  { name: 'Reddit', logo: redditLogo },
  { name: 'News articles', logo: null },
]

function HeroBackground() {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden bg-[#3b5b8a]">
      {/* Slow push-in on the image */}
      <motion.img
        src={heroImage}
        alt=""
        width={1672}
        height={942}
        fetchPriority="high"
        decoding="async"
        className="size-full object-cover object-center"
        initial={{ scale: 1.08 }}
        animate={{ scale: 1 }}
        transition={{ duration: 2.4, ease: [0.22, 1, 0.36, 1] }}
      />
      {/* Darken bottom-left behind the copy, and the top edge behind the header */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_70%_at_10%_90%,rgb(0_0_0/0.45),transparent_70%)]" />
      <div className="absolute inset-x-0 top-0 h-36 bg-linear-to-b from-black/35 to-transparent" />
    </div>
  )
}

export default function Hero() {
  return (
    <section>
      <div id="hero" className="relative flex min-h-[clamp(34rem,calc(100svh-7.5rem),56rem)] items-end overflow-hidden">
        <HeroBackground />

        <div className="relative z-2 mx-auto grid w-full max-w-[88rem] justify-items-center gap-12 px-4 pt-28 pb-0 lg:grid-cols-[minmax(0,32rem)_minmax(0,1fr)] lg:items-end lg:justify-items-start">
          <motion.div variants={stagger} initial="hidden" animate="visible" className="flex max-w-3xl flex-col items-center text-center text-white lg:items-start lg:pb-24 lg:text-left">
            <motion.p variants={fadeUp} className="text-xs font-semibold tracking-wider uppercase text-white/75">
              Content provenance · AI detection
            </motion.p>
            <motion.h1
              variants={fadeUp}
              className="mt-4 font-serif text-5xl leading-[1.02] font-medium tracking-tighter sm:text-6xl lg:text-6xl"
            >
              The trust layer for everything you see online.
            </motion.h1>
            <motion.p variants={fadeUp} className="mt-6 max-w-[40rem] text-base text-pretty text-white/85 sm:text-lg">
              Paste a video, photo, post or article. trust0 traces where it came from, shows how it was made, and
              flags the AI that&rsquo;s confidently wrong about it.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-8 flex flex-wrap justify-center gap-2 lg:justify-start">
              <ExtensionMenu />
              <Button
                size="lg"
                variant="outline"
                asChild
                className="border-white/35 bg-white/5 text-white hover:bg-white/15 hover:text-white dark:border-white/35 dark:bg-white/5 dark:hover:bg-white/15"
              >
                <a href="#features">See how it works</a>
              </Button>
            </motion.div>
          </motion.div>

          {/* Mockup bleeds off the bottom edge of the hero */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="h-[26rem] w-full max-w-[80rem] overflow-hidden rounded-t-xl sm:h-[34rem] lg:h-[40rem] lg:w-[calc(100%+max(1rem,(100vw-88rem)/2+1rem))] lg:max-w-none lg:rounded-tr-none"
          >
            <ReportMockup />
          </motion.div>
        </div>
      </div>

      <div className="mx-auto flex max-w-[88rem] flex-col gap-6 px-4 py-8 md:flex-row md:items-center md:gap-12">
        <p className="shrink-0 text-sm text-muted-foreground md:max-w-48">Paste links from wherever content spreads</p>
        <ul className="flex flex-wrap items-center gap-x-10 gap-y-3">
          {sources.map(({ name, logo }) => (
            <li key={name} className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-foreground/70">
              {logo ? (
                <span
                  aria-hidden
                  className="size-6 bg-current"
                  style={{ ...maskOf(logo) }}
                />
              ) : (
                <Newspaper aria-hidden className="size-6" strokeWidth={2.2} />
              )}
              {name === 'X' ? <span className="sr-only">X</span> : name}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
