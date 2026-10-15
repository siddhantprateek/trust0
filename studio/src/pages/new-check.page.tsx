import { useEffect, useState, type DragEvent, type FormEvent } from 'react'
import { Link2, Type, Upload, X } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import PageHeading from '@/components/custom/page-heading/page-heading.component'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api'
import { formatFileSize } from '@/lib/format'
import type { Report } from '@/lib/types'
import { cn } from '@/lib/utils'

export default function NewCheckPage() {
  const [searchParams] = useSearchParams()
  const [url, setUrl] = useState(searchParams.get('url') ?? '')
  const [files, setFiles] = useState<File[]>([])
  const [text, setText] = useState('')
  const [dragging, setDragging] = useState(false)
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f))
    setPreviewUrls(urls)
    return () => urls.forEach((url) => URL.revokeObjectURL(url))
  }, [files])

  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)

  const run = async (start: () => Promise<Report>) => {
    setSubmitting(true)
    try {
      const report = await start()
      navigate(`/reports/${report.id}`)
    } catch (err) {
      toast.error('Check failed to start', { description: err instanceof Error ? err.message : String(err) })
    } finally {
      setSubmitting(false)
    }
  }

  const submitLink = (event: FormEvent) => {
    event.preventDefault()
    run(() => api.createReport({ kind: 'link', url: url.trim() }))
  }
  const submitFile = async (event: FormEvent) => {
    event.preventDefault()
    if (files.length === 0) return
    if (files.length === 1) {
      run(() => api.uploadReport(files[0]))
      return
    }
    setSubmitting(true)
    const results = await Promise.allSettled(files.map((f) => api.uploadReport(f)))
    const failed = results.filter((r) => r.status === 'rejected').length
    setSubmitting(false)
    if (failed > 0) {
      toast.error(`${failed} of ${files.length} checks failed to start`)
    }
    if (failed < files.length) {
      toast.success(`${files.length - failed} ${files.length - failed === 1 ? 'check' : 'checks'} started`)
      navigate('/reports')
    }
  }

  const addFiles = (incoming: FileList | null) => {
    if (!incoming || incoming.length === 0) return
    setFiles((prev) => [...prev, ...Array.from(incoming)])
  }
  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const onDragOver = (event: DragEvent) => {
    event.preventDefault()
    setDragging(true)
  }
  const onDragLeave = (event: DragEvent) => {
    event.preventDefault()
    setDragging(false)
  }
  const onDrop = (event: DragEvent) => {
    event.preventDefault()
    setDragging(false)
    addFiles(event.dataTransfer.files)
  }
  const submitText = (event: FormEvent) => {
    event.preventDefault()
    run(() => api.createReport({ kind: 'text', text: text.trim() }))
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
              <form onSubmit={submitLink} className="space-y-4">
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
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Starting…' : 'Run check'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upload">
          <Card>
            <CardHeader>
              <CardTitle>Upload media</CardTitle>
              <CardDescription>
                One or more photos or videos. Each is checked separately for generation artifacts and edits.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={submitFile} className="space-y-4">
                {files.length > 0 && (
                  <ul className="space-y-2">
                    {files.map((f, index) => (
                      <li key={`${f.name}-${f.lastModified}-${index}`} className="flex items-center gap-3 rounded-lg border p-3">
                        <button
                          type="button"
                          onClick={() => setLightboxIndex(index)}
                          aria-label={`Preview ${f.name}`}
                          className="flex size-12 shrink-0 cursor-zoom-in items-center justify-center overflow-hidden rounded-md bg-muted transition-opacity hover:opacity-80"
                        >
                          {f.type.startsWith('video/') ? (
                            <video src={previewUrls[index]} className="size-full object-cover" muted playsInline />
                          ) : (
                            <img src={previewUrls[index]} alt="" className="size-full object-cover" />
                          )}
                        </button>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{f.name}</p>
                          <p className="text-xs text-muted-foreground">{formatFileSize(f.size)}</p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Remove ${f.name}`}
                          onClick={() => removeFile(index)}
                        >
                          <X />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
                <label
                  htmlFor="file"
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                  className={cn(
                    'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-10 text-center transition-colors hover:bg-muted',
                    dragging && 'border-primary bg-primary/5',
                  )}
                >
                  <Upload className="size-5 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {dragging ? 'Drop to upload' : files.length > 0 ? 'Add more files' : 'Choose files or drag them here'}
                  </span>
                  <span className="text-xs text-muted-foreground">JPG, PNG, WEBP, MP4 or MOV</span>
                </label>
                <input
                  id="file"
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  required={files.length === 0}
                  className="sr-only"
                  onChange={(event) => {
                    addFiles(event.target.files)
                    event.target.value = ''
                  }}
                />
                <Button type="submit" disabled={files.length === 0 || submitting}>
                  {submitting
                    ? 'Uploading…'
                    : files.length > 1
                      ? `Run ${files.length} checks`
                      : 'Run check'}
                </Button>
              </form>

              <Dialog open={lightboxIndex !== null} onOpenChange={(open) => !open && setLightboxIndex(null)}>
                <DialogContent className="flex max-w-2xl items-center justify-center p-2">
                  <DialogTitle className="sr-only">{lightboxIndex !== null ? files[lightboxIndex]?.name : 'Preview'}</DialogTitle>
                  {lightboxIndex !== null &&
                    (files[lightboxIndex]?.type.startsWith('video/') ? (
                      <video src={previewUrls[lightboxIndex]} className="max-h-[80vh] w-full rounded-lg" controls autoPlay />
                    ) : (
                      <img src={previewUrls[lightboxIndex]} alt="" className="max-h-[80vh] w-full rounded-lg object-contain" />
                    ))}
                </DialogContent>
              </Dialog>
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
              <form onSubmit={submitText} className="space-y-4">
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
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Starting…' : 'Run check'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
