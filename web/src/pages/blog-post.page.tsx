import { motion } from 'motion/react'
import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import Markdown from '@/components/custom/markdown/markdown.component'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { formatDate, getPost, headings } from '@/lib/blog'
import { fadeUp, stagger } from '@/lib/motion'
import NotFoundPage from './notfound.page'

export default function BlogPostPage() {
  const { slug = '' } = useParams()
  const post = getPost(slug)

  useDocumentTitle(post?.title, post ? { description: post.description, path: `/blog/${post.slug}`, type: 'article' } : { noindex: true })

  if (!post) return <NotFoundPage />
  const toc = headings(post.body)

  return (
    <main className="mx-auto max-w-[84rem] px-4 pt-32 pb-24">
      {/* Three columns on wide screens: contents, article, and the margin its sidenotes float into */}
      <div className="xl:grid xl:grid-cols-[13rem_minmax(0,42rem)_19rem] xl:justify-center xl:gap-x-10">
        <aside className="hidden xl:block">
          <div className="sticky top-28">
            <Link to="/blog" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
              <ArrowLeft className="size-3.5" /> All posts
            </Link>
            <p className="mt-8 text-xs font-semibold tracking-wider text-muted-foreground uppercase">On this page</p>
            <ol className="mt-3 space-y-2 border-l text-sm">
              {toc.map((h) => (
                <li key={h.id}>
                  <a href={`#${h.id}`} className="-ml-px block border-l border-transparent pl-3 text-muted-foreground transition-colors hover:border-foreground hover:text-foreground">
                    {h.title}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </aside>

        <article className="mx-auto max-w-[42rem] xl:mx-0">
          <motion.header variants={stagger} initial="hidden" animate="visible">
            <motion.div variants={fadeUp} className="flex items-center gap-3 text-xs font-medium text-muted-foreground">
              <Link to="/blog" className="xl:hidden">
                Blog
              </Link>
              <span className="xl:hidden">/</span>
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-primary">{post.tag}</span>
              <time dateTime={post.date}>{formatDate(post.date)}</time>
              <span>·</span>
              <span>{post.readingMinutes} min read</span>
            </motion.div>
            <motion.h1 variants={fadeUp} className="mt-5 font-serif text-4xl font-medium tracking-tight text-balance sm:text-5xl">
              {post.title}
            </motion.h1>
            <motion.p variants={fadeUp} className="mt-5 text-lg leading-relaxed text-pretty text-muted-foreground">
              {post.description}
            </motion.p>
            <motion.p variants={fadeUp} className="mt-6 border-b pb-8 text-sm text-muted-foreground">
              By <span className="font-medium text-foreground">{post.author}</span>
            </motion.p>
          </motion.header>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25, duration: 0.4 }}>
            <Markdown className="mt-4">{post.body}</Markdown>
          </motion.div>
        </article>

        <div className="hidden xl:block" aria-hidden />
      </div>
    </main>
  )
}
