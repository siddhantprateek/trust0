import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[60svh] flex-col items-center justify-center gap-4 text-center">
      <p className="font-pixel text-5xl text-muted-foreground">404</p>
      <h1 className="text-xl font-semibold">Page not found</h1>
      <Button variant="outline" asChild>
        <Link to="/">Back to overview</Link>
      </Button>
    </div>
  )
}
