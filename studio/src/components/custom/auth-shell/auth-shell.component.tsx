import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import Logo from '@/components/custom/logo/logo.component'

type AuthShellProps = {
  children: ReactNode
}

export default function AuthShell({ children }: AuthShellProps) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col p-6 md:p-10">
        <Logo />
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-1 items-center justify-center py-10"
        >
          {children}
        </motion.div>
      </div>

      <div className="relative hidden overflow-hidden bg-[radial-gradient(at_0%_100%,#6d2ff0_0%,transparent_50%),radial-gradient(at_80%_20%,#d13ee0_0%,transparent_55%),linear-gradient(135deg,#7e47ff,#3276e4)] lg:flex lg:flex-col lg:justify-end lg:p-12">
        <blockquote className="max-w-md text-white">
          <p className="text-3xl font-medium tracking-tight">
            Check what&rsquo;s real, trace where it came from, and catch the AI that&rsquo;s confidently wrong.
          </p>
          <footer className="mt-4 font-pixel text-sm text-white/75">trust0 Studio</footer>
        </blockquote>
      </div>
    </div>
  )
}
