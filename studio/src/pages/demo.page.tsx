import { useAuth } from '@clerk/react'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import Logo from '@/components/custom/logo/logo.component'
import ThemeToggle from '@/components/custom/theme-toggle/theme-toggle.component'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { sampleReport } from '@/data/sample-report'
import { ReportView } from './report-detail.page'

// Public, no sign-in: a real report rendered from bundled data, so anyone can see what a check returns
export default function DemoPage() {
  const { isSignedIn } = useAuth()

  return (
    <div className="min-h-svh bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-3 px-4 md:px-8">
          <Link to="/" aria-label="trust0 Studio">
            <Logo mark />
          </Link>
          <Badge variant="secondary">Sample report</Badge>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Button size="sm" asChild>
              <Link to={isSignedIn ? '/checks/new' : '/sign-up'}>
                Check your own <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl p-4 md:p-8">
        <ReportView report={sampleReport} backLink={false} />
      </main>
    </div>
  )
}
