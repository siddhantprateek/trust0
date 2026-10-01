import { KeyRound } from 'lucide-react'
import Logo from '@/components/custom/logo/logo.component'

// Shown instead of the app when the Clerk key is missing, so a fresh clone explains itself
export default function SetupNotice() {
  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-xl border bg-card p-8">
        <Logo />
        <div className="mt-8 flex items-center gap-2 text-primary">
          <KeyRound className="size-5" />
          <h1 className="text-lg font-semibold text-foreground">Add your Clerk key to start</h1>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Studio uses Clerk for sign-in. Create an application in the Clerk dashboard, copy its publishable key,
          and add it to <code className="font-mono text-foreground">studio/.env.local</code>:
        </p>
        <pre className="mt-4 overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs">
          VITE_CLERK_PUBLISHABLE_KEY=pk_test_…
        </pre>
        <p className="mt-4 text-sm text-muted-foreground">Then restart the dev server.</p>
      </div>
    </div>
  )
}
