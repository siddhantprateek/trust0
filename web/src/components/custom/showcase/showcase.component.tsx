import { motion } from 'motion/react'
import { AlertTriangle, CheckCircle2, Link2 } from 'lucide-react'
import GradientTile from '@/components/custom/gradient-tile/gradient-tile.component'
import { Button } from '@/components/ui/button'
import { ease, fadeUp, stagger } from '@/lib/motion'
import { cn } from '@/lib/utils'

const timeline = [
  { account: '@originalaccount', platform: 'Instagram', when: 'Mar 2, 09:14', note: 'Earliest known upload' },
  { account: '@viralclips', platform: 'X', when: 'Mar 2, 11:40', note: 'Cropped, caption changed' },
  { account: '@dailynewsfeed', platform: 'TikTok', when: 'Mar 3, 07:02', note: 'Re-encoded, audio added' },
]

const checks = [
  { ok: false, label: 'Generation artifacts found in 14 of 16 frames' },
  { ok: false, label: 'Caption claim not supported by any cited source' },
  { ok: true, label: 'No edits after first upload' },
]

function SampleReport() {
  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      className="grid gap-6 rounded-xl bg-card p-5 sm:p-8 lg:grid-cols-[0.9fr_1.1fr]"
    >
      <motion.div variants={fadeUp} className="flex flex-col gap-4">
        <GradientTile tone="ocean" className="aspect-video lg:aspect-auto lg:flex-1">
          <span className="rounded-md bg-black/35 px-3 py-1 font-mono text-xs text-white backdrop-blur">
            reel_C9x.mp4
          </span>
        </GradientTile>
        <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 font-mono text-xs text-muted-foreground">
          <Link2 className="size-3.5 shrink-0" />
          <span className="truncate">instagram.com/reel/C9x…</span>
        </div>
      </motion.div>

      <div className="flex flex-col gap-6">
        <motion.div variants={fadeUp} className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Verdict</p>
            <p className="mt-1 font-serif text-3xl font-medium">Likely AI-generated</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-3xl font-medium text-destructive">18</p>
            <p className="text-xs text-muted-foreground">trust score / 100</p>
          </div>
        </motion.div>

        <motion.ul variants={fadeUp} className="space-y-2">
          {checks.map((check) => (
            <li key={check.label} className="flex items-start gap-2 text-sm">
              {check.ok ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-chart-1" />
              ) : (
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-chart-3" />
              )}
              {check.label}
            </li>
          ))}
        </motion.ul>

        <motion.div variants={fadeUp}>
          <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Spread path</p>
          <ol className="relative mt-3 space-y-4 border-l pl-5">
            {timeline.map((step, i) => (
              <motion.li
                key={step.account}
                initial={{ opacity: 0, x: -8 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ ...ease, delay: 0.3 + i * 0.15 }}
                className="relative text-sm"
              >
                <span
                  className={cn(
                    'absolute top-1.5 -left-[1.6rem] size-2.5 rounded-full ring-4 ring-card',
                    i === 0 ? 'bg-primary' : 'bg-muted-foreground/50',
                  )}
                />
                <p>
                  <span className="font-medium">{step.account}</span>{' '}
                  <span className="text-muted-foreground">
                    on {step.platform} · {step.when}
                  </span>
                </p>
                <p className="text-muted-foreground">{step.note}</p>
              </motion.li>
            ))}
          </ol>
        </motion.div>
      </div>
    </motion.div>
  )
}

export default function Showcase() {
  return (
    <section id="showcase" className="scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4">
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.6 }}
          className="mx-auto flex max-w-lg flex-col items-center text-center"
        >
          <motion.span
            variants={fadeUp}
            className="rounded-md bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary"
          >
            New
          </motion.span>
          <motion.h2 variants={fadeUp} className="mt-3 text-3xl font-medium tracking-tight">
            Introducing trust0 reports
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-3 text-muted-foreground">
            One shareable page per link: where it came from, how it was likely made, and a plain-language verdict you
            can send to anyone who forwarded it to you.
          </motion.p>
          <motion.div variants={fadeUp} className="mt-5">
            <Button className="bg-foreground text-background hover:bg-foreground/85">See a sample report</Button>
          </motion.div>
        </motion.div>

        <div className="grain mt-12 rounded-2xl bg-muted p-3 sm:p-10">
          <div className="relative z-2">
            <SampleReport />
          </div>
        </div>
      </div>
    </section>
  )
}
