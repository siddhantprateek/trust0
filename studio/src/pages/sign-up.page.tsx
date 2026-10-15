import { SignUp, useAuth } from '@clerk/react'
import { Navigate, useLocation } from 'react-router-dom'
import AuthShell from '@/components/custom/auth-shell/auth-shell.component'
import { afterAuthPath } from '@/lib/auth-redirect'

export default function SignUpPage() {
  const { isSignedIn } = useAuth()
  const { search } = useLocation()
  const next = afterAuthPath(search)

  if (isSignedIn) return <Navigate to={next} replace />

  return (
    <AuthShell>
      <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" forceRedirectUrl={next} signInForceRedirectUrl={next} />
    </AuthShell>
  )
}
