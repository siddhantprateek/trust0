import { motion } from 'motion/react'
import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import GradientTile from '@/components/custom/gradient-tile/gradient-tile.component'
import { useCases } from '@/data/use-cases'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { fadeUp, stagger } from '@/lib/motion'

export default function UseCasesPage() {
  useDocumentTitle('Use cases', {
    description: 'How journalists, trust and safety teams, researchers and everyday sharers use trust0 to check content before it spreads.',
    path: '/use-cases',
  })

  return (
    <main className="mx-auto max-w-[88rem] px-4 pt-32 pb-24">
      <motion.header variants={stagger} initial="hidden" animate="visible" className="max-w-2xl">
        <motion.p variants={fadeUp} className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Use cases
        </motion.p>
        <motion.h1 variants={fadeUp} className="mt-3 font-serif text-4xl font-medium tracking-tight sm:text-5xl">
          Built for anyone who has to know what’s real.
        </motion.h1>
        <motion.p variants={fadeUp} className="mt-4 text-lg text-muted-foreground">
          From newsrooms and moderation queues to research labs and family group chats.
        </motion.p>
      </motion.header>

      <motion.div variants={stagger} initial="hidden" animate="visible" className="mt-14 grid gap-6 md:grid-cols-2">
        {useCases.map((useCase) => (
          <motion.div key={useCase.slug} variants={fadeUp}>
            <Link to={`/use-cases/${useCase.slug}`} className="group block">
              <motion.div whileHover={{ scale: 1.01 }} transition={{ type: 'spring', stiffness: 300, damping: 24 }}>
                <GradientTile tone={useCase.tone} className="aspect-video">
                  <span className="flex size-14 items-center justify-center rounded-2xl bg-white/15 text-white backdrop-blur-sm">
                    <useCase.icon className="size-7" strokeWidth={1.75} />
                  </span>
                </GradientTile>
              </motion.div>
              <div className="flex items-start justify-between gap-4 px-2 pt-5">
                <div>
                  <h2 className="text-xl font-medium tracking-tight">{useCase.label}</h2>
                  <p className="mt-1 text-muted-foreground">{useCase.blurb}</p>
                </div>
                <ArrowUpRight className="mt-1 size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground" />
              </div>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </main>
  )
}
