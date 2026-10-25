import { motion } from 'motion/react'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import researchCover from '@/assets/blog-research.webp'
import engineeringCover from '@/assets/blog-engineering.webp'
import { formatDate, posts } from '@/lib/blog'
import { fadeUp, stagger } from '@/lib/motion'

// A landscape photo per kind of post
const covers: Record<string, string> = { Research: researchCover, Engineering: engineeringCover }

// The latest research and engineering posts, newest first
export default function BlogPreview() {
  return (
    <section id="blog" className="scroll-mt-20 pb-20 sm:pb-28">
      <div className="mx-auto max-w-[88rem] px-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.6 }}
            className="max-w-2xl"
          >
            <motion.p variants={fadeUp} className="mb-4 flex items-center gap-2 text-xs font-semibold tracking-wider uppercase">
              <span className="size-2 bg-primary" /> Research &amp; Engineering
            </motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl font-medium tracking-tight sm:text-4xl">
              How we build, measure
              <br />
              and ship trust0.
            </motion.h2>
          </motion.div>
          <Link to="/blog" className="group inline-flex min-h-10 items-center gap-1.5 text-sm font-medium transition-colors hover:text-primary">
            All posts
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <motion.ul
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="mt-10 grid gap-8 md:grid-cols-2 md:gap-4"
        >
          {posts.map((post) => (
            <motion.li key={post.slug} variants={fadeUp}>
              <Link
                to={`/blog/${post.slug}`}
                className="group relative flex min-h-[26rem] items-end overflow-hidden rounded-2xl bg-muted p-3 sm:min-h-[30rem]"
              >
                <img
                  src={covers[post.tag] ?? researchCover}
                  alt=""
                  width={1200}
                  height={800}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <span className="absolute top-4 left-4 rounded-md bg-white/85 px-2 py-0.5 text-xs font-semibold text-neutral-900 backdrop-blur-sm">
                  {post.tag}
                </span>
                <div className="relative w-full rounded-xl bg-background/90 p-5 backdrop-blur-md sm:p-6">
                  <p className="text-xs text-muted-foreground">
                    <time dateTime={post.date}>{formatDate(post.date)}</time> · {post.readingMinutes} min read
                  </p>
                  <h3 className="mt-2 flex items-start justify-between gap-3 font-serif text-2xl font-medium tracking-tight transition-colors group-hover:text-primary">
                    {post.title}
                    <ArrowUpRight className="mt-1.5 size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
                  </h3>
                  <p className="mt-2 line-clamp-2 leading-relaxed text-muted-foreground">{post.description}</p>
                </div>
              </Link>
            </motion.li>
          ))}
        </motion.ul>
      </div>
    </section>
  )
}
