import { AlertTriangle, ArrowLeft, CheckCircle2, ExternalLink, FileText, ImageIcon } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import ContentPreview from '@/components/custom/content-preview/content-preview.component'
import CoverageCard from '@/components/custom/coverage-card/coverage-card.component'
import Favicon from '@/components/custom/favicon/favicon.component'
import LeanBadge from '@/components/custom/lean-badge/lean-badge.component'
import LinkCard from '@/components/custom/link-card/link-card.component'
import JobProgress from '@/components/custom/job-progress/job-progress.component'
import PageHeading from '@/components/custom/page-heading/page-heading.component'
import StoppedCheck from '@/components/custom/stopped-check/stopped-check.component'
import ToolTimeline from '@/components/custom/tool-timeline/tool-timeline.component'
import VerdictBadge from '@/components/custom/verdict-badge/verdict-badge.component'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LinkHoverPreview } from '@/components/ui/link-hover-preview'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { useReport } from '@/hooks/use-reports'
import { api } from '@/lib/api'
import { domainFromUrl } from '@/lib/favicon'
import { formatDate, leanSide, sourceLabel } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { ClaimSource, Report, SpreadStep } from '@/lib/types'

const claimStyles = {
  supported: 'bg-chart-1/15 text-chart-1',
  refuted: 'bg-destructive/10 text-destructive',
  mixed: 'bg-chart-3/15 text-chart-3',
  unverifiable: 'bg-muted text-muted-foreground',
} as const

const evidenceLabels: Record<NonNullable<SpreadStep['evidence']>, string> = {
  'visual-match': 'Visual match',
  'reverse-search': 'Reverse image search',
  metadata: 'Platform metadata',
  research: 'Web research',
  submitted: 'Submitted',
}

export default function ReportDetailPage() {
  const { reportId } = useParams()
  const { data: report, loading, error } = useReport(reportId)

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (!report) {
    return (
      <div className="py-20 text-center">
        <h1 className="text-xl font-semibold">Report not found</h1>
        {error && <p className="mt-2 text-sm text-muted-foreground">{error}</p>}
        <Button variant="outline" asChild className="mt-4">
          <Link to="/reports">Back to reports</Link>
        </Button>
      </div>
    )
  }

  return <ReportView report={report} />
}

/** A full report. `backLink` is off for the public demo, which has no report list to go back to. */
export function ReportView({ report, backLink = true }: { report: Report; backLink?: boolean }) {
  const pending = report.status !== 'complete'
  const detectors = Object.entries(report.signals.aiDetectors)

  return (
    <div className="space-y-8">
      <PageHeading
        title={report.title}
        description={`${sourceLabel(report)} · checked ${formatDate(report.createdAt)}`}
        actions={<VerdictBadge verdict={report.verdict} status={report.status} />}
      />

      <ContentPreview report={report} />

      {report.status === 'analyzing' && report.steps.length > 0 ? (
        <JobProgress title="Checking this content" steps={report.steps} onCancel={() => cancelCheck(report.id)} />
      ) : report.status === 'cancelled' || (report.status === 'failed' && report.steps.length > 0) ? (
        <StoppedCheck report={report} />
      ) : pending ? (
        // Reports saved before stage progress existed
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {report.status === 'analyzing'
              ? 'This check is still running. Results will appear here when it finishes.'
              : (report.error ?? 'This check failed. Try submitting the content again.')}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardDescription>Trust score</CardDescription>
              <CardTitle className="font-pixel text-5xl">{report.trustScore}</CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={report.trustScore} />
              <p className="mt-3 text-xs text-muted-foreground">
                0 means almost certainly untrustworthy, 100 means strong evidence it&rsquo;s authentic.
              </p>
            </CardContent>
          </Card>

          {report.signals.aiGeneratedProbability !== null && (
            <Card>
              <CardHeader>
                <CardDescription>AI-generated probability</CardDescription>
                <CardTitle className="font-pixel text-5xl">
                  {Math.round(report.signals.aiGeneratedProbability * 100)}%
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Progress value={report.signals.aiGeneratedProbability * 100} />
                <p className="mt-3 text-xs text-muted-foreground">
                  {Object.entries(report.signals.aiDetectors)
                    .map(([name, score]) => `${name} ${(score * 100).toFixed(1)}%`)
                    .join(' · ')}
                </p>
              </CardContent>
            </Card>
          )}

          <Card className={report.signals.aiGeneratedProbability !== null ? 'lg:col-span-1' : 'lg:col-span-2'}>
            <CardHeader>
              <CardTitle>{report.sections.length > 0 ? 'Overall' : 'What we found'}</CardTitle>
              {report.summary && <CardDescription>{report.summary}</CardDescription>}
            </CardHeader>
            <CardContent className="space-y-4">
              {report.sections.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  This post has both text and {report.preview?.mediaType ?? 'media'}, so each is checked separately below.
                </p>
              )}
              {report.sections.length === 0 && (
                <ul className="space-y-3">
                  {report.checks.map((check) => (
                    <li key={check.label} className="flex items-start gap-2 text-sm">
                      {check.ok ? (
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-chart-1" />
                      ) : (
                        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-chart-3" />
                      )}
                      {check.label}
                    </li>
                  ))}
                </ul>
              )}
              {detectors.length > 0 && (
                <div className="flex flex-wrap gap-2 border-t pt-4 text-xs text-muted-foreground">
                  {detectors.map(([name, score]) => (
                    <Badge key={name} variant="outline" className="font-mono">
                      {name}: {(score * 100).toFixed(1)}% AI
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {report.sections.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 lg:col-span-3">
              {report.sections.map((section) => (
                <Card key={section.kind}>
                  <CardHeader>
                    <CardDescription className="flex items-center gap-1.5">
                      {section.kind === 'text' ? <FileText className="size-3.5" /> : <ImageIcon className="size-3.5" />}
                      {section.title}
                    </CardDescription>
                    <CardTitle className="flex flex-wrap items-center gap-3">
                      <span className="font-pixel text-4xl">{section.trustScore}</span>
                      <VerdictBadge verdict={section.verdict} status="complete" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Progress value={section.trustScore} />
                    {section.summary && <p className="text-sm text-muted-foreground">{section.summary}</p>}
                    <ul className="space-y-3">
                      {section.checks.map((check) => (
                        <li key={check.label} className="flex items-start gap-2 text-sm">
                          {check.ok ? (
                            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-chart-1" />
                          ) : (
                            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-chart-3" />
                          )}
                          {check.label}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {report.claims.length > 0 && (
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>Claims checked</CardTitle>
                <CardDescription>Verified against the web by the configured language model.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-5">
                  {report.claims.map((claim) => (
                    <li key={claim.text} className="space-y-1.5 text-sm">
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-medium">{claim.text}</p>
                        <Badge className={cn('shrink-0', claimStyles[claim.verdict])}>{claim.verdict}</Badge>
                      </div>
                      <p className="text-muted-foreground">{claim.explanation}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                        {claim.sources.map((source) => (
                          <span key={source.url} className="inline-flex items-center gap-1.5">
                            <Favicon domain={domainFromUrl(source.url)} size={12} />
                            <LinkHoverPreview
                              url={source.url}
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              {source.publisher ?? source.title ?? new URL(source.url).hostname}
                              <ExternalLink className="size-3" />
                            </LinkHoverPreview>
                            {source.lean && <LeanBadge lean={source.lean} />}
                          </span>
                        ))}
                      </div>
                      <SourceSpread sources={claim.sources} />
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {report.coverage && <CoverageCard coverage={report.coverage} />}

          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Spread path</CardTitle>
              <CardDescription>Where this content first appeared and how it changed as it spread.</CardDescription>
            </CardHeader>
            <CardContent>
              {report.spread.length === 0 ? (
                <p className="text-sm text-muted-foreground">No earlier appearances found.</p>
              ) : (
                <ol className="space-y-5">
                  {report.spread.map((step, i) => (
                    <li key={`${step.account}-${step.postedAt}-${i}`} className="relative pl-7 text-sm">
                      {/* Line and dot share one x position (left-1.5, centered), so they always line up */}
                      {i < report.spread.length - 1 && (
                        <span aria-hidden className="absolute top-1.5 -bottom-6.5 left-1.5 w-px -translate-x-1/2 bg-border" />
                      )}
                      <span
                        aria-hidden
                        className={cn(
                          'absolute top-1 left-1.5 size-3 -translate-x-1/2 rounded-full ring-4 ring-card',
                          step.isOrigin || i === 0 ? 'bg-primary' : 'bg-muted-foreground/40',
                        )}
                      />
                      <p className="flex flex-wrap items-center gap-x-1.5">
                        {step.url && <Favicon domain={domainFromUrl(step.url)} size={14} />}
                        <span className="font-medium">{step.account}</span>
                        <span className="text-muted-foreground">
                          on {step.platform} · {step.postedAt}
                        </span>
                        {step.isOrigin && <Badge className="bg-primary/10 text-primary">Origin</Badge>}
                      </p>
                      <p className="mt-0.5 text-muted-foreground">{step.note}</p>
                      {step.evidence && step.evidence !== 'submitted' && (
                        <Badge variant="outline" className="mt-1">
                          {evidenceLabels[step.evidence]}
                        </Badge>
                      )}
                      {step.url && <LinkCard url={step.url} className="mt-2 max-w-xl" />}
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {report.status === 'complete' && report.steps.length > 0 && <ToolTimeline steps={report.steps} defaultOpen={false} />}

      {backLink && (
        <Button variant="outline" asChild>
          <Link to="/reports">
            <ArrowLeft data-icon="inline-start" /> All reports
          </Link>
        </Button>
      )}
    </div>
  )
}

async function cancelCheck(reportId: string) {
  try {
    await api.cancelReport(reportId)
  } catch (err) {
    toast.error('Could not stop the check', { description: err instanceof Error ? err.message : String(err) })
    throw err
  }
}

/** Which sides of the spectrum the sources behind a claim come from: a claim confirmed across sides is sturdier. */
function SourceSpread({ sources }: { sources: ClaimSource[] }) {
  const sides = (['left', 'center', 'right'] as const).filter((side) => sources.some((s) => leanSide(s.lean) === side))
  if (sides.length === 0) return null
  const names = { left: 'Left', center: 'Center', right: 'Right' }
  return (
    <p className="text-xs text-muted-foreground">
      {sides.length === 3
        ? 'Sources span Left, Center and Right outlets.'
        : `Sources come from ${sides.map((side) => names[side]).join(' and ')} outlets${sides.length === 1 ? ' only' : ''}.`}
    </p>
  )
}
