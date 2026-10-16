import PageHeading from '@/components/custom/page-heading/page-heading.component'
import ServerUrlSection from '@/components/custom/server-url-section/server-url-section.component'

export default function SettingsServerPage() {
  return (
    <div className="space-y-6">
      <PageHeading title="Server" description="Where the studio sends its API requests." />
      <ServerUrlSection />
    </div>
  )
}
