import { SignUp } from '@clerk/react'
import AuthShell from '@/components/custom/auth-shell/auth-shell.component'

export default function SignUpPage() {
  return (
    <AuthShell>
      <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
    </AuthShell>
  )
}
