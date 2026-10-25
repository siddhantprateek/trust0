import { useEffect, useRef } from 'react'
import kernelSource from '../../../../hairline/kernel.js?raw'
import checkpointSource from '../../../../hairline/checkpoint.js?raw'
import envelopesSource from '../../../../hairline/envelopes.js?raw'
import layersSource from '../../../../hairline/layers.js?raw'
import { cn } from '@/lib/utils'

/**
 * A Hairline figure (web/hairline/*.js) mounted in place. The figures are plain scripts written for
 * the Hairline bench, so each is evaluated here with the kernel's HL and a hairline() that hands back
 * its declaration, then mounted the way the bench mounts it. What the figure writes to its read-out
 * shows in the stage's top-right corner.
 */

const sources = { layers: layersSource, envelopes: envelopesSource, checkpoint: checkpointSource }
export type HairlineName = keyof typeof sources

type Read = { textContent: string }
type Handle = { set: (value: number) => void; destroy: () => void }
type Figure = {
  means: string
  range: [number, number, number]
  mount: (host: { stage: HTMLElement; svg: SVGSVGElement; read: Read }, value: number) => Handle
}
type Kernel = {
  inject: (root: Document) => void
  mk: (tag: string, attrs: Record<string, string>, parent: Element) => SVGSVGElement
}

let kernel: Kernel | undefined
const figures = new Map<HairlineName, Figure>()

function load(name: HairlineName) {
  kernel ??= new Function(`${kernelSource}\nreturn HL;`)() as Kernel
  if (!figures.has(name)) new Function('HL', 'hairline', sources[name])(kernel, (f: Figure) => figures.set(name, f))
  return { HL: kernel, figure: figures.get(name)! }
}

export default function HairlineFigure({ name, className }: { name: HairlineName; className?: string }) {
  const stageRef = useRef<HTMLDivElement>(null)
  const readRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const { HL, figure } = load(name)
    HL.inject(document)
    stage.setAttribute('aria-label', figure.means)
    const svg = HL.mk('svg', { viewBox: '0 0 400 320', 'aria-hidden': 'true' }, stage)
    let text = ''
    const read: Read = {
      get textContent() {
        return text
      },
      set textContent(value) {
        text = value
        if (readRef.current) readRef.current.textContent = value === 'rest' ? '' : value
      },
    }
    const handle = figure.mount({ stage, svg, read }, figure.range[1])
    return () => {
      handle.destroy()
      svg.remove()
    }
  }, [name])

  return (
    <div className={cn('relative flex items-center justify-center', className)}>
      <span
        ref={readRef}
        className="pointer-events-none absolute top-3 right-4 z-1 font-mono text-xs text-muted-foreground"
      />
      <div ref={stageRef} data-hairline={name} role="img" className="h-full" />
    </div>
  )
}
