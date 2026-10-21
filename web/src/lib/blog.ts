// Blog posts are Markdown files in src/content/blog with a small front-matter block:
//
// ---
// title: Post title
// description: One sentence for the index and meta tags
// date: 2026-10-21
// author: Name
// tag: Research
// ---

export type PostMeta = {
  slug: string
  title: string
  description: string
  date: string
  author: string
  tag: string
  readingMinutes: number
}

export type Post = PostMeta & { body: string }

export type Heading = { id: string; title: string }

const files = import.meta.glob('../content/blog/*.md', { query: '?raw', import: 'default', eager: true }) as Record<
  string,
  string
>

function parse(path: string, raw: string): Post {
  const slug = path.split('/').pop()!.replace(/\.md$/, '')
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  const fields: Record<string, string> = {}
  for (const line of (match?.[1] ?? '').split(/\r?\n/)) {
    const i = line.indexOf(':')
    // Values may be quoted, as in title: "A: B"
    if (i > 0) fields[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^"(.*)"$/, '$1')
  }
  const body = match?.[2] ?? raw
  const words = body.replace(/```[\s\S]*?```/g, '').split(/\s+/).length
  return {
    slug,
    title: fields.title ?? slug,
    description: fields.description ?? '',
    date: fields.date ?? '',
    author: fields.author ?? 'trust0',
    tag: fields.tag ?? 'Blog',
    readingMinutes: Math.max(1, Math.round(words / 230)),
    body,
  }
}

export const posts: Post[] = Object.entries(files)
  .map(([path, raw]) => parse(path, raw))
  .sort((a, b) => b.date.localeCompare(a.date))

export function getPost(slug: string) {
  return posts.find((post) => post.slug === slug)
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

// Level-2 headings, for the "On this page" list
export function headings(body: string): Heading[] {
  return [...body.replace(/```[\s\S]*?```/g, '').matchAll(/^## (.+)$/gm)].map((m) => ({
    id: slugify(m[1]),
    title: m[1].trim(),
  }))
}

// Footnote definitions ("[^label]: text"), keyed by lower-cased label, so references can render as sidenotes
export function footnotes(body: string): Record<string, string> {
  const notes: Record<string, string> = {}
  for (const m of body.matchAll(/^\[\^([^\]]+)\]:\s*(.+)$/gm)) notes[m[1].toLowerCase()] = m[2].trim()
  return notes
}

export function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}
