// Writes public/sitemap.xml from the pages the router serves, the blog posts and the use cases.
// Run before every build (see the "build" script). Set VITE_SITE_URL to change the origin.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const origin = (process.env.VITE_SITE_URL ?? 'https://trytrust0.online').replace(/\/$/, '')

const today = new Date().toISOString().slice(0, 10)
const urls = [
  { path: '/', lastmod: today, priority: '1.0' },
  { path: '/blog', lastmod: today, priority: '0.8' },
  { path: '/use-cases', lastmod: today, priority: '0.8' },
  { path: '/support', priority: '0.4' },
  { path: '/terms', priority: '0.3' },
  { path: '/privacy', priority: '0.3' },
]

const blogDir = `${root}src/content/blog/`
for (const file of readdirSync(blogDir).filter((f) => f.endsWith('.md'))) {
  const date = /^date:\s*(\S+)/m.exec(readFileSync(blogDir + file, 'utf8'))?.[1]
  urls.push({ path: `/blog/${file.replace(/\.md$/, '')}`, lastmod: date, priority: '0.7' })
}

const slugs = [...readFileSync(`${root}src/data/use-cases.ts`, 'utf8').matchAll(/^\s*slug:\s*'([^']+)'/gm)].map((m) => m[1])
for (const slug of slugs) urls.push({ path: `/use-cases/${slug}`, priority: '0.6' })

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map((u) => `  <url><loc>${origin}${u.path === '/' ? '/' : u.path}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}<priority>${u.priority}</priority></url>`)
  .join('\n')}
</urlset>
`
writeFileSync(`${root}public/sitemap.xml`, xml)
console.log(`sitemap: ${urls.length} urls`)
