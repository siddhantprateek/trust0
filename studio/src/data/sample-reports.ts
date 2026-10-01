import type { Report } from '@/lib/types'

// Placeholder data until the analysis API exists. Everything here is invented.
export const sampleReports: Report[] = [
  {
    id: 'rpt_8f2k1',
    title: 'Flooded subway station reel',
    url: 'instagram.com/reel/C9xQ2mLp4',
    source: 'instagram',
    status: 'complete',
    verdict: 'likely-ai',
    trustScore: 18,
    createdAt: '2026-10-01T09:14:00Z',
    checks: [
      { ok: false, label: 'Generation artifacts found in 14 of 16 frames' },
      { ok: false, label: 'Caption claim not supported by any cited source' },
      { ok: true, label: 'No edits after first upload' },
    ],
    spread: [
      { account: '@originalaccount', platform: 'Instagram', postedAt: 'Mar 2, 09:14', note: 'Earliest known upload' },
      { account: '@viralclips', platform: 'X', postedAt: 'Mar 2, 11:40', note: 'Cropped, caption changed' },
      { account: '@dailynewsfeed', platform: 'TikTok', postedAt: 'Mar 3, 07:02', note: 'Re-encoded, audio added' },
    ],
  },
  {
    id: 'rpt_3m9q7',
    title: 'Senator speech clip',
    url: 'x.com/newsdesk/status/18392…',
    source: 'x',
    status: 'complete',
    verdict: 'edited',
    trustScore: 41,
    createdAt: '2026-09-30T16:02:00Z',
    checks: [
      { ok: false, label: 'Audio splice detected at 0:42' },
      { ok: true, label: 'Video frames consistent with camera capture' },
      { ok: false, label: 'Clip shortened from 11:20 original' },
    ],
    spread: [
      { account: '@cspan', platform: 'YouTube', postedAt: 'Sep 29, 14:00', note: 'Full original broadcast' },
      { account: '@newsdesk', platform: 'X', postedAt: 'Sep 30, 15:48', note: 'Trimmed, audio edited' },
    ],
  },
  {
    id: 'rpt_7c4n2',
    title: 'Wildfire aerial photo',
    url: 'reddit.com/r/pics/comments/1f…',
    source: 'reddit',
    status: 'complete',
    verdict: 'authentic',
    trustScore: 92,
    createdAt: '2026-09-29T08:31:00Z',
    checks: [
      { ok: true, label: 'Camera metadata intact and consistent' },
      { ok: true, label: 'Matches agency photo published the same day' },
      { ok: true, label: 'No generation artifacts found' },
    ],
    spread: [
      { account: 'Reuters', platform: 'Article', postedAt: 'Sep 28, 22:10', note: 'Original agency photo' },
      { account: 'u/firewatch', platform: 'Reddit', postedAt: 'Sep 29, 06:55', note: 'Reposted with credit' },
    ],
  },
  {
    id: 'rpt_5t1v8',
    title: '“Miracle cure” health article',
    url: 'dailyhealthnow.com/articles/…',
    source: 'article',
    status: 'complete',
    verdict: 'likely-ai',
    trustScore: 24,
    createdAt: '2026-09-28T12:20:00Z',
    checks: [
      { ok: false, label: 'Text shows patterns typical of AI generation' },
      { ok: false, label: '3 of 4 cited studies do not exist' },
      { ok: true, label: 'Domain registered over 2 years ago' },
    ],
    spread: [{ account: 'dailyhealthnow.com', platform: 'Article', postedAt: 'Sep 27, 09:00', note: 'First publication' }],
  },
  {
    id: 'rpt_9h6d3',
    title: 'Concert crowd video',
    url: 'tiktok.com/@musicfan/video/73…',
    source: 'tiktok',
    status: 'analyzing',
    verdict: 'unverified',
    trustScore: 0,
    createdAt: '2026-10-01T10:02:00Z',
    checks: [],
    spread: [],
  },
  {
    id: 'rpt_2b8w5',
    title: 'Product launch screenshot',
    url: 'upload: launch_leak.png',
    source: 'upload',
    status: 'failed',
    verdict: 'unverified',
    trustScore: 0,
    createdAt: '2026-09-27T18:45:00Z',
    checks: [],
    spread: [],
  },
]

export function findReport(id: string | undefined) {
  return sampleReports.find((report) => report.id === id)
}
