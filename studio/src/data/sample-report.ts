// A real trust0 report (rpt_2e9a486cf739, an X video post), exported from the studio database for the public
// demo at /demo. Its preview, keyframes and video live in public/sample/ instead of inline base64.
import type { Report } from '@/lib/types'

export const sampleReport: Report = {
  "id": "rpt_2e9a486cf739",
  "title": "(1) Eric Daugherty on X: \"🚨 WOW! The CEO of AUDI just came on stage with President Trump to confirm a multi-BILLION dollar auto manufacturing investment in Georgia \"We are planning to bring are biggest and most premium SUVs, and produce them here in MACON, GEORGIA.\" CROWD: \"TRUMP! TRUMP! TRUMP!\" This https://t.co/YvT7LtGSdd\" / X",
  "url": "https://x.com/EricLDaugh/status/2114149405209018546",
  "source": "x",
  "status": "complete",
  "verdict": "edited",
  "trustScore": 48,
  "summary": "The post accurately describes a real Audi announcement and the CEO's appearance with Trump, but it gets the construction timing wrong. Its claim that the project proves tariffs work is an unsupported oversimplification of Audi's stated reasons for the investment. The footage comes from President Trump’s October 24, 2026 rally in Perry, Georgia, where Audi CEO Gernot Döllner made the quoted remarks. The submitted X video is a shortened, newly captioned repost; the same segment was also distributed by @Republicans before it was documented in contemporaneous coverage.",
  "createdAt": "2026-10-25T13:35:09.045666Z",
  "checks": [
    {
      "ok": true,
      "label": "No generation artifacts detected (27%)"
    },
    {
      "ok": false,
      "label": "Changed from the original: The full rally footage was cut down to a 92-second excerpt."
    },
    {
      "ok": true,
      "label": "Supported: Audi CEO Gernot Döllner appeared on stage with President Trump at an October 24, 2026 rally in Perry, Georgia, and said Audi planned to produce its biggest, premium SUVs in the Macon-area of Georgia."
    },
    {
      "ok": true,
      "label": "Supported: Audi confirmed a multi-billion-dollar automobile-manufacturing investment in Georgia."
    },
    {
      "ok": false,
      "label": "Contradicted by sources: Construction begins next month."
    },
    {
      "ok": false,
      "label": "Partly true: This Audi investment proves that Trump's tariffs work."
    }
  ],
  "spread": [
    {
      "account": "@EricLDaugh",
      "platform": "X",
      "postedAt": "Oct 25 2026, 00:17 UTC",
      "note": "The post you checked",
      "url": "https://x.com/EricLDaugh/status/2114149405209018546",
      "evidence": "submitted",
      "isOrigin": true
    },
    {
      "account": "Right Side Broadcasting Network (RSBN)",
      "platform": "Youtube",
      "postedAt": "date unknown",
      "note": "RSBN carried the October 24, 2026 Trump rally in Perry, Georgia live. The submitted video is a short excerpt of the on-stage Audi announcement at that event; an archived transcript of the rally contains the same Döllner remarks.",
      "url": "https://www.youtube.com/live/9eW9_If62pc",
      "evidence": "research",
      "isOrigin": false
    },
    {
      "account": "@Republicans",
      "platform": "X",
      "postedAt": "date unknown",
      "note": "The official Republican account posted the same quoted Audi segment, including Döllner thanking Trump and saying Audi would make its largest premium SUVs in Macon. Contemporary articles reproduced the post and identify it as an @Republicans post, but the status URL and exact timestamp were not recoverable.",
      "url": null,
      "evidence": "research",
      "isOrigin": false
    }
  ],
  "claims": [
    {
      "text": "Audi CEO Gernot Döllner appeared on stage with President Trump at an October 24, 2026 rally in Perry, Georgia, and said Audi planned to produce its biggest, premium SUVs in the Macon-area of Georgia.",
      "verdict": "supported",
      "explanation": "AP reported that Döllner joined Trump on stage at the Perry rally and said the plant would produce Audi's “biggest and most premium SUVs.” Audi and Georgia officials separately confirmed plans for a premium-SUV plant at the Middle Georgia Megasite, which is in Peach County in the Macon-area—not within Macon city itself.",
      "sources": [
        {
          "url": "https://apnews.com/article/audi-georgia-trump-manufacturing-auto-plant-c1d49f2437c1d9cf349af399b8abe3a3",
          "title": null,
          "publisher": "Associated Press",
          "lean": "center"
        },
        {
          "url": "https://georgia.org/press-releases/audi-ag-selects-georgia-invest-4-billion-first-us-manufacturing-facility",
          "title": null,
          "publisher": "Georgia Department of Economic Development",
          "lean": null
        }
      ]
    },
    {
      "text": "Audi confirmed a multi-billion-dollar automobile-manufacturing investment in Georgia.",
      "verdict": "supported",
      "explanation": "Audi's October 25 release says it intends to invest about $4 billion in its first U.S. production site in Georgia, and the Georgia Department of Economic Development likewise says the planned investment is approximately $4 billion. The figure is therefore multi-billion-dollar, although it is a planned investment rather than an already-completed one.",
      "sources": [
        {
          "url": "https://www.audi.com/en/press-releases/audi-to-establish-first-us-production-site-in-georgia-investing-4-billion-and-creating-4500-jobs-18420",
          "title": null,
          "publisher": "Audi",
          "lean": null
        },
        {
          "url": "https://georgia.org/press-releases/audi-ag-selects-georgia-invest-4-billion-first-us-manufacturing-facility",
          "title": null,
          "publisher": "Georgia Department of Economic Development",
          "lean": null
        }
      ]
    },
    {
      "text": "Construction begins next month.",
      "verdict": "refuted",
      "explanation": "The official Audi release says construction is scheduled to begin in 2027, not the next month. Georgia's announcement gives an even later timetable: grading in 2027 and construction in 2028.",
      "sources": [
        {
          "url": "https://www.audi.com/en/press-releases/audi-to-establish-first-us-production-site-in-georgia-investing-4-billion-and-creating-4500-jobs-18420",
          "title": null,
          "publisher": "Audi",
          "lean": null
        },
        {
          "url": "https://georgia.org/press-releases/audi-ag-selects-georgia-invest-4-billion-first-us-manufacturing-facility",
          "title": null,
          "publisher": "Georgia Department of Economic Development",
          "lean": null
        }
      ]
    },
    {
      "text": "This Audi investment proves that Trump's tariffs work.",
      "verdict": "mixed",
      "explanation": "The announcement is real, and Audi says a North American production base would reduce exposure to trade and currency risks. But Audi identified several reasons for selecting Georgia—including its U.S. growth strategy, customer proximity, workforce, site readiness, logistics and supplier base—and neither Audi nor Georgia's announcement attributes the decision solely to tariffs. One planned investment does not by itself establish the broad claim that tariffs “work.”",
      "sources": [
        {
          "url": "https://www.audi.com/en/press-releases/audi-to-establish-first-us-production-site-in-georgia-investing-4-billion-and-creating-4500-jobs-18420",
          "title": null,
          "publisher": "Audi",
          "lean": null
        },
        {
          "url": "https://georgia.org/press-releases/audi-ag-selects-georgia-invest-4-billion-first-us-manufacturing-facility",
          "title": null,
          "publisher": "Georgia Department of Economic Development",
          "lean": null
        }
      ]
    }
  ],
  "signals": {
    "aiGeneratedProbability": 0.2738,
    "aiDetectors": {
      "t0-vision": 0.2738
    },
    "aiReview": 0.2425,
    "aiReviewFrames": [
      0.23,
      0.28,
      0.33,
      0.13
    ],
    "aiReviewModel": "jev-preview",
    "c2pa": "none",
    "originality": "modified-reupload",
    "originUrl": null,
    "skipped": [
      "Published fact-check lookup (no Google Fact Check key)"
    ]
  },
  "sections": [
    {
      "kind": "text",
      "title": "Speech & caption",
      "verdict": "mixed",
      "trustScore": 58,
      "summary": "The post accurately describes a real Audi announcement and the CEO's appearance with Trump, but it gets the construction timing wrong. Its claim that the project proves tariffs work is an unsupported oversimplification of Audi's stated reasons for the investment.",
      "checks": [
        {
          "ok": true,
          "label": "Supported: Audi CEO Gernot Döllner appeared on stage with President Trump at an October 24, 2026 rally in Perry, Georgia, and said Audi planned to produce its biggest, premium SUVs in the Macon-area of Georgia."
        },
        {
          "ok": true,
          "label": "Supported: Audi confirmed a multi-billion-dollar automobile-manufacturing investment in Georgia."
        },
        {
          "ok": false,
          "label": "Contradicted by sources: Construction begins next month."
        },
        {
          "ok": false,
          "label": "Partly true: This Audi investment proves that Trump's tariffs work."
        }
      ]
    },
    {
      "kind": "media",
      "title": "Video",
      "verdict": "edited",
      "trustScore": 50,
      "summary": "The footage comes from President Trump’s October 24, 2026 rally in Perry, Georgia, where Audi CEO Gernot Döllner made the quoted remarks. The submitted X video is a shortened, newly captioned repost; the same segment was also distributed by @Republicans before it was documented in contemporaneous coverage.",
      "checks": [
        {
          "ok": true,
          "label": "No generation artifacts detected (27%)"
        },
        {
          "ok": false,
          "label": "Changed from the original: The full rally footage was cut down to a 92-second excerpt."
        }
      ]
    }
  ],
  "coverage": {
    "query": "Audi Georgia factory Trump Perry",
    "sources": [
      {
        "outlet": "Bloomberg",
        "domain": "bloomberg.com",
        "url": "https://www.bloomberg.com/news/articles/2026-10-24/volkswagen-plans-new-audi-plant-in-georgia-handing-trump-a-win",
        "title": "Volkswagen Plans New Audi Plant in Georgia, Handing Trump a Win",
        "publishedAt": "2026-10-25T11:06:14Z",
        "lean": "lean-left",
        "rating": "table",
        "leanConfidence": null
      },
      {
        "outlet": "The Atlanta Journal-Constitution",
        "domain": "ajc.com",
        "url": "https://www.ajc.com/news/2026/10/audi-to-build-georgia-factory-near-macon/",
        "title": "Audi to build Georgia factory near Macon",
        "publishedAt": "2026-10-24T22:58:56Z",
        "lean": "lean-left",
        "rating": "estimated",
        "leanConfidence": 0.57
      },
      {
        "outlet": "The Wall Street Journal",
        "domain": "wsj.com",
        "url": "https://www.wsj.com/business/autos/trump-announces-audis-first-ever-u-s-factory-in-georgia-ss-tariffs-bite-7e3220fe",
        "title": "Trump Announces Audi’s First-Ever U.S. Factory in Georgia as Tariffs Bite",
        "publishedAt": "2026-10-25T01:03:06Z",
        "lean": "center",
        "rating": "table",
        "leanConfidence": null
      },
      {
        "outlet": "Reuters",
        "domain": "reuters.com",
        "url": "https://www.reuters.com/business/autos-transportation/trump-set-announce-plan-by-audi-build-us-factory-georgia-source-says-2026-10-24/",
        "title": "Trump announces Audi will build $4 billion US factory in Georgia",
        "publishedAt": "2026-10-24T21:31:00Z",
        "lean": "center",
        "rating": "table",
        "leanConfidence": null
      },
      {
        "outlet": "DW",
        "domain": "dw.com",
        "url": "https://www.dw.com/en/trump-announces-audi-will-build-4-billion-factory-in-us/a-79753479",
        "title": "Trump announces Audi will build $4 billion factory in US state of Georgia",
        "publishedAt": "2026-10-25T05:31:18Z",
        "lean": "center",
        "rating": "table",
        "leanConfidence": null
      },
      {
        "outlet": "South China Morning Post",
        "domain": "scmp.com",
        "url": "https://www.scmp.com/news/world/united-states-canada/article/3372051/trump-hails-tariffs-new-us42-billion-audi-plant-georgia",
        "title": "Trump hails tariffs for new US$4.2 billion Audi plant in Georgia",
        "publishedAt": "2026-10-25T04:44:54Z",
        "lean": "center",
        "rating": "estimated",
        "leanConfidence": 0.95
      },
      {
        "outlet": "WKMG",
        "domain": "clickorlando.com",
        "url": "https://www.clickorlando.com/news/politics/2026/10/25/trump-announces-at-a-georgia-campaign-rally-that-audi-will-build-a-new-auto-factory-in-the-state/",
        "title": "Trump announces at a Georgia campaign rally that Audi will build a new auto factory in the state",
        "publishedAt": "2026-10-25T03:58:57Z",
        "lean": "center",
        "rating": "estimated",
        "leanConfidence": 1.0
      },
      {
        "outlet": "KSL",
        "domain": "ksl.com",
        "url": "https://www.ksl.com/article/51640635/trump-announces-audi-will-build-4b-factory-in-georgia",
        "title": "Trump announces Audi will build $4B factory in Georgia",
        "publishedAt": "2026-10-25T02:12:53Z",
        "lean": "center",
        "rating": "estimated",
        "leanConfidence": 1.0
      },
      {
        "outlet": "The Japan Times",
        "domain": "japantimes.co.jp",
        "url": "https://www.japantimes.co.jp/business/2026/10/25/economy/trump-tariffs-audi-factory-election/",
        "title": "Trump defends tariffs at rally as he says Audi to build U.S. plant",
        "publishedAt": "2026-10-25T01:02:00Z",
        "lean": "center",
        "rating": "estimated",
        "leanConfidence": 1.0
      },
      {
        "outlet": "Kansas City Star",
        "domain": "kansascity.com",
        "url": "https://www.kansascity.com/news/business/article317765436.html",
        "title": "Trump set to announce Audi plan to build US factory in Georgia, source says",
        "publishedAt": "2026-10-24T21:33:00Z",
        "lean": "center",
        "rating": "estimated",
        "leanConfidence": 0.68
      },
      {
        "outlet": "41NBC News",
        "domain": "41nbc.com",
        "url": "https://www.41nbc.com/live-updates-president-donald-trump-holds-rally-in-perry-ahead-of-election-day/",
        "title": "Live updates: President Donald Trump holds rally in Perry ahead of Election Day",
        "publishedAt": "2026-10-25T01:16:45Z",
        "lean": "center",
        "rating": "estimated",
        "leanConfidence": 0.99
      },
      {
        "outlet": "Traverse City Record-Eagle",
        "domain": "record-eagle.com",
        "url": "https://www.record-eagle.com/ap/business/trump-announces-at-a-georgia-campaign-rally-that-audi-will-build-a-new-auto-factory/article_6fa0be22-40ee-5a78-8024-139603c4b611.html",
        "title": "Trump announces at a Georgia campaign rally that Audi will build a new auto factory in the state",
        "publishedAt": "2026-10-25T02:22:23Z",
        "lean": "center",
        "rating": "estimated",
        "leanConfidence": 0.99
      },
      {
        "outlet": "Associated Press",
        "domain": "apnews.com",
        "url": "https://apnews.com/article/audi-georgia-trump-manufacturing-auto-plant-c1d49f2437c1d9cf349af399b8abe3a3",
        "title": null,
        "publishedAt": null,
        "lean": "center",
        "rating": "table",
        "leanConfidence": null
      },
      {
        "outlet": "WGXA",
        "domain": "wgxa.tv",
        "url": "https://wgxa.tv/news/local/president-trump-audi-announce-plans-for-macon-plant",
        "title": "President Trump, Audi, announce plans for Macon plant",
        "publishedAt": "2026-10-25T02:29:46Z",
        "lean": "lean-right",
        "rating": "estimated",
        "leanConfidence": 1.0
      },
      {
        "outlet": "Fox Business",
        "domain": "foxbusiness.com",
        "url": "https://www.foxbusiness.com/video/6407362766112",
        "title": "Trump announces $4.2B Audi manufacturing investment in Georgia, touts 30,000 auto jobs",
        "publishedAt": "2026-10-25T02:07:02Z",
        "lean": "lean-right",
        "rating": "table",
        "leanConfidence": null
      },
      {
        "outlet": "NTD News",
        "domain": "ntd.com",
        "url": "https://www.ntd.com/trump-announces-4-2-billion-audi-auto-manufacturing-investment-in-georgia_1181312.html",
        "title": "Trump Announces $4.2 Billion Audi Auto Manufacturing Investment in Georgia",
        "publishedAt": "2026-10-25T10:57:43Z",
        "lean": "lean-right",
        "rating": "estimated",
        "leanConfidence": 0.71
      },
      {
        "outlet": "Houston Chronicle",
        "domain": "houstonchronicle.com",
        "url": "https://www.houstonchronicle.com/news/politics/article/trump-announces-at-a-georgia-campaign-rally-that-22492999.php",
        "title": "Trump announces at a Georgia campaign rally that Audi will build a new auto factory in the state",
        "publishedAt": "2026-10-25T08:38:10Z",
        "lean": null,
        "rating": null,
        "leanConfidence": 0.32
      },
      {
        "outlet": "Bozeman Daily Chronicle",
        "domain": "bozemandailychronicle.com",
        "url": "https://www.bozemandailychronicle.com/wire/business/trump-announces-at-a-georgia-campaign-rally-that-audi-will-build-a-new-auto-factory/article_f4e64e37-b294-58b7-81cc-288f9382c73e.html",
        "title": "Trump announces at a Georgia campaign rally that Audi will build a new auto factory in the state",
        "publishedAt": "2026-10-25T02:06:08Z",
        "lean": null,
        "rating": null,
        "leanConfidence": 0.38
      },
      {
        "outlet": "The Business Times",
        "domain": "businesstimes.com.sg",
        "url": "https://www.businesstimes.com.sg/companies-markets/audi-build-multibillion-dollar-us-car-factory-trump",
        "title": "Audi to build multibillion-dollar US car factory: Trump",
        "publishedAt": "2026-10-25T12:42:00Z",
        "lean": null,
        "rating": null,
        "leanConfidence": 1.0
      },
      {
        "outlet": "BigGo Finance",
        "domain": "biggo.com",
        "url": "https://finance.biggo.com/news/d91856c0-910a-4a1a-a215-c15f4a58adac",
        "title": "Trump Announces $4 Billion Audi Plant in Georgia as Tariff Fight Intensifies",
        "publishedAt": "2026-10-25T04:05:00Z",
        "lean": null,
        "rating": null,
        "leanConfidence": 1.0
      },
      {
        "outlet": "KSAT",
        "domain": "ksat.com",
        "url": "https://www.ksat.com/gallery/news/2026/10/25/trump-announces-at-a-georgia-campaign-rally-that-audi-will-build-a-new-auto-factory-in-the-state/",
        "title": "Trump announces at a Georgia campaign rally that Audi will build a new auto factory in the state",
        "publishedAt": "2026-10-25T02:22:38Z",
        "lean": null,
        "rating": null,
        "leanConfidence": 1.0
      },
      {
        "outlet": "Chosunbiz",
        "domain": "chosun.com",
        "url": "https://biz.chosun.com/en/en-international/2026/10/25/CNTHNCLUJZDKHNKAU3PHF2JRCI/",
        "title": "Trump touts $4.2B Audi Georgia plant to sway midterms, boost SUV output - CHOSUNBIZ",
        "publishedAt": "2026-10-25T02:01:00Z",
        "lean": null,
        "rating": null,
        "leanConfidence": 1.0
      },
      {
        "outlet": "Udaipur Kiran",
        "domain": "udaipurkiran.com",
        "url": "https://udaipurkiran.com/trump-announces-audis-4-billion-factory-in-georgia-at-rally/",
        "title": "Trump Announces Audi’s $4 Billion Factory in Georgia at Rally",
        "publishedAt": "2026-10-25T10:37:01Z",
        "lean": null,
        "rating": null,
        "leanConfidence": 1.0
      }
    ],
    "left": 2,
    "center": 11,
    "right": 3,
    "unrated": 7,
    "leftPct": 12,
    "centerPct": 69,
    "rightPct": 19,
    "blindspot": null,
    "subjectOutlet": null,
    "subjectLean": null
  },
  "preview": {
    "kind": "video",
    "image": "/sample/preview.jpg",
    "remoteImage": "https://pbs.twimg.com/amplify_video_thumb/2114149115592372224/img/MmJH-EoZjcR57wax.jpg?name=orig",
    "mediaPath": "/sample/video.mp4",
    "mediaType": "video",
    "frames": [
      "/sample/frame-1.jpg",
      "/sample/frame-2.jpg",
      "/sample/frame-3.jpg",
      "/sample/frame-4.jpg",
      "/sample/frame-5.jpg",
      "/sample/frame-6.jpg"
    ],
    "title": "🚨 WOW! The CEO of AUDI just came on stage with President Trump to confirm a multi-BILLION dollar aut",
    "site": "x.com",
    "text": "🚨 WOW! The CEO of AUDI just came on stage with President Trump to confirm a multi-BILLION dollar auto manufacturing investment in Georgia\n\n\"We are planning to bring are biggest and most premium SUVs, and produce them here in MACON, GEORGIA.\"\n\nCROWD: \"TRUMP! TRUMP! TRUMP!\"\n\nThis is monumental! 🇺🇸\n\nThat thing the Democrats and \"experts\" said was impossible, HAPPENED AGAIN\n\nTrump says construction begins next month. TARIFFS WORK\n\n🚨 WOW! The CEO of AUDI just came on stage with President Trump to confirm a multi-BILLION dollar auto manufacturing investment in Georgia  \"We are planning to bring are biggest and most premium SUVs, and produce them here in MACON, GEORGIA.\"  CROWD: \"TRUMP! TRUMP! TRUMP!\"  This https://t.co/YvT7LtGSdd",
    "account": "@EricLDaugh",
    "accountUrl": "https://x.com/EricLDaugh",
    "postedAt": "2026-10-25T00:17:51Z",
    "duration": 92.366,
    "linkedUrls": [
      "https://t.co/YvT7LtGSdd"
    ]
  },
  "error": null,
  "steps": [
    {
      "id": "ingest",
      "label": "Fetching the content",
      "status": "complete",
      "detail": "Video from x.com · 1:32 · 115 words",
      "startedAt": "2026-10-25T13:35:09.078151Z",
      "endedAt": "2026-10-25T13:35:14.405296Z"
    },
    {
      "id": "media",
      "label": "Fingerprinting media",
      "status": "complete",
      "detail": "16 keyframes",
      "startedAt": "2026-10-25T13:35:14.424768Z",
      "endedAt": "2026-10-25T13:35:15.468031Z"
    },
    {
      "id": "provenance",
      "label": "Tracing where it came from",
      "status": "complete",
      "detail": "Modified copy of an earlier post · 3 posts in the chain",
      "startedAt": "2026-10-25T13:35:15.486007Z",
      "endedAt": "2026-10-25T13:35:51.349595Z"
    },
    {
      "id": "ai",
      "label": "Checking for AI generation",
      "status": "complete",
      "detail": "27% likely AI-generated · t0-vision · visual review 24%",
      "startedAt": "2026-10-25T13:35:15.486947Z",
      "endedAt": "2026-10-25T13:35:16.431673Z"
    },
    {
      "id": "factcheck",
      "label": "Fact-checking claims",
      "status": "complete",
      "detail": "4 claims checked",
      "startedAt": "2026-10-25T13:35:51.368331Z",
      "endedAt": "2026-10-25T13:36:06.363380Z"
    },
    {
      "id": "coverage",
      "label": "Comparing news coverage",
      "status": "complete",
      "detail": "23 outlets covering it",
      "startedAt": "2026-10-25T13:36:06.379704Z",
      "endedAt": "2026-10-25T13:36:52.071195Z"
    },
    {
      "id": "score",
      "label": "Scoring trust",
      "status": "complete",
      "detail": "Edited · trust 48",
      "startedAt": "2026-10-25T13:36:52.102257Z",
      "endedAt": "2026-10-25T13:36:52.156385Z"
    }
  ]
}
