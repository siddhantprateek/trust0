import { Link } from 'react-router-dom'
import Logo from '@/components/custom/logo/logo.component'
import NavLink from '@/components/custom/nav-link/nav-link.component'
import { Button } from '@/components/ui/button'
import { site } from '@/config/site'

const columns = [
  {
    title: 'Product',
    links: [
      { label: 'Media Check', href: '/#features' },
      { label: 'Source Trace', href: '/#features' },
      { label: 'Claim Watch', href: '/#features' },
      { label: 'Reports', href: '/#showcase' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Blog', href: '/blog' },
      { label: 'FAQ', href: '/#faq' },
      { label: 'Docs', href: '#' },
      { label: 'API', href: '#' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Terms', href: '/terms' },
      { label: 'Privacy', href: '/privacy' },
    ],
  },
]

const socials = [
  {
    label: 'X (Twitter)',
    href: '#',
    path: 'M18.9 2H22l-6.8 7.8L23 22h-6.2l-4.9-6.4L6.3 22H3.2l7.3-8.3L1 2h6.3l4.4 5.8L18.9 2Zm-1.1 18.1h1.7L6.3 3.8H4.5l13.3 16.3Z',
  },
  {
    label: 'GitHub',
    href: site.githubUrl,
    path: 'M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.3-3.4-1.3-.4-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.4 1.1 2.9.8.1-.6.4-1.1.6-1.3-2.2-.3-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.8 1a9.6 9.6 0 0 1 5 0c1.9-1.3 2.8-1 2.8-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 3.9-2.4 4.7-4.6 5 .4.3.7.9.7 1.9V21c0 .3.2.6.7.5A10 10 0 0 0 12 2Z',
  },
  {
    label: 'LinkedIn',
    href: '#',
    path: 'M20.4 20.5h-3.6v-5.6c0-1.3 0-3-1.8-3s-2.1 1.4-2.1 2.9v5.7H9.3V9h3.4v1.6c.5-.9 1.6-1.8 3.4-1.8 3.6 0 4.3 2.4 4.3 5.5v6.2ZM5.3 7.4a2.1 2.1 0 1 1 0-4.2 2.1 2.1 0 0 1 0 4.2ZM7.1 20.5H3.5V9h3.6v11.5Z',
  },
]

export default function Footer() {
  return (
    <footer className="relative overflow-hidden bg-linear-to-b from-background via-[#f7f1ea] to-[#ecdcfb] dark:via-[#1d1b22] dark:to-[#251a3d]">
      <div className="mx-auto max-w-7xl px-4 pt-16 pb-8">
        <div className="grid grid-cols-2 gap-8 border-t border-foreground/15 pt-6 sm:grid-cols-3 lg:grid-cols-5">
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <Logo />
            <p className="mt-4 text-xs tracking-wide text-muted-foreground uppercase">Our social</p>
            <div className="mt-3 flex gap-2">
              {socials.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  {...(social.href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}
                  className="grid size-8 place-items-center rounded-md bg-foreground/5 transition-colors hover:bg-[#c4a1f2] hover:text-black"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="size-3.5">
                    <path d={social.path} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {columns.map((column) => (
            <div key={column.title}>
              <p className="text-xs tracking-wide text-muted-foreground uppercase">{column.title}</p>
              <ul className="mt-3 space-y-1.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <NavLink href={link.href} className="text-sm font-medium transition-colors hover:text-[#9b6fe0]">
                      {link.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <p className="text-xs tracking-wide text-muted-foreground uppercase">Contact us</p>
            <a href="mailto:hello@trust0.ai" className="mt-3 block text-sm font-medium underline underline-offset-2">
              hello@trust0.ai
            </a>
          </div>
        </div>

        <div className="mt-12 flex border-t border-foreground/15 pt-6 flex-col gap-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} trust0. All rights reserved. ·{' '}
            <Link to="/terms" className="underline underline-offset-2 hover:text-foreground">
              Terms
            </Link>{' '}
            ·{' '}
            <Link to="/privacy" className="underline underline-offset-2 hover:text-foreground">
              Privacy
            </Link>
          </p>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Button size="sm" variant="outline" className="uppercase" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              Back to top
            </Button>
            <Button size="sm" asChild className="uppercase">
              <a href={site.studioUrl}>Get started</a>
            </Button>
          </div>
        </div>
      </div>
    </footer>
  )
}
