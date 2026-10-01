import { motion } from 'motion/react'
import GradientTile, { type GradientTone } from '@/components/custom/gradient-tile/gradient-tile.component'
import { Button } from '@/components/ui/button'
import { fadeUp, stagger } from '@/lib/motion'

type Feature = {
  name: string
  tone: GradientTone
  title: string
  description: string
  primary: string
  secondary?: string
}

const features: Feature[] = [
  {
    name: 'Media Check',
    tone: 'sunset',
    title: 'Spot synthetic and edited media.',
    description:
      'Upload a photo or video, or paste a link. trust0 looks for generation artifacts, edits and re-encoding to tell you how it was likely made.',
    primary: 'Check media',
    secondary: 'How it works',
  },
  {
    name: 'Source Trace',
    tone: 'ocean',
    title: 'Follow content back to where it started.',
    description:
      'See the path a post took across accounts and platforms: who published it first, when, and how it changed along the way.',
    primary: 'Trace a link',
    secondary: 'See an example',
  },
  {
    name: 'Claim Watch',
    tone: 'orchid',
    title: 'Catch AI that’s confidently wrong.',
    description:
      'Run articles and AI-written answers through independent checks, so unsupported claims get flagged before they spread.',
    primary: 'Check a claim',
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
              <motion.div whileHover={{ scale: 1.015 }} transition={{ type: 'spring', stiffness: 300, damping: 24 }}>
                <GradientTile tone={feature.tone} className="aspect-3/2">
                  <span className="text-2xl font-medium text-white">{feature.name}</span>
                </GradientTile>
              </motion.div>
              <div className="flex flex-1 flex-col px-3 pt-6">
                <h3 className="max-w-xs text-xl font-medium tracking-tight">{feature.title}</h3>
                <p className="mt-4 text-muted-foreground">{feature.description}</p>
                <div className="mt-auto flex gap-2 pt-8">
                  <Button className="bg-foreground text-background hover:bg-foreground/85">{feature.primary}</Button>
                  {feature.secondary && <Button variant="outline">{feature.secondary}</Button>}
                </div>
              </div>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
