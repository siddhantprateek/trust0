import { motion } from 'motion/react'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import GradientTile from '@/components/custom/gradient-tile/gradient-tile.component'
import { Button } from '@/components/ui/button'
import { site } from '@/config/site'
import { getUseCase, useCases } from '@/data/use-cases'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { fadeUp, stagger } from '@/lib/motion'
import NotFoundPage from './notfound.page'

const inView = { initial: 'hidden', whileInView: 'visible', viewport: { once: true, amount: 0.2 } } as const

export default function UseCasePage() {
  const { slug = '' } = useParams()
  const useCase = getUseCase(slug)
  useDocumentTitle(useCase?.label, useCase ? { description: useCase.blurb, path: `/use-cases/${useCase.slug}` } : { noindex: true })

  if (!useCase) return <NotFoundPage />
  const Icon = useCase.icon
  const others = useCases.filter((u) => u.slug !== useCase.slug)

  return (
    <main className="pt-28 pb-24">
      {/* Hero */}
      <section className="mx-auto grid max-w-[88rem] items-center gap-10 px-4 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        <motion.div variants={stagger} initial="hidden" animate="visible">
          <motion.div variants={fadeUp} className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link to="/use-cases" className="transition-colors hover:text-foreground">
              Use cases
            </Link>
            <span>/</span>
            <span className="text-foreground">{useCase.label}</span>
          </motion.div>
          <motion.h1 variants={fadeUp} className="mt-6 font-serif text-4xl font-medium tracking-tight text-balance sm:text-6xl">
            {useCase.title}
          </motion.h1>
          <motion.p variants={fadeUp} className="mt-6 max-w-xl text-lg leading-relaxed text-pretty text-muted-foreground">
            {useCase.intro}
          </motion.p>
          <motion.div variants={fadeUp} className="mt-8 flex flex-wrap gap-2">
            <Button size="lg" className="h-11 bg-foreground px-5 text-background hover:bg-foreground/85" asChild>
              <a href={site.studioUrl}>
                {useCase.cta}
                <ArrowRight data-icon="inline-end" />
              </a>
            </Button>
            <Button size="lg" variant="outline" className="h-11 px-5" asChild>
              <Link to="/#showcase">See a sample report</Link>
            </Button>
          </motion.div>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.15 }}>
          <GradientTile tone={useCase.tone} className="aspect-4/3">
            <div className="flex flex-col items-center gap-4 text-white">
              <span className="flex size-16 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
                <Icon className="size-8" strokeWidth={1.75} />
              </span>
              <span className="text-2xl font-medium">{useCase.label}</span>
            </div>
          </GradientTile>
        </motion.div>
      </section>

      {/* The problem */}
      <section className="mx-auto mt-28 max-w-[88rem] px-4">
        <motion.p variants={fadeUp} {...inView} className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          The problem
        </motion.p>
        <motion.div variants={stagger} {...inView} className="mt-6 grid gap-4 md:grid-cols-3">
          {useCase.problems.map((problem, i) => (
            <motion.article key={problem.title} variants={fadeUp} className="rounded-2xl border p-6">
              <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
              <h3 className="mt-6 text-lg font-medium tracking-tight">{problem.title}</h3>
              <p className="mt-3 leading-relaxed text-muted-foreground">{problem.body}</p>
            </motion.article>
          ))}
        </motion.div>
      </section>

      {/* How trust0 helps */}
      <section className="mx-auto mt-28 max-w-[88rem] px-4">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <motion.div variants={stagger} {...inView}>
            <motion.p variants={fadeUp} className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              How trust0 helps
            </motion.p>
            <motion.h2 variants={fadeUp} className="mt-4 text-3xl font-medium tracking-tight sm:text-4xl">
              Evidence, not just a score.
            </motion.h2>
            <motion.p variants={fadeUp} className="mt-4 max-w-md text-muted-foreground">
              Every verdict comes with the checks behind it and links to the sources, so you can see exactly why trust0
              reached it.
            </motion.p>
          </motion.div>
          <motion.div variants={stagger} {...inView} className="grid gap-x-8 gap-y-10 sm:grid-cols-2">
            {useCase.capabilities.map((cap) => (
              <motion.div key={cap.title} variants={fadeUp}>
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <cap.icon className="size-5" />
                </span>
                <h3 className="mt-4 font-medium">{cap.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{cap.body}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Worked example */}
      <section className="mx-auto mt-28 max-w-[88rem] px-4">
        <div className="rounded-3xl bg-muted/60 p-6 sm:p-12">
          <motion.div variants={stagger} {...inView}>
            <motion.p variants={fadeUp} className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              In practice
            </motion.p>
            <motion.h2 variants={fadeUp} className="mt-4 font-serif text-3xl font-medium tracking-tight sm:text-4xl">
              {useCase.scenario.title}
            </motion.h2>
          </motion.div>
          <motion.ol variants={stagger} {...inView} className="mt-10 grid gap-6 md:grid-cols-4 md:gap-4">
            {useCase.scenario.steps.map((step, i) => (
              <motion.li key={step.label} variants={fadeUp} className="relative">
                <div className="flex items-center gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground font-mono text-xs text-background">
                    {i + 1}
                  </span>
                  {i < useCase.scenario.steps.length - 1 && <span className="hidden h-px flex-1 bg-foreground/15 md:block" />}
                </div>
                <h3 className="mt-4 font-medium">{step.label}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground md:pr-4">{step.body}</p>
              </motion.li>
            ))}
          </motion.ol>
        </div>
      </section>

      {/* Where to use it */}
      <section className="mx-auto mt-28 max-w-[88rem] px-4">
        <motion.h2 variants={fadeUp} {...inView} className="text-3xl font-medium tracking-tight sm:text-4xl">
          Where you’ll use it
        </motion.h2>
        <motion.div variants={stagger} {...inView} className="mt-8 grid gap-4 md:grid-cols-2">
          {useCase.where.map((item) => (
            <motion.div key={item.title} variants={fadeUp} className="flex gap-4 rounded-2xl border p-6">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                <item.icon className="size-5" />
              </span>
              <div>
                <h3 className="font-medium">{item.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Other use cases */}
      <section className="mx-auto mt-28 max-w-[88rem] px-4">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-xl font-medium tracking-tight">Other use cases</h2>
          <Link to="/use-cases" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            View all
          </Link>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {others.map((other) => (
            <Link
              key={other.slug}
              to={`/use-cases/${other.slug}`}
              className="group flex items-start justify-between gap-4 rounded-2xl border p-6 transition-colors hover:bg-muted/50"
            >
              <div>
                <other.icon className="size-5 text-muted-foreground" />
                <p className="mt-4 font-medium">{other.label}</p>
                <p className="mt-1 text-sm text-muted-foreground">{other.blurb}</p>
              </div>
              <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground" />
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}
