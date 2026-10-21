import type { ComponentProps, ReactNode } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import BlogEmbed from '@/components/custom/blog-embed/blog-embed.component'
import { footnotes, slugify } from '@/lib/blog'
import { cn } from '@/lib/utils'

type MarkdownProps = {
  children: string
  className?: string
}

const FOOTNOTE_HREF = '#user-content-fn-'

function text(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(text).join('')
  if (node && typeof node === 'object' && 'props' in node) return text((node.props as { children?: ReactNode }).children)
  return ''
}

function ExternalLink({ href, children, ...props }: ComponentProps<'a'>) {
  const external = href?.startsWith('http')
  return (
    <a
      href={href}
      {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
      {...props}
      className={cn('text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary', props.className)}
    >
      {children}
    </a>
  )
}

// Footnote text rendered inline, for the margin
const noteComponents: Components = {
  p: ({ children }) => <>{children}</>,
  a: ({ href, children }) => <ExternalLink href={href}>{children}</ExternalLink>,
  em: ({ children }) => <em className="italic">{children}</em>,
}

// Markdown with two additions:
// - ```chart blocks render an interactive figure (see blog-embed)
// - footnotes ([^label]) render as numbered sidenotes in the right margin on wide screens,
//   and as a References list at the end on narrower ones
export default function Markdown({ children, className }: MarkdownProps) {
  const notes = footnotes(children)

  const components: Components = {
    h2: ({ id, className: cls, children: content }) =>
      id === 'footnote-label' ? (
        <h2 id={id} className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
          References
        </h2>
      ) : (
        <h2
          id={id ?? slugify(text(content))}
          className={cn('mt-14 scroll-mt-28 font-serif text-2xl font-medium tracking-tight text-foreground sm:text-3xl', cls)}
        >
          {content}
        </h2>
      ),
    h3: ({ children: content }) => (
      <h3 id={slugify(text(content))} className="mt-10 scroll-mt-28 text-lg font-semibold tracking-tight text-foreground">
        {content}
      </h3>
    ),
    p: ({ children: content }) => <p className="mt-5 leading-[1.8]">{content}</p>,
    ul: ({ children: content }) => <ul className="mt-5 list-disc space-y-2 pl-5 marker:text-muted-foreground">{content}</ul>,
    ol: ({ children: content }) => <ol className="mt-5 list-decimal space-y-2 pl-5 marker:text-muted-foreground">{content}</ol>,
    li: ({ children: content }) => <li className="pl-1 leading-[1.75]">{content}</li>,
    strong: ({ children: content }) => <strong className="font-semibold text-foreground">{content}</strong>,
    hr: () => <hr className="my-12" />,
    blockquote: ({ children: content }) => (
      <blockquote className="mt-6 rounded-xl border-l-2 border-primary bg-primary/5 px-5 py-1 text-foreground/90 [&>p]:mt-3 [&>p:last-child]:mb-3">
        {content}
      </blockquote>
    ),
    code: ({ children: content }) => (
      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground">{content}</code>
    ),
    pre: ({ node }) => {
      const code = node?.children[0]
      const classes = code && 'properties' in code ? (code.properties.className as string[] | undefined) : undefined
      const source = code && 'children' in code ? code.children.map((c) => ('value' in c ? c.value : '')).join('') : ''
      if (classes?.includes('language-chart')) return <BlogEmbed spec={source.trim()} />
      return (
        <pre className="mt-6 overflow-x-auto rounded-xl border bg-muted/50 p-4 font-mono text-[13px] leading-relaxed text-foreground [&_code]:bg-transparent [&_code]:p-0">
          {source}
        </pre>
      )
    },
    table: ({ children: content }) => (
      <div className="mt-6 overflow-x-auto rounded-xl border">
        <table className="w-full border-collapse text-sm tabular-nums">{content}</table>
      </div>
    ),
    thead: ({ children: content }) => <thead className="bg-muted/60 text-left text-foreground">{content}</thead>,
    th: ({ children: content, style }) => (
      <th style={style} className="px-3 py-2.5 text-xs font-semibold tracking-wide whitespace-nowrap uppercase">
        {content}
      </th>
    ),
    td: ({ children: content, style }) => (
      <td style={style} className="border-t px-3 py-2.5 first:whitespace-nowrap">
        {content}
      </td>
    ),
    section: ({ children: content, ...props }) =>
      'data-footnotes' in props ? (
        <section className="mt-16 border-t pt-8 text-sm xl:hidden [&_ol]:mt-4 [&_p]:mt-0 [&_p]:leading-relaxed">{content}</section>
      ) : (
        <section>{content}</section>
      ),
    a: ({ href, id, children: content }) => {
      if (!href?.startsWith(FOOTNOTE_HREF)) return <ExternalLink href={href} id={id}>{content}</ExternalLink>
      const note = notes[decodeURIComponent(href.slice(FOOTNOTE_HREF.length))]
      return (
        <>
          <a
            href={href}
            id={id}
            aria-describedby="footnote-label"
            className="ml-0.5 font-sans text-[0.7rem] font-semibold text-primary no-underline xl:pointer-events-none"
          >
            {content}
          </a>
          {note && (
            <span
              role="note"
              className="hidden align-baseline font-sans text-[0.8rem] leading-relaxed font-normal text-muted-foreground xl:float-right xl:clear-right xl:-mr-[19rem] xl:mb-4 xl:block xl:w-[16rem]"
            >
              <span className="mr-1 font-semibold text-primary">{content}</span>
              <ReactMarkdown components={noteComponents}>{note}</ReactMarkdown>
            </span>
          )}
        </>
      )
    },
  }

  return (
    <div className={cn('text-[1.0625rem] text-foreground/85', className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  )
}
