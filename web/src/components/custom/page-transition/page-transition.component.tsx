import { AnimatePresence, motion } from 'motion/react'
import { useLocation, useOutlet } from 'react-router-dom'
import { pageTransition } from '@/lib/motion'

// Freezes the outgoing route's element so it can animate out before the next one mounts
export default function PageTransition() {
  const location = useLocation()
  const outlet = useOutlet()

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        variants={pageTransition}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        {outlet}
      </motion.div>
    </AnimatePresence>
  )
}
