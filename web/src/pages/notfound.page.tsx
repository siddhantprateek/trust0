import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function NotFoundPage() {
  return (
    <main className="flex min-h-svh pt-16 flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <Button asChild variant="outline">
        <Link to="/">Go home</Link>
      </Button>
    </main>
  )
}
