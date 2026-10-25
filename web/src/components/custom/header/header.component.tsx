import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'motion/react'
import { Menu, X } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import Logo from '@/components/custom/logo/logo.component'
import NavLink from '@/components/custom/nav-link/nav-link.component'
import { Button } from '@/components/ui/button'
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu'
import { site } from '@/config/site'
import { useCases } from '@/data/use-cases'
import { ease } from '@/lib/motion'
import { cn } from '@/lib/utils'

type MenuLink = { label: string; description: string; href: string }

const menus: { label: string; links: MenuLink[] }[] = [
  {
    label: 'Product',
    links: [
      { label: 'Media Check', description: 'Spot synthetic and edited photos and video.', href: '/#features' },
      { label: 'Source Trace', description: 'Follow content back to where it started.', href: '/#features' },
      { label: 'Claim Watch', description: 'Catch AI that’s confidently wrong.', href: '/#features' },
      { label: 'Reports', description: 'One shareable verdict per link.', href: '/#showcase' },
    ],
  },
  {
    label: 'Use cases',
    links: useCases.map((u) => ({ label: u.label, description: u.blurb, href: `/use-cases/${u.slug}` })),
  },
]

const links = [
  { label: 'Blog', href: '/blog' },
  { label: 'FAQ', href: '/#faq' },
]

export default function Header() {
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const { scrollY } = useScroll()
  const headerRef = useRef<HTMLDivElement>(null)
  const [pastHero, setPastHero] = useState(false)

  // Transparent while the header is over the hero image, solid once it scrolls past it
  const update = useCallback((y: number) => {
    const hero = document.getElementById('hero')
    const heroBottom = hero ? hero.offsetTop + hero.offsetHeight : 0
    // Bottom edge of the floating bar, including its offset from the top
    const barBottom = headerRef.current?.getBoundingClientRect().bottom ?? 0
    setPastHero(y + barBottom >= heroBottom)
  }, [])
  useMotionValueEvent(scrollY, 'change', update)

  // Also check on load and route change: a restored scroll position doesn't fire a change event
  useEffect(() => {
    const frame = requestAnimationFrame(() => update(window.scrollY))
    return () => cancelAnimationFrame(frame)
  }, [pathname, update])

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  // Following a menu link closes the phone menu
  const closeMenu = () => setMenuOpen(false)

  const overHero = pathname === '/' && !pastHero && !menuOpen

  // Nav items sit on the image while over the hero, so hovers go translucent white
  const navItemClass = cn(
    'bg-transparent',
    overHero &&
      'text-white hover:bg-white/10 hover:text-white focus:bg-white/10 data-open:bg-white/10 data-open:hover:bg-white/15 data-open:focus:bg-white/15',
  )

  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={ease}
      // Floating bar inset from the edges; the outer strip lets clicks through
      className="pointer-events-none fixed inset-x-0 top-4 z-50 px-4 [--radius:1.4rem]"
    >
      <div
        ref={headerRef}
        className={cn(
          'pointer-events-auto relative isolate mx-auto flex h-14 max-w-[88rem] items-center justify-between gap-4 rounded-lg border pr-2 pl-4 transition-colors duration-300',
          // Plain over the hero; becomes the floating bar once it scrolls past
          overHero ? 'border-transparent text-white' : 'border-border text-foreground',
        )}
      >
        {/* Glass lives on its own layer: a backdrop-filter on the bar itself would stop the
            dropdown (a descendant) from blurring the page behind it */}
        <div
          aria-hidden
          className={cn(
            'absolute inset-0 -z-10 rounded-[inherit] transition-colors duration-300',
            !overHero && 'bg-background/85 backdrop-blur-md',
          )}
        />
        <Link to="/" aria-label="trust0 home">
          <Logo inverted={overHero} />
        </Link>

        <NavigationMenu viewport={false} className="hidden md:flex">
          <NavigationMenuList className="gap-1">
            {menus.map((menu) => (
              <NavigationMenuItem key={menu.label}>
                <NavigationMenuTrigger className={navItemClass}>{menu.label}</NavigationMenuTrigger>
                {/* Opens below the floating bar (not the trigger) and matches its surface */}
                <NavigationMenuContent className="[--radius:0.625rem] group-data-[viewport=false]/navigation-menu:mt-6 group-data-[viewport=false]/navigation-menu:bg-background/85 group-data-[viewport=false]/navigation-menu:text-foreground group-data-[viewport=false]/navigation-menu:backdrop-blur-md group-data-[viewport=false]/navigation-menu:shadow-none group-data-[viewport=false]/navigation-menu:ring-border">
                  <ul className="grid w-[30rem] grid-cols-2 gap-1 p-1">
                    {menu.links.map((link) => (
                      <li key={link.label}>
                        <NavigationMenuLink asChild>
                          <NavLink href={link.href} className="flex-col items-start gap-0.5">
                            <span className="font-medium">{link.label}</span>
                            <span className="text-xs text-muted-foreground">{link.description}</span>
                          </NavLink>
                        </NavigationMenuLink>
                      </li>
                    ))}
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
            ))}
            {links.map((link) => (
              <NavigationMenuItem key={link.label}>
                <NavigationMenuLink asChild className={cn('h-9 px-2.5 font-medium', navItemClass)}>
                  <NavLink href={link.href}>{link.label}</NavLink>
                </NavigationMenuLink>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>

        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="lg"
            asChild
            className={cn('hidden px-3 sm:inline-flex', overHero && 'text-white hover:bg-white/10 hover:text-white')}
          >
            <a href={site.studioUrl}>Sign in</a>
          </Button>
          <Button size="lg" asChild className="h-10 rounded-[0.9rem] px-5 font-semibold">
            <a href={site.studioUrl}>Get started</a>
          </Button>
          <button
            type="button"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((open) => !open)}
            className={cn(
              'grid size-10 place-items-center rounded-[0.9rem] md:hidden',
              overHero ? 'text-white hover:bg-white/10' : 'hover:bg-muted',
            )}
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>

        <AnimatePresence>
          {menuOpen && (
            <motion.nav
              id="mobile-menu"
              aria-label="Menu"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-x-0 top-[calc(100%+0.5rem)] max-h-[calc(100svh-6rem)] overflow-y-auto rounded-2xl border bg-background p-3 text-foreground md:hidden"
            >
              {menus.map((menu) => (
                <div key={menu.label} className="pb-2">
                  <p className="px-3 pt-2 pb-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">{menu.label}</p>
                  <ul>
                    {menu.links.map((link) => (
                      <li key={link.label}>
                        <NavLink href={link.href} onClick={closeMenu} className="flex min-h-11 flex-col justify-center rounded-lg px-3 py-1.5 hover:bg-muted">
                          <span className="text-sm font-medium">{link.label}</span>
                          <span className="text-xs text-muted-foreground">{link.description}</span>
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <ul className="border-t pt-2">
                {links.map((link) => (
                  <li key={link.label}>
                    <NavLink href={link.href} onClick={closeMenu} className="flex min-h-11 items-center rounded-lg px-3 text-sm font-medium hover:bg-muted">
                      {link.label}
                    </NavLink>
                  </li>
                ))}
                <li className="sm:hidden">
                  <a href={site.studioUrl} onClick={closeMenu} className="flex min-h-11 items-center rounded-lg px-3 text-sm font-medium hover:bg-muted">
                    Sign in
                  </a>
                </li>
              </ul>
            </motion.nav>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  )
}
