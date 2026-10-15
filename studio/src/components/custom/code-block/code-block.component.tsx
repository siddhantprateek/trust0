// Adapted from Pasta UI's Code Block (https://pastaui.com/docs/component/code-block):
// prism-react-renderer for highlighting, themed onto our own --syntax-* tokens (see index.css).
import { Check, Copy } from 'lucide-react'
import { Highlight, Prism, type PrismTheme } from 'prism-react-renderer'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// prism-react-renderer's bundled core Prism ships only a handful of grammars (markup, css, javascript, json, ...)
// and leaves out bash/shell, so `language="bash"` rendered unhighlighted. Register a small grammar ourselves
// rather than pulling in all of prismjs for one language.
if (!Prism.languages.bash) {
  Prism.languages.bash = {
    comment: /#.*/,
    string: {
      pattern: /(["'])(?:\\.|(?!\1)[^\\])*\1/,
      greedy: true,
    },
    variable: {
      pattern: /\$\{?\w+\}?/,
      alias: 'constant',
    },
    option: {
      pattern: /(^|\s)-{1,2}[\w-]+/,
      lookbehind: true,
      alias: 'property',
    },
    keyword: /\b(?:curl|echo|export|cd|ls|mkdir|rm|cat|grep|sudo|npm|bun|npx|git)\b/,
    punctuation: /[{}[\];(),.:\\]/,
  }
  Prism.languages.shell = Prism.languages.bash
}

const codeTheme: PrismTheme = {
  plain: {
    backgroundColor: 'transparent',
    color: 'var(--foreground)',
  },
  styles: [
    { types: ['comment', 'prolog', 'doctype', 'cdata'], style: { color: 'var(--syntax-comment)', fontStyle: 'italic' } },
    { types: ['keyword', 'atrule'], style: { color: 'var(--syntax-keyword)' } },
    { types: ['string', 'char', 'attr-value', 'inserted'], style: { color: 'var(--syntax-string)' } },
    { types: ['function', 'class-name'], style: { color: 'var(--syntax-function)' } },
    { types: ['number', 'boolean', 'constant'], style: { color: 'var(--syntax-number)' } },
    { types: ['tag', 'property', 'attr-name', 'selector', 'symbol', 'deleted'], style: { color: 'var(--syntax-property)' } },
    { types: ['punctuation', 'operator'], style: { color: 'var(--syntax-punctuation)' } },
  ],
}

type CodeBlockProps = {
  code: string
  language?: string
  filename?: string
  highlightLines?: number[]
  showLineNumbers?: boolean
  className?: string
}

export default function CodeBlock({
  code,
  language = 'text',
  filename,
  highlightLines = [],
  showLineNumbers = false,
  className,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false)
  const highlightedLines = new Set(highlightLines)
  const syntaxLanguage = language === 'shell' ? 'bash' : language

  async function copyCode() {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <figure
      data-slot="code-block"
      className={cn('overflow-hidden rounded-lg bg-card font-mono text-sm text-muted-foreground ring-1 ring-foreground/10', className)}
    >
      <figcaption className="flex h-9 items-center gap-2 border-b px-3">
        <span className="min-w-0 truncate text-xs">{filename ?? language}</span>
        <Button aria-label="Copy code" className="ml-auto" onClick={copyCode} size="icon-xs" type="button" variant="ghost">
          <span className="grid *:col-start-1 *:row-start-1 *:transition-[opacity,scale] *:duration-150 *:ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:*:transition-opacity">
            <Copy className={cn(copied && 'scale-75 opacity-0')} />
            <Check className={cn(!copied && 'scale-75 opacity-0')} />
          </span>
        </Button>
      </figcaption>
      <Highlight code={code.trim()} language={syntaxLanguage} theme={codeTheme}>
        {({ getLineProps, getTokenProps, style, tokens }) => (
          <pre className="overflow-x-auto p-3 text-xs leading-6" style={style}>
            <code>
              {tokens.map((line, lineIndex) => {
                const lineNumber = lineIndex + 1
                return (
                  <span
                    {...getLineProps({ line })}
                    className={cn('block min-w-max', highlightedLines.has(lineNumber) && 'bg-foreground/[0.045]')}
                    key={lineIndex}
                  >
                    {showLineNumbers && (
                      <span aria-hidden="true" className="mr-4 inline-block w-4 text-right text-muted-foreground/55 select-none">
                        {lineNumber}
                      </span>
                    )}
                    {line.map((token, tokenIndex) => (
                      <span {...getTokenProps({ token })} key={tokenIndex} />
                    ))}
                  </span>
                )
              })}
            </code>
          </pre>
        )}
      </Highlight>
    </figure>
  )
}
