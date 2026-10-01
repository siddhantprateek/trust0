import { UserProfile } from '@clerk/react'
import PageHeading from '@/components/custom/page-heading/page-heading.component'

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeading title="Settings" description="Manage your profile, email addresses, password and connected accounts." />
      <UserProfile routing="path" path="/settings" />
    </div>
  )
}
