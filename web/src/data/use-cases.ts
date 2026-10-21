import type { LucideIcon } from 'lucide-react'
import {
  Blocks,
  FileSearch,
  GitBranch,
  KeyRound,
  Layers,
  MessageCircle,
  Microscope,
  Newspaper,
  Puzzle,
  Scale,
  ScanSearch,
  Share2,
  ShieldAlert,
  Sparkles,
  Timer,
} from 'lucide-react'
import type { GradientTone } from '@/components/custom/gradient-tile/gradient-tile.component'

export type UseCase = {
  slug: string
  label: string
  // One line for menus and cards
  blurb: string
  tone: GradientTone
  icon: LucideIcon
  title: string
  intro: string
  problems: { title: string; body: string }[]
  capabilities: { icon: LucideIcon; title: string; body: string }[]
  // A worked example, step by step
  scenario: { title: string; steps: { label: string; body: string }[] }
  where: { icon: LucideIcon; title: string; body: string }[]
  cta: string
}

export const useCases: UseCase[] = [
  {
    slug: 'journalists',
    label: 'Journalists & fact-checkers',
    blurb: 'Verify footage before it runs.',
    tone: 'sunset',
    icon: Newspaper,
    title: 'Verify footage before it runs.',
    intro:
      'Breaking news moves faster than verification. trust0 gives your desk a first pass in about a minute: whether a clip is AI-generated, where it first appeared, and which claims in the caption hold up, with every source linked so you can check our work.',
    problems: [
      {
        title: 'Old footage, new caption',
        body: 'The most common fake isn’t AI at all. It’s a real video from years ago, re-captioned for today’s story.',
      },
      {
        title: 'Generated images that look like photos',
        body: 'Modern generators produce images that pass a quick glance, especially after platforms compress them.',
      },
      {
        title: 'No time to trace the original',
        body: 'Finding the first upload means reverse searches across platforms, dead links and deleted accounts, on deadline.',
      },
    ],
    capabilities: [
      {
        icon: GitBranch,
        title: 'Spread path',
        body: 'See the earliest known upload and every hop after it, with dates and accounts, matched by perceptual fingerprints that survive cropping and re-encoding.',
      },
      {
        icon: ScanSearch,
        title: 'AI-generated media check',
        body: 'Our own detector, trust0-vision-1, plus a second opinion and content-credential markers. trust0 only says "likely AI" when two signals agree.',
      },
      {
        icon: FileSearch,
        title: 'Claim-by-claim fact check',
        body: 'Up to five checkable claims, each verified against primary sources, wires and published fact checks, and each linked.',
      },
      {
        icon: Scale,
        title: 'Coverage and bias',
        body: 'For news stories, see which outlets cover it across the political spectrum, and where one side is missing.',
      },
    ],
    scenario: {
      title: 'A flood video goes viral at 9 a.m.',
      steps: [
        { label: 'Paste the link', body: 'Drop the X post into trust0. The video is downloaded and fingerprinted in the background.' },
        { label: 'Trace it', body: 'trust0 matches its frames to a TikTok from three years earlier, filmed in another country.' },
        { label: 'Check the caption', body: 'The claim about today’s storm is marked refuted, citing the original upload and local reporting.' },
        { label: 'Share the report', body: 'Send the full report, with sources, to your editor before the clip runs.' },
      ],
    },
    where: [
      { icon: Puzzle, title: 'Browser extension', body: 'Right-click any video, image or post and choose Check with trust0.' },
      { icon: Layers, title: 'Studio', body: 'Full reports with the spread path, evidence and sources, ready to share with your desk.' },
    ],
    cta: 'Check a clip',
  },
  {
    slug: 'trust-and-safety',
    label: 'Trust & safety teams',
    blurb: 'Triage viral media at scale.',
    tone: 'ocean',
    icon: ShieldAlert,
    title: 'Triage viral media at scale.',
    intro:
      'When a manipulated video starts spreading, the first hour matters. trust0 gives moderators a fast, explainable signal on synthetic and recycled media, plus an API to plug it into the review queue you already run.',
    problems: [
      {
        title: 'Reports outpace reviewers',
        body: 'Every viral clip arrives as hundreds of reports. Reviewers need a fast first signal, not another tab of reverse searches.',
      },
      {
        title: 'Detectors that cry wolf',
        body: 'A detector that flags real photos creates appeals, erodes trust and wastes reviewer time.',
      },
      {
        title: 'Re-uploads of known fakes',
        body: 'The same manipulated media comes back cropped, re-encoded and re-captioned on new accounts.',
      },
    ],
    capabilities: [
      {
        icon: ScanSearch,
        title: 'Low false-alarm detection',
        body: 'trust0-vision-1 flags about 6% of real photos on social-media-compressed images, and "likely AI" needs two signals that agree.',
      },
      {
        icon: GitBranch,
        title: 'Re-upload matching',
        body: 'Perceptual fingerprints survive cropping, resizing and compression, so a re-upload matches the original you already checked.',
      },
      {
        icon: KeyRound,
        title: 'API access',
        body: 'Score images with trust0-vision-1 from your own pipeline, using API keys you create and revoke in the studio.',
      },
      {
        icon: Sparkles,
        title: 'Explainable verdicts',
        body: 'Every point in the trust score maps to a check a reviewer can read, so decisions are easy to justify on appeal.',
      },
    ],
    scenario: {
      title: 'A deepfake of a public figure is reported 400 times',
      steps: [
        { label: 'Score it', body: 'Your queue sends the keyframes to the trust0 API and gets an AI-generated probability back.' },
        { label: 'Corroborate', body: 'A full check adds a visual review and content-credential markers. Both agree: likely AI.' },
        { label: 'Find the source', body: 'The spread path shows the account that posted it first and the reposts that followed.' },
        { label: 'Catch the next copy', body: 'When a cropped re-upload appears, its fingerprint matches the original report.' },
      ],
    },
    where: [
      { icon: Blocks, title: 'API', body: 'Send an image, get back a label and a probability. Built for queues and automation.' },
      { icon: Layers, title: 'Studio', body: 'Track running checks and open full reports when a case needs a closer look.' },
    ],
    cta: 'Get API access',
  },
  {
    slug: 'researchers',
    label: 'Researchers',
    blurb: 'Study how content spreads and mutates.',
    tone: 'orchid',
    icon: Microscope,
    title: 'Study how content spreads and mutates.',
    intro:
      'Misinformation research needs more than a yes-or-no label. trust0 records where content first appeared, how it moved across platforms, what changed along the way, and how outlets covered it, in structured reports you can analyse.',
    problems: [
      {
        title: 'Spread is hard to reconstruct',
        body: 'Posts get deleted, re-encoded and re-captioned. Rebuilding the path by hand doesn’t scale past a handful of cases.',
      },
      {
        title: 'Black-box labels',
        body: 'A single score with no evidence is hard to cite, audit or reproduce.',
      },
      {
        title: 'Coverage is uneven',
        body: 'Who covers a story, and who ignores it, is part of the story. Measuring it means reading every outlet.',
      },
    ],
    capabilities: [
      {
        icon: GitBranch,
        title: 'Structured spread paths',
        body: 'Every hop has an account, platform, date and the evidence behind it: a visual match, platform metadata, reverse search or research.',
      },
      {
        icon: Scale,
        title: 'Left / center / right coverage',
        body: 'Coverage counts and blindspots per story, using public media-bias ratings. Lean belongs to outlets, never to facts.',
      },
      {
        icon: FileSearch,
        title: 'Cited claims',
        body: 'Each claim comes with a verdict, an explanation and the sources used, so findings can be checked independently.',
      },
      {
        icon: Microscope,
        title: 'Open benchmarks',
        body: 'We publish how our models are measured, including where they fail. Read the trust0-vision-1 benchmark on our blog.',
      },
    ],
    scenario: {
      title: 'Tracking a recycled war image',
      steps: [
        { label: 'Collect', body: 'Check every post in your sample through the studio or the API.' },
        { label: 'Reconstruct', body: 'Spread paths link re-uploads back to a single original, even after crops and filters.' },
        { label: 'Measure', body: 'Compare when each platform picked it up and how captions drifted over time.' },
        { label: 'Cite', body: 'Every finding links to its evidence, ready for a methods section.' },
      ],
    },
    where: [
      { icon: Layers, title: 'Studio', body: 'Browse and filter reports, with each pipeline step and its timing.' },
      { icon: Blocks, title: 'API', body: 'Run checks in bulk and pull structured reports into your own analysis.' },
    ],
    cta: 'Start researching',
  },
  {
    slug: 'everyday-sharing',
    label: 'Everyday sharing',
    blurb: 'Check a forward before you pass it on.',
    tone: 'sunset',
    icon: MessageCircle,
    title: 'Check a forward before you pass it on.',
    intro:
      'A shocking photo in the family group. A video your friend swears is real. An AI answer that sounds very sure of itself. trust0 tells you in plain English whether it holds up, without you having to become a detective.',
    problems: [
      {
        title: 'Forwards with no source',
        body: 'By the time a message reaches you, nobody knows where it came from or when it was made.',
      },
      {
        title: 'AI that sounds certain',
        body: 'Chatbots state wrong facts with total confidence, and it’s hard to know which parts to trust.',
      },
      {
        title: 'Checking takes too long',
        body: 'Reverse image searches and fact-check sites take effort, so most people just share.',
      },
    ],
    capabilities: [
      {
        icon: Sparkles,
        title: 'A clear verdict',
        body: 'Authentic, edited, likely AI, accurate, mixed or inaccurate, with a 0–100 trust score and a short reason.',
      },
      {
        icon: MessageCircle,
        title: 'Checks where you chat',
        body: 'The extension adds a trust chip to WhatsApp Web messages, social posts and AI answers on ChatGPT, Claude, Gemini and Perplexity.',
      },
      {
        icon: Share2,
        title: 'Where it really came from',
        body: 'See the first known upload, so an old video can’t pass as today’s news.',
      },
      {
        icon: Timer,
        title: 'About a minute',
        body: 'Most checks finish while you read the message. Slow ones keep running and update when they’re done.',
      },
    ],
    scenario: {
      title: 'A “breaking” photo lands in your family chat',
      steps: [
        { label: 'Click the chip', body: 'The trust0 chip appears next to the message in WhatsApp Web.' },
        { label: 'Read the verdict', body: 'Likely AI-generated, trust score 18. Two independent checks agree.' },
        { label: 'See why', body: 'The image first appeared on an AI-art account last month, with no news coverage.' },
        { label: 'Share the report', body: 'Reply with the report link instead of the rumour.' },
      ],
    },
    where: [
      { icon: Puzzle, title: 'Browser extension', body: 'Chrome, Edge, Brave and Arc. Chips on the sites you choose, right-click checks everywhere.' },
      { icon: Layers, title: 'Studio', body: 'Paste any link or upload a photo or video, and keep a history of what you checked.' },
    ],
    cta: 'Add to browser',
  },
]

export function getUseCase(slug: string) {
  return useCases.find((u) => u.slug === slug)
}
