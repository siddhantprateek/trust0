import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import PageHeading from '@/components/custom/page-heading/page-heading.component'
import ReportsTable from '@/components/custom/reports-table/reports-table.component'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { sampleReports } from '@/data/sample-reports'
import type { Verdict } from '@/lib/types'

type Filter = 'all' | Verdict

const filters: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'likely-ai', label: 'AI-generated' },
  { value: 'edited', label: 'Edited' },
  { value: 'authentic', label: 'Authentic' },
]

export default function ReportsPage() {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const reports = useMemo(() => {
    const q = query.trim().toLowerCase()
    return sampleReports.filter(
      (report) =>
        (filter === 'all' || report.verdict === filter) &&
        (!q || report.title.toLowerCase().includes(q) || report.url.toLowerCase().includes(q)),
    )
  }, [query, filter])

  return (
    <div className="space-y-8">
      <PageHeading
        title="Reports"
        description="Every check you've run, newest first."
        actions={
          <Button asChild>
            <Link to="/checks/new">New check</Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={filter} onValueChange={(value) => setFilter(value as Filter)}>
          <TabsList>
            {filters.map((item) => (
              <TabsTrigger key={item.value} value={item.value}>
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative sm:w-72">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search reports"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <Card>
        <CardContent>
          <ReportsTable reports={reports} />
        </CardContent>
      </Card>
    </div>
  )
}
