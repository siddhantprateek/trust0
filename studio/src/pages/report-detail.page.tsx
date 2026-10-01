import { AlertTriangle, ArrowLeft, CheckCircle2, Link2 } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import PageHeading from '@/components/custom/page-heading/page-heading.component'
import VerdictBadge from '@/components/custom/verdict-badge/verdict-badge.component'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { findReport } from '@/data/sample-reports'
import { formatDate, sourceLabels } from '@/lib/format'
import { cn } from '@/lib/utils'

export default function ReportDetailPage() {
  const { reportId } = useParams()
  const report = findReport(reportId)

  if (!report) {
    return (
      <div className="py-20 text-center">
        <h1 className="text-xl font-semibold">Report not found</h1>
        <Button variant="outline" asChild className="mt-4">
          <Link to="/reports">Back to reports</Link>
        </Button>
      </div>
    )
  }

  const pending = report.status !== 'complete'

  return (
    <div className="space-y-8">
      <PageHeading
        title={report.title}
        description={`${sourceLabels[report.source]} · checked ${formatDate(report.createdAt)}`}
        actions={<VerdictBadge verdict={report.verdict} status={report.status} />}
      />

      <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 font-mono text-xs text-muted-foreground">
        <Link2 className="size-3.5 shrink-0" />
        <span className="truncate">{report.url}</span>
      </div>

      {pending ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {report.status === 'analyzing'
              ? 'This check is still running. Results will appear here when it finishes.'
              : 'This check failed. Try submitting the content again.'}
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

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>What we found</CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>

          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Spread path</CardTitle>
              <CardDescription>Where this content first appeared and how it changed as it spread.</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="relative space-y-5 border-l pl-6">
                {report.spread.map((step, i) => (
                  <li key={`${step.account}-${step.postedAt}`} className="relative text-sm">
                    <span
                      className={cn(
                        'absolute top-1 -left-[1.95rem] size-3 rounded-full ring-4 ring-card',
                        i === 0 ? 'bg-primary' : 'bg-muted-foreground/40',
                      )}
                    />
                    <p>
                      <span className="font-medium">{step.account}</span>{' '}
                      <span className="text-muted-foreground">
                        on {step.platform} · {step.postedAt}
                      </span>
                    </p>
                    <p className="mt-0.5 text-muted-foreground">{step.note}</p>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      )}

      <Button variant="outline" asChild>
        <Link to="/reports">
          <ArrowLeft data-icon="inline-start" /> All reports
        </Link>
      </Button>
    </div>
  )
}
