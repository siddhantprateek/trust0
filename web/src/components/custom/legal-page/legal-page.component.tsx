import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { fadeUp, stagger } from '@/lib/motion'

export type LegalSection = {
  id: string
  title: string
  body: ReactNode
}

type LegalPageProps = {
  title: string
  lastRevised: string
  intro: ReactNode
  sections: LegalSection[]
}

export default function LegalPage({ title, lastRevised, intro, sections }: LegalPageProps) {
  return (
    <main className="mx-auto max-w-[88rem] px-4 pt-32 pb-24">
      <motion.header variants={stagger} initial="hidden" animate="visible" className="max-w-3xl">
        <motion.p variants={fadeUp} className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Legal
        </motion.p>
        <motion.h1 variants={fadeUp} className="mt-3 font-serif text-4xl font-medium tracking-tight sm:text-5xl">
          {title}
        </motion.h1>
        <motion.p variants={fadeUp} className="mt-4 text-sm text-muted-foreground">
          Last revised: {lastRevised}
        </motion.p>
      </motion.header>

      <div className="mt-12 grid gap-12 lg:grid-cols-[14rem_1fr]">
        <nav aria-label="On this page" className="hidden lg:block">
          <div className="sticky top-28">
            <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">On this page</p>
            <ol className="mt-3 space-y-2 text-sm">
              {sections.map((section, i) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {i + 1}. {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </nav>

        <article className="max-w-3xl leading-relaxed text-foreground/85 [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_h3]:mt-6 [&_h3]:font-semibold [&_h3]:text-foreground [&_li]:mt-2 [&_p]:mt-4 [&_strong]:font-semibold [&_strong]:text-foreground [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-5">
          <div className="[&>p:first-child]:mt-0">{intro}</div>

          {sections.map((section, i) => (
            <section key={section.id} id={section.id} className="mt-12 scroll-mt-28 border-t pt-10">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                {i + 1}. {section.title}
              </h2>
              {section.body}
            </section>
          ))}
        </article>
      </div>
    </main>
  )
}
