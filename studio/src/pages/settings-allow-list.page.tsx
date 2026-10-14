import ActiveSitesSection from '@/components/custom/active-sites-section/active-sites-section.component'
import PageHeading from '@/components/custom/page-heading/page-heading.component'

export default function SettingsAllowListPage() {
  return (
    <div className="space-y-6">
      <PageHeading title="Allow list" description="Websites where the trust0 browser extension is active." />
      <ActiveSitesSection />
    </div>
  )
}
