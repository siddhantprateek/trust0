import { UserProfile } from '@clerk/react'

// No PageHeading here: Clerk's own UserProfile already renders an "Account" title and description
export default function SettingsAccountPage() {
  return (
    // Clerk owns everything under this path (security tab, verification steps, …)
    <UserProfile routing="path" path="/settings/account" />
  )
}
