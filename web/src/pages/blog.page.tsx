import { motion } from 'motion/react'
import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { formatDate, posts } from '@/lib/blog'
import { fadeUp, stagger } from '@/lib/motion'

export default function BlogPage() {
  useDocumentTitle('Research and engineering blog', {
    description: 'How we build, measure and ship the models behind trust0: benchmarks, research and engineering notes.',
    path: '/blog',
  })

  return (
    <main className="mx-auto max-w-5xl px-4 pt-32 pb-24">
      <motion.header variants={stagger} initial="hidden" animate="visible" className="max-w-2xl">
        <motion.p variants={fadeUp} className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Blog
        </motion.p>
        <motion.h1 variants={fadeUp} className="mt-3 font-serif text-4xl font-medium tracking-tight sm:text-5xl">
          Research and updates
        </motion.h1>
        <motion.p variants={fadeUp} className="mt-4 text-lg text-muted-foreground">
          How we build, measure and ship the models behind trust0.
        </motion.p>
      </motion.header>

      <motion.ul variants={stagger} initial="hidden" animate="visible" className="mt-14 divide-y border-y">
        {posts.map((post) => (
          <motion.li key={post.slug} variants={fadeUp}>
            <Link to={`/blog/${post.slug}`} className="group grid gap-3 py-8 sm:grid-cols-[10rem_1fr_auto] sm:gap-8">
              <div className="text-sm text-muted-foreground">
                <time dateTime={post.date}>{formatDate(post.date)}</time>
                <p className="mt-1 text-xs font-medium text-primary">{post.tag}</p>
              </div>
              <div>
                <h2 className="font-serif text-2xl font-medium tracking-tight transition-colors group-hover:text-primary">{post.title}</h2>
                <p className="mt-2 leading-relaxed text-muted-foreground">{post.description}</p>
                <p className="mt-3 text-xs text-muted-foreground">{post.readingMinutes} min read</p>
              </div>
              <ArrowUpRight className="hidden size-5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary sm:block" />
            </Link>
          </motion.li>
        ))}
      </motion.ul>
    </main>
  )
}
