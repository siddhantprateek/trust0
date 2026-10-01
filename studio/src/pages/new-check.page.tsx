import { useState, type FormEvent } from 'react'
import { Link2, Type, Upload } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import PageHeading from '@/components/custom/page-heading/page-heading.component'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'

export default function NewCheckPage() {
  const [searchParams] = useSearchParams()
  const [url, setUrl] = useState(searchParams.get('url') ?? '')
  const [file, setFile] = useState<File | null>(null)
  const [text, setText] = useState('')

  // No analysis backend yet: acknowledge the submission honestly instead of faking a result
  const submit = (event: FormEvent) => {
    event.preventDefault()
    toast.info('Analysis API not connected yet', {
      description: 'Your input is valid. Hook up the backend in new-check.page.tsx to run real checks.',
    })
  }

  return (
    <div className="space-y-8">
      <PageHeading title="New check" description="Submit a link, a file or some text to verify." />

      <Tabs defaultValue="link" className="max-w-2xl">
        <TabsList>
          <TabsTrigger value="link">
            <Link2 /> Link
          </TabsTrigger>
          <TabsTrigger value="upload">
            <Upload /> Upload
          </TabsTrigger>
          <TabsTrigger value="text">
            <Type /> Text
          </TabsTrigger>
        </TabsList>

        <TabsContent value="link">
          <Card>
            <CardHeader>
              <CardTitle>Check a link</CardTitle>
              <CardDescription>Instagram, X, YouTube, TikTok, Reddit or any article URL.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="url">URL</Label>
                  <Input
                    id="url"
                    type="url"
                    required
                    placeholder="https://"
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                  />
                </div>
                <Button type="submit">Run check</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upload">
          <Card>
            <CardHeader>
              <CardTitle>Upload media</CardTitle>
              <CardDescription>A photo or video file. We look for generation artifacts and edits.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={submit} className="space-y-4">
                <label
                  htmlFor="file"
                  className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-10 text-center transition-colors hover:bg-muted"
                >
                  <Upload className="size-5 text-muted-foreground" />
                  <span className="text-sm font-medium">{file ? file.name : 'Choose a file'}</span>
                  <span className="text-xs text-muted-foreground">JPG, PNG, WEBP, MP4 or MOV</span>
                </label>
                <input
                  id="file"
                  type="file"
                  accept="image/*,video/*"
                  required
                  className="sr-only"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                />
                <Button type="submit" disabled={!file}>
                  Run check
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="text">
          <Card>
            <CardHeader>
              <CardTitle>Check text</CardTitle>
              <CardDescription>Paste an article, post or AI answer to check its claims.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="text">Text</Label>
                  <Textarea
                    id="text"
                    required
                    rows={8}
                    placeholder="Paste the text to check…"
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                  />
                </div>
                <Button type="submit">Run check</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
