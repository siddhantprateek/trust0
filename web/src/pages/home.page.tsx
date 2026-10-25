import Benchmark from '@/components/custom/benchmark/benchmark.component'
import BlogPreview from '@/components/custom/blog-preview/blog-preview.component'
import Faq from '@/components/custom/faq/faq.component'
import Features from '@/components/custom/features/features.component'
import Hero from '@/components/custom/hero/hero.component'
import Showcase from '@/components/custom/showcase/showcase.component'
import { useDocumentTitle } from '@/hooks/use-document-title'

export default function HomePage() {
  useDocumentTitle(undefined, { path: '' })
  return (
    <main>
      <Hero />
      <Features />
      <Showcase />
      <Benchmark />
      <BlogPreview />
      <Faq />
    </main>
  )
}
