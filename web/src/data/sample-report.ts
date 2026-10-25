// A real trust0 report, copied from the studio database (rpt_2c5dee32f01f) for the homepage mockup.
// The post image is shown blurred: it is a news graphic of the victim and the accused.

export type Lean = 'left' | 'lean-left' | 'center' | 'lean-right' | 'right'
export type ClaimVerdict = 'supported' | 'refuted' | 'mixed' | 'unverifiable'

export const sampleReport = {
  id: 'rpt_2c5dee32f01f',
  title: 'BIG BREAKING: A court in Meerut, Uttar Pradesh, has sentenced Muskan Rastogi and her boyfriend Sahil',
  source: 'X',
  checkedAt: 'Oct 15, 2026, 6:08 AM UTC',
  verdict: { label: 'Edited', tone: 'warn' as const },
  trustScore: 58,
  aiProbability: 0.0107,
  summary:
    'The core claim, that a Meerut court sentenced Muskan Rastogi and Sahil Shukla to death on October 14, 2026, is supported, as are the broad facts of the killing, concealment in a cement-filled blue drum, and the post-crime trip. The post wrongly names the victim as Saurabh Rastogi rather than Saurabh Rajput, and reporting conflicts over whether the killing was on March 3 or the night of March 4, 2025.',
  post: {
    account: '@MeghUpdates',
    site: 'x.com',
    postedAt: 'Oct 14, 10:55 AM UTC',
    text: 'BIG BREAKING: A court in Meerut, Uttar Pradesh, has sentenced Muskan Rastogi and her boyfriend Sahil Shukla to death in the infamous Blue Drum Murder Case. On March 3, 2025, Muskan and Sahil murdered her husband, Saurabh Rastogi, after drugging him…',
  },
  sections: [
    {
      kind: 'text' as const,
      title: 'Post text',
      score: 63,
      verdict: { label: 'Mixed', tone: 'warn' as const },
      checks: [
        { ok: true, label: 'Supported: A court in Meerut sentenced Muskan Rastogi and Sahil Shukla to death in the “Blue Drum” murder case.' },
        { ok: false, label: 'Contradicted by sources: The man killed was Muskan’s husband, “Saurabh Rastogi.”' },
        { ok: true, label: 'Supported: They drugged Saurabh, killed him and concealed the remains in a blue drum sealed with cement.' },
        { ok: false, label: 'Partly true: The murder occurred on March 3, 2025.' },
        { ok: true, label: 'Supported: After the murder, the pair went on a trip to Shimla.' },
      ],
    },
    {
      kind: 'media' as const,
      title: 'Image',
      score: 55,
      verdict: { label: 'Edited', tone: 'warn' as const },
      checks: [
        { ok: true, label: 'No generation artifacts detected (1%)' },
        { ok: false, label: 'Changed from the original: the visual was reused from a March 19, 2025 ThePrint graphic about the arrests and paired with the October 14, 2026 sentencing update.' },
        { ok: true, label: 'Matched 2 other uploads of the same media' },
      ],
    },
  ],
  claims: [
    {
      text: 'A court in Meerut, Uttar Pradesh, sentenced Muskan Rastogi and Sahil Shukla to death in the “Blue Drum” murder case.',
      verdict: 'supported' as ClaimVerdict,
      explanation:
        'Multiple established news reports dated October 14, 2026 say a Meerut district court sentenced both defendants to death. This is a trial-court sentence, subject to the normal High Court confirmation process.',
      sources: [
        { publisher: 'The Indian Express', lean: 'lean-left' as Lean },
        { publisher: 'NDTV', lean: null },
        { publisher: 'The New Indian Express', lean: 'lean-left' as Lean },
      ],
    },
    {
      text: 'The man killed was Muskan’s husband, “Saurabh Rastogi.”',
      verdict: 'refuted' as ClaimVerdict,
      explanation:
        'Reliable reporting identifies the victim as Saurabh Rajput, while Muskan’s surname is Rastogi. The post appears to have given the victim the wrong surname.',
      sources: [
        { publisher: 'Hindustan Times', lean: 'lean-left' as Lean },
        { publisher: 'PTI via ThePrint', lean: 'lean-left' as Lean },
      ],
    },
    {
      text: 'They drugged Saurabh, killed him, dismembered his body, and concealed the remains in a blue drum sealed with cement.',
      verdict: 'supported' as ClaimVerdict,
      explanation:
        'The prosecution case in the charge sheet and later sentencing reports matches this account; the defendants were convicted of murder and destruction of evidence.',
      sources: [
        { publisher: 'PTI via ThePrint', lean: 'lean-left' as Lean },
        { publisher: 'NDTV', lean: null },
        { publisher: 'The Times of India', lean: 'lean-right' as Lean },
      ],
    },
    {
      text: 'The murder occurred on March 3, 2025.',
      verdict: 'mixed' as ClaimVerdict,
      explanation:
        'Some accounts place the killing on March 3, but PTI and other contemporaneous reports describe it as the night of March 4. Early March 2025 is supported; the exact date is reported inconsistently.',
      sources: [
        { publisher: 'NDTV', lean: null },
        { publisher: 'PTI via ThePrint', lean: 'lean-left' as Lean },
        { publisher: 'ThePrint', lean: 'lean-left' as Lean },
      ],
    },
    {
      text: 'After the murder, the pair went on a trip to Shimla.',
      verdict: 'supported' as ClaimVerdict,
      explanation:
        'Police reporting at the time and later sentencing coverage say the pair travelled to Himachal Pradesh after the killing, including stays in Shimla.',
      sources: [
        { publisher: 'The Indian Express', lean: 'lean-left' as Lean },
        { publisher: 'ThePrint', lean: 'lean-left' as Lean },
        { publisher: 'The Times of India', lean: 'lean-right' as Lean },
      ],
    },
  ],
  coverage: {
    query: 'Meerut blue drum death sentence',
    total: 30,
    left: 8,
    center: 0,
    right: 8,
    unrated: 14,
    leftPct: 50,
    centerPct: 0,
    rightPct: 50,
    sources: [
      { outlet: 'National Herald', lean: 'left' as Lean, date: 'Oct 14', title: 'Meerut court awards death penalty to Rastogi, Shukla in ‘blue drum’ murder' },
      { outlet: 'The Indian Express', lean: 'lean-left' as Lean, date: 'Oct 14', title: 'Meerut ‘blue drum’ murder case: Wife Muskan, lover Sahil get death sentence' },
      { outlet: 'Hindustan Times', lean: 'lean-left' as Lean, date: 'Oct 14', title: 'Meerut ‘blue drum’ murder: Death penalty for Muskan Rastogi, lover Sahil' },
      { outlet: 'The Hindu', lean: 'lean-left' as Lean, date: 'Oct 14', title: '’Blue drum’ murder case: Meerut court sentences wife, partner to death' },
      { outlet: 'Deccan Herald', lean: 'lean-left' as Lean, date: 'Oct 14', title: 'Meerut ‘blue drum’ case: Muskan, Sahil get death sentence for murder of Saurabh Rajput' },
      { outlet: 'The Times of India', lean: 'lean-right' as Lean, date: 'Oct 15', title: 'Blue drum case: Future of Muskan’s 10-month-old daughter hangs in the balance' },
      { outlet: 'India Today', lean: 'lean-right' as Lean, date: 'Oct 15', title: 'Skipped meal, sleepless night: Death sentence rattles blue drum convicts' },
      { outlet: 'News18', lean: 'lean-right' as Lean, date: 'Oct 14', title: 'Death Penalty For Muskan Rastogi, Her Lover Sahil In Meerut Blue Drum Murder Case' },
      { outlet: 'OpIndia', lean: 'right' as Lean, date: 'Oct 14', title: 'Meerut Blue Drum murder case: Muskan Rastogi and lover Sahil Shukla sentenced to death' },
      { outlet: 'NDTV', lean: null, date: 'Oct 14', title: 'Wife, Lover ‘Cried Uncontrollably’ After Death Sentence In Blue Drum Murder' },
    ],
  },
  spread: [
    { account: 'ThePrint', platform: 'ThePrint', when: 'Mar 19 2025, 12:48 UTC', note: 'The original graphic, published with the arrests', evidence: 'Visual match', origin: true },
    { account: 'NDTV', platform: 'Article', when: 'Oct 14 2026, 10:53 UTC', note: 'Reported the sentences two minutes before the post; the caption repeats its details', evidence: 'Research', origin: false },
    { account: '@MeghUpdates', platform: 'X', when: 'Oct 14 2026, 10:55 UTC', note: 'The post you checked', evidence: 'Submitted', origin: false },
    { account: '@MeghUpdates', platform: 'X', when: 'date unknown', note: 'An earlier post by the same account reusing the same image', evidence: 'Visual match', origin: false },
  ],
  // Real stage durations from the run (1 min 17 s end to end)
  steps: [
    { label: 'Fetching the content', detail: 'Image from x.com · 69 words', seconds: 2.7 },
    { label: 'Fingerprinting media', detail: '1 keyframe', seconds: 0.1 },
    { label: 'Checking for AI generation', detail: '1% likely AI-generated · t0-vision', seconds: 1.1 },
    { label: 'Tracing where it came from', detail: 'Modified copy of an earlier post · 4 posts in the chain', seconds: 40.7 },
    { label: 'Fact-checking claims', detail: '5 claims checked', seconds: 19.1 },
    { label: 'Comparing news coverage', detail: '30 outlets covering it', seconds: 14.1 },
    { label: 'Scoring trust', detail: 'Edited · trust 58', seconds: 0.1 },
  ],
}
