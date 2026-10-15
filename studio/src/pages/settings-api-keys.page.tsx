import { Link } from 'react-router-dom'
import ApiKeysSection from '@/components/custom/api-keys-section/api-keys-section.component'
import PageHeading from '@/components/custom/page-heading/page-heading.component'
import { Button } from '@/components/ui/button'

export default function SettingsApiKeysPage() {
  return (
    <div className="space-y-6">
      <PageHeading
        title="API keys"
        description="Keys for calling trust0's own models over the API."
        actions={
          <Button variant="outline" asChild>
            <Link to="/models">View models</Link>
          </Button>
        }
      />
      <ApiKeysSection />
    </div>
  )
}
