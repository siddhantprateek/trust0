import Faq from '@/components/custom/faq/faq.component'
import Features from '@/components/custom/features/features.component'
import Hero from '@/components/custom/hero/hero.component'
import Showcase from '@/components/custom/showcase/showcase.component'

export default function HomePage() {
  return (
    <main>
      <Hero />
      <Features />
      <Showcase />
      <Faq />
    </main>
  )
}
