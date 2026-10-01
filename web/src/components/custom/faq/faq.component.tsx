import { motion } from 'motion/react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { fadeUp } from '@/lib/motion'

const faqs = [
  {
    q: 'What is trust0?',
    a: 'trust0 checks whether a piece of content can be trusted. Give it a video, photo, social post or article and it reports where the content came from, how it was likely made, and whether the claims around it hold up.',
  },
  {
    q: 'What can I submit?',
    a: 'Uploaded photos and videos, plus links from Instagram, X, YouTube, TikTok, Reddit and news sites.',
  },
  {
    q: 'How does trust0 tell if something is AI-generated?',
    a: 'It looks for signals that generation models and editing tools leave behind, and combines them into a likelihood score. It shows you the evidence behind that score rather than a bare yes or no.',
  },
  {
    q: 'How does source tracing work?',
    a: 'trust0 follows reposts and copies of the same content across accounts and platforms to find the earliest known upload, then shows the path it took and what changed at each step.',
  },
  {
    q: 'Can trust0 be wrong?',
    a: 'Yes. Detection is probabilistic, and every report shows its confidence and evidence so you can judge for yourself. Treat a verdict as a strong signal, not a final ruling.',
  },
]

export default function Faq() {
  return (
    <section id="faq" className="scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 md:grid-cols-[1fr_2fr]">
        <motion.h2
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="text-3xl font-medium tracking-tight"
        >
          Frequently asked
          <br />
          questions
        </motion.h2>

        <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <Accordion type="single" collapsible defaultValue="item-0" className="border-y">
            {faqs.map((faq, i) => (
              <AccordionItem key={faq.q} value={`item-${i}`}>
                <AccordionTrigger className="py-5 text-base hover:no-underline">{faq.q}</AccordionTrigger>
                <AccordionContent className="pb-5 text-muted-foreground">{faq.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  )
}
