import { useState, type FormEvent } from 'react'
import { useUser } from '@clerk/react'
import { motion } from 'motion/react'
import { ArrowRight, Bot, FileSearch, GitBranch, Gauge } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import PageHeading from '@/components/custom/page-heading/page-heading.component'
import ReportsTable from '@/components/custom/reports-table/reports-table.component'
import StatCard from '@/components/custom/stat-card/stat-card.component'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { sampleReports } from '@/data/sample-reports'

const complete = sampleReports.filter((report) => report.status === 'complete')
const averageScore = Math.round(complete.reduce((sum, report) => sum + report.trustScore, 0) / complete.length)

const stats = [
  { label: 'Checks run', value: String(sampleReports.length), hint: 'All time', icon: FileSearch },
  {
    label: 'Likely AI-generated',
    value: String(complete.filter((report) => report.verdict === 'likely-ai').length),
    hint: `of ${complete.length} completed checks`,
    icon: Bot,
  },
  {
    label: 'Sources traced',
    value: String(complete.reduce((sum, report) => sum + report.spread.length, 0)),
    hint: 'Accounts and posts in spread paths',
    icon: GitBranch,
  },
  { label: 'Average trust score', value: String(averageScore), hint: 'Across completed checks', icon: Gauge },
]

export default function OverviewPage() {
  const { user } = useUser()
  const navigate = useNavigate()
  const [link, setLink] = useState('')

  const startCheck = (event: FormEvent) => {
    event.preventDefault()
    navigate(`/checks/new?url=${encodeURIComponent(link)}`)
  }

  return (
    <div className="space-y-8">
      <PageHeading
        title={user?.firstName ? `Welcome back, ${user.firstName}` : 'Welcome back'}
        description="Here's what you've checked recently."
        actions={
          <Button asChild>
            <Link to="/checks/new">New check</Link>
          </Button>
        }
      />

      <p className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
        Showing sample data. Connect the analysis API to see your real checks.
      </p>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {stats.map((stat) => (
          <motion.div
            key={stat.label}
            variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}
          >
            <StatCard {...stat} />
          </motion.div>
        ))}
      </motion.div>

      <Card>
        <CardHeader>
          <CardTitle>Check a link</CardTitle>
          <CardDescription>Paste a post, video or article URL to trace it and check how it was made.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={startCheck} className="flex flex-col gap-2 sm:flex-row">
            <Input
              type="url"
              required
              placeholder="https://instagram.com/reel/…"
              value={link}
              onChange={(event) => setLink(event.target.value)}
            />
            <Button type="submit">
              Check <ArrowRight data-icon="inline-end" />
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent reports</CardTitle>
            <CardDescription>Your latest checks and their verdicts.</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/reports">View all</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <ReportsTable reports={sampleReports.slice(0, 4)} />
        </CardContent>
      </Card>
    </div>
  )
}
