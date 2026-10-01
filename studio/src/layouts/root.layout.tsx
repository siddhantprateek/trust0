import { ClerkProvider } from '@clerk/react'
import { MotionConfig } from 'motion/react'
import { Outlet, ScrollRestoration, useNavigate } from 'react-router-dom'
import SetupNotice from '@/components/custom/setup-notice/setup-notice.component'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { clerkAppearance } from '@/lib/clerk-appearance'

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined

export default function RootLayout() {
  const navigate = useNavigate()

  if (!publishableKey) {
    return <SetupNotice />
  }

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      // Let Clerk navigate through React Router instead of full page reloads
      routerPush={(to) => navigate(to)}
      routerReplace={(to) => navigate(to, { replace: true })}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/"
      signUpFallbackRedirectUrl="/"
      afterSignOutUrl="/sign-in"
      appearance={clerkAppearance}
    >
      <MotionConfig reducedMotion="user">
        <TooltipProvider>
          <Outlet />
          <Toaster theme="light" />
        </TooltipProvider>
      </MotionConfig>
      <ScrollRestoration />
    </ClerkProvider>
  )
}
