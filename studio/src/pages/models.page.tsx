import { KeyRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import ModelListRow from '@/components/custom/model-list-row/model-list-row.component'
import PageHeading from '@/components/custom/page-heading/page-heading.component'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useModels } from '@/hooks/use-models'

export default function ModelsPage() {
  const { models, loading, error } = useModels()

  return (
    <div className="space-y-6">
      <PageHeading
        title="Models"
        description="trust0's own models, trained in-house. Use them in the studio, or call them from your code."
        actions={
          <Button variant="outline" asChild>
            <Link to="/settings/api-keys">
              <KeyRound data-icon="inline-start" />
              API keys
            </Link>
          </Button>
        }
      />

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : error ? (
        <p className="text-sm text-muted-foreground">{error}</p>
      ) : (
        <div className="divide-y rounded-lg border">
          {models.map((model) => (
            <ModelListRow key={model.id} model={model} />
          ))}
        </div>
      )}
    </div>
  )
}
