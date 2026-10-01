import type { Transition, Variants } from 'motion/react'

export const spring: Transition = { type: 'spring', stiffness: 260, damping: 26 }

export const ease: Transition = { duration: 0.3, ease: [0.22, 1, 0.36, 1] }

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: ease },
}

export const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
}

export const pageTransition: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: ease },
  exit: { opacity: 0, y: -8, transition: { ...ease, duration: 0.2 } },
}
