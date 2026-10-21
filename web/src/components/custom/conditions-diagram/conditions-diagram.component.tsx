import { Fragment } from 'react'
import ChartFigure from '@/components/custom/chart-figure/chart-figure.component'

const HEIGHT = 230

const steps = [
  {
    id: 'original',
    label: 'Original',
    detail: 'As downloaded',
    scale: 1,
    block: 0,
    tip: 'The file as the dataset ships it: often a lossless PNG at full resolution.',
  },
  {
    id: 'social',
    label: 'Social',
    detail: '1080 px · JPEG q75',
    scale: 0.8,
    block: 7,
    tip: 'Longest side resized to 1,080 px and saved as JPEG at quality 75, close to what a platform does on upload.',
  },
  {
    id: 'repost',
    label: 'Repost',
    detail: '720 px · JPEG q60',
    scale: 0.62,
    block: 11,
    tip: 'The social copy shrunk again to 720 px and saved at quality 60, like a screenshot of a repost. Most fine detail is gone.',
  },
]

// The three ways every test image is scored: a stylised photo that loses size and detail at each step
export default function ConditionsDiagram() {
  return (
    <ChartFigure
      title="Every test image, three ways"
      caption="Recompressing every image the same way also removes a shortcut in public datasets, where real photos are often JPEGs and AI images PNGs: a detector can score well by spotting the file format instead of the generator."
    >
      {({ width, showTip, hideTip }) => {
        const slot = width / steps.length
        const maxTile = Math.min(150, slot - 44)
        const baseY = 30 + maxTile

        return (
          <svg width={width} height={HEIGHT} className="block overflow-visible" role="img" aria-label="Diagram of the original, social and repost image conditions">
            {steps.map((s, i) => {
              const size = maxTile * s.scale
              const cx = slot * i + slot / 2
              const x0 = cx - size / 2
              const y0 = baseY - size
              const blocks = s.block ? Math.ceil(size / s.block) : 0
              return (
                <Fragment key={s.id}>
                  {i > 0 && (
                    <g stroke="var(--muted-foreground)" strokeWidth={1.5} fill="none" opacity={0.6}>
                      <path d={`M${slot * i - 14},${baseY - maxTile / 3} h28`} strokeDasharray="3 3" />
                      <path d={`M${slot * i + 9},${baseY - maxTile / 3 - 5} l5,5 l-5,5`} />
                    </g>
                  )}
                  <g
                    tabIndex={0}
                    className="cursor-default outline-none [&:focus-visible_.frame]:stroke-foreground"
                    aria-label={`${s.label}: ${s.tip}`}
                    onPointerMove={(e) => showTip(e, <TipBody label={s.label} text={s.tip} />)}
                    onPointerLeave={hideTip}
                    onFocus={(e) => showTip(e, <TipBody label={s.label} text={s.tip} />)}
                    onBlur={hideTip}
                  >
                    <clipPath id={`tile-${s.id}`}>
                      <rect x={x0} y={y0} width={size} height={size} rx={10} />
                    </clipPath>
                    <g clipPath={`url(#tile-${s.id})`}>
                      <rect x={x0} y={y0} width={size} height={size} fill="var(--accent)" />
                      <circle cx={x0 + size * 0.72} cy={y0 + size * 0.28} r={size * 0.11} fill="var(--chart-3)" opacity={0.85} />
                      <path
                        d={`M${x0},${y0 + size * 0.8} L${x0 + size * 0.35},${y0 + size * 0.42} L${x0 + size * 0.55},${y0 + size * 0.62} L${x0 + size * 0.75},${y0 + size * 0.48} L${x0 + size},${y0 + size * 0.78} V${y0 + size} H${x0} Z`}
                        fill="var(--primary)"
                        opacity={0.75}
                      />
                      <rect x={x0} y={y0 + size * 0.82} width={size} height={size * 0.18} fill="var(--chart-1)" opacity={0.55} />
                      {Array.from({ length: blocks * blocks }, (_, k) => {
                        const bx = k % blocks
                        const by = Math.floor(k / blocks)
                        const shade = ((bx * 7 + by * 13) % 5) / 5
                        return (
                          <rect
                            key={k}
                            x={x0 + bx * s.block}
                            y={y0 + by * s.block}
                            width={s.block}
                            height={s.block}
                            fill={shade > 0.5 ? 'var(--background)' : 'var(--foreground)'}
                            opacity={0.02 + shade * (s.block > 8 ? 0.08 : 0.05)}
                          />
                        )
                      })}
                    </g>
                    <rect className="frame" x={x0} y={y0} width={size} height={size} rx={10} fill="none" stroke="var(--border)" strokeWidth={1.5} />
                    <text x={cx} y={baseY + 26} textAnchor="middle" fontSize={13} fontWeight={600} fill="var(--foreground)">
                      {s.label}
                    </text>
                    <text x={cx} y={baseY + 44} textAnchor="middle" fontSize={11} fill="var(--muted-foreground)" className="font-mono">
                      {s.detail}
                    </text>
                  </g>
                </Fragment>
              )
            })}
          </svg>
        )
      }}
    </ChartFigure>
  )
}

function TipBody({ label, text }: { label: string; text: string }) {
  return (
    <div className="max-w-56 space-y-1">
      <p className="font-semibold">{label}</p>
      <p className="leading-relaxed text-muted-foreground">{text}</p>
    </div>
  )
}
