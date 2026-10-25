import { SignIn, useAuth } from '@clerk/react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import AuthShell from '@/components/custom/auth-shell/auth-shell.component'
import { afterAuthPath } from '@/lib/auth-redirect'

export default function SignInPage() {
  const { isSignedIn } = useAuth()
  const { search } = useLocation()
  const next = afterAuthPath(search)

  // Signed in but still here (Clerk's own redirect lost a race, or an old link): go on rather than show the form
  if (isSignedIn) return <Navigate to={next} replace />

  return (
    <AuthShell>
      <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" forceRedirectUrl={next} signUpForceRedirectUrl={next} />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Just looking?{' '}
        <Link to="/demo" className="font-medium text-primary hover:underline">
          See a sample report
        </Link>
      </p>
    </AuthShell>
  )
}
