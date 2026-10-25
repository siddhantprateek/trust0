import { useNavigate } from 'react-router-dom'
import TrustScore from '@/components/custom/trust-score/trust-score.component'
import VerdictBadge from '@/components/custom/verdict-badge/verdict-badge.component'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate, sourceLabel } from '@/lib/format'
import type { Report } from '@/lib/types'

type ReportsTableProps = {
  reports: Report[]
}

export default function ReportsTable({ reports }: ReportsTableProps) {
  const navigate = useNavigate()

  if (reports.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No reports match.</p>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Content</TableHead>
          <TableHead>Source</TableHead>
          <TableHead>Verdict</TableHead>
          <TableHead>Trust score</TableHead>
          <TableHead className="text-right">Checked</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {reports.map((report) => (
          <TableRow
            key={report.id}
            onClick={() => navigate(`/reports/${report.id}`)}
            className="cursor-pointer"
          >
            <TableCell>
              <p className="max-w-md truncate font-medium" title={report.title}>
                {report.title}
              </p>
              <p className="max-w-64 truncate font-mono text-xs text-muted-foreground">{report.url}</p>
            </TableCell>
            <TableCell className="text-muted-foreground">{sourceLabel(report)}</TableCell>
            <TableCell>
              <VerdictBadge verdict={report.verdict} status={report.status} />
            </TableCell>
            <TableCell>
              {report.status === 'complete' ? (
                <TrustScore score={report.trustScore} />
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              )}
            </TableCell>
            <TableCell className="text-right text-muted-foreground">{formatDate(report.createdAt)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
