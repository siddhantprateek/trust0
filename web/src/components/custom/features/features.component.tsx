import { motion } from 'motion/react'
import HairlineFigure, { type HairlineName } from '@/components/custom/hairline-figure/hairline-figure.component'
import { fadeUp, stagger } from '@/lib/motion'

type Feature = {
  name: string
  figure: HairlineName
  title: string
  description: string
}

const features: Feature[] = [
  {
    name: 'Media Check',
    figure: 'layers',
    title: 'Spot synthetic and edited media.',
    description:
      'Upload a photo or video, or paste a link. trust0 looks for generation artifacts, edits and re-encoding to tell you how it was likely made.',
  },
  {
    name: 'Source Trace',
    figure: 'envelopes',
    title: 'Follow content back to where it started.',
    description:
      'See the path a post took across accounts and platforms: who published it first, when, and how it changed along the way.',
  },
  {
    name: 'Claim Watch',
    figure: 'checkpoint',
    title: 'Catch AI that’s confidently wrong.',
    description:
      'Run articles and AI-written answers through independent checks, so unsupported claims get flagged before they spread.',
  },
]

export default function Features() {
  return (
    <section id="features" className="scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto max-w-[88rem] px-4">
        <motion.h2
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.6 }}
          className="text-3xl font-medium tracking-tight sm:text-4xl"
        >
          One platform.
          <br />
          Three ways to verify.
        </motion.h2>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="mt-12 grid gap-8 md:grid-cols-3 md:gap-4"
        >
          {features.map((feature) => (
            <motion.article key={feature.name} variants={fadeUp} className="flex flex-col">
              <div className="relative">
                <span className="pointer-events-none absolute top-3 left-4 z-1 text-sm font-medium">{feature.name}</span>
                <HairlineFigure name={feature.figure} className="aspect-3/2 rounded-xl bg-muted/60" />
              </div>
              <div className="flex flex-1 flex-col px-3 pt-6">
                <h3 className="max-w-xs text-xl font-medium tracking-tight">{feature.title}</h3>
                <p className="mt-4 text-muted-foreground">{feature.description}</p>
              </div>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
