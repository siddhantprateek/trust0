import type { ComponentProps } from 'react'
import { Link } from 'react-router-dom'

// Internal paths (including "/#section" anchors) route client-side, so from another page they go home
// first and then scroll to the section. Anything else is a plain link.
export default function NavLink({ href, ...props }: ComponentProps<'a'> & { href: string }) {
  if (/^(https?:|mailto:)/.test(href) || href === '#') return <a href={href} {...props} />
  return <Link to={href} {...props} />
}
