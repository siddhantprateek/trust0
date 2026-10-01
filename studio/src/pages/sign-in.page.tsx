import { SignIn } from '@clerk/react'
import AuthShell from '@/components/custom/auth-shell/auth-shell.component'

export default function SignInPage() {
  return (
    <AuthShell>
      <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />
    </AuthShell>
  )
}
