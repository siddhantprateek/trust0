---
title: Two signals, not one: how trust0 uses Jev to make careful calls
description: Where trust0 hands small, high-stakes decisions to TypeSafe's Jev: rating news outlets, picking real coverage, and a second opinion before calling a video AI.
date: 2026-10-16
author: The trust0 team
tag: Engineering
---

trust0 checks content you find online: where it came from, whether its claims hold up, who else is covering the story, and whether a picture or video was made by an AI. Most of that is research, done by a large language model that searches the web and reads sources.

Some of it isn't research. It's a single, narrow call, the kind where getting it wrong does real damage:

- Is this outlet left, center or right?
- Is this article about the same story, or just a page that shares a keyword?
- Did this video come from a camera?

For those calls we use Jev, TypeSafe's first "System One" model[^jev]. This post covers where we use it, why, and what we measured, including a mistake that made us change how trust0 decides something is AI-generated.

## What Jev is

TypeSafe describes System One models as built to make fast, structured decisions that software can use directly[^systemone]. You give Jev a *state* (text or JSON, and now images as a preview) and typed questions about it. It doesn't write replies or explain its reasoning. It returns a typed answer with probabilities[^primitives]:

- **Choice** picks one option from your list and returns the choice, a probability for every option, and a confidence.
- **Score** places the state on ordered levels of a rubric you write, and returns the score, its probabilities and a confidence.
- **Noul** returns the probability (0 to 1) that a statement about the state is true.
- **Box**, new in Jev 1.14 and still a preview, returns the smallest rectangle around a target in an image, plus a confidence[^box].

Several questions can go in one request. Each is evaluated on its own against the same state, so adding more questions doesn't muddy the others.

**Confidence** comes with Choice and Score answers, not with Noul. For a Choice it is `(p_max − 1/n) / (1 − 1/n)`: 1 when all the probability is on one option, 0 when it is spread evenly across all *n*[^confidence]. It describes how settled the answer is, not whether it is right. TypeSafe trains Jev for calibrated probabilities, but calibration is measured across groups of predictions and doesn't guarantee any single answer[^systemone]. So we pick our thresholds from our own data.

The rule we follow everywhere: **the model judges, code decides.** Jev answers one narrow question; our code reads the numbers and decides what to show.

```chart
jev-pipeline
```

## 1. Rating news outlets nobody has rated

Coverage & bias shows which outlets are covering a story and how that coverage splits Left / Center / Right. A claim is true or false whoever reports it, so we never rate facts, only outlets.

Well-known outlets come from a curated table that follows public media-bias raters: AllSides[^allsides], Ad Fontes Media[^adfontes] and Media Bias/Fact Check[^mbfc]. The long tail of regional papers, foreign outlets and new sites has to be estimated. We split that into two steps:

1. **A language model researches the outlet** and writes up what the raters say, for example: *"AllSides rates its news coverage Lean Right. Media Bias/Fact Check rates it Right-Center."*
2. **Jev reads only that write-up** and picks one of `unrated`, `left`, `lean-left`, `center`, `lean-right`, `right`.

If Jev is sure, the outlet shows that lean with an "est." marker, and hovering it shows the confidence. If Jev isn't sure, or the raters disagree, the outlet stays **unrated** and doesn't tilt the bar. This is TypeSafe's confidence-gated routing pattern: act on a confident answer, fall back on an unsure one[^routing].

```chart
jev-lean
```

Three details we'd recommend to anyone building something similar:

- **Don't show the second model the first model's answer.** If Jev saw the researcher's label, its probabilities would partly measure "do I agree with what I was handed", and its confidence would be inflated by an echo.
- **Give it a way to say "I don't know", and put it first.** TypeSafe's notes on Jev's known weaknesses say it leans toward the option that comes first in a Choice[^jagged]. In a list that starts with `left`, that bias would push toward a political label. Starting with `unrated` points it at abstaining, which is the safe way to be wrong.
- **Use the raters' own words in the options.** AllSides says "Lean Right", Media Bias/Fact Check says "Right-Center", Ad Fontes says "Skews Right". Listing them in each option means nothing gets lost in translation.

## 2. Keeping coverage about the story

A news search for a loose phrase returns more than the story. When someone checked a company's launch video, the search for its campaign name came back with stock analysis, a tool comparison and a programming course, and all of them showed up as "outlets covering this".

Two changes fixed it:

- **Only news stories get a coverage card.** Ads, product launches, tutorials and personal posts don't.
- **Every candidate article is checked before it counts.** Up to 60 results go to Jev in a single request, with one Noul per article: *is this a news report about the same specific event?* Anything below 0.5 is dropped.

On the launch video, all eleven off-topic results were dropped. On a protest story we'd checked before, all thirty genuine articles stayed.

## 3. A second opinion before we say "AI-generated"

This is the one that mattered most.

A user ran trust0 on an Instagram reel: a person standing at a fence above a valley full of morning cloud, somewhere in Meghalaya. trust0 said **likely AI-generated**. It wasn't.

Our AI-image detector had scored the video's frames at 0.72 on average, just past our 0.70 line, and that one number decided the verdict. Looking back through recent checks, a live-action dance commercial with real, credited dancers had scored 0.97. Detectors learn from photos and generator outputs; soft, misty landscapes and polished studio footage don't look like either, and the detector guessed.

For a product whose whole job is telling people what's real, calling a real video fake is the worst mistake we can make. So we changed the rule: **"likely AI" now needs two independent signals that agree.**

### Jev looks at the frames

Jev's image models can now take images directly, as a TypeSafe preview feature[^images]. We send it four frames from each video and ask one question per frame: how was this made?

- **camera**: a real camera, even if compressed, filtered, colour graded or with captions on top;
- **ai-generated**: an AI image or video generator;
- **graphics**: made by people with design or 3D tools.

Then the verdict rules:

- The detector says AI **and** Jev agrees: **likely AI-generated**.
- The detector says AI but Jev says camera: **unverified**, and the report shows both numbers, so you can see the disagreement instead of a confident wrong answer.
- One detector alone has to be very sure (90% or more) before we call something AI.
- Jev alone can never call something AI.

### What we measured

Before building on it, we tested Jev on images whose answer we know: 20 AI images (Midjourney, FLUX, Stable Diffusion) and 20 real photos, plus frames from three real reels.

| | Jev said "ai-generated" | Highest P(ai-generated) on real photos |
|---|---|---|
| AI images | 14 of 20 | — |
| Real photos | 0 of 20 | 0.35 |

Jev never called a real photo AI in this sample, but it missed 6 of the 20 fakes. That's exactly the profile you want in a second opinion that can only confirm or question the detector, and why it never decides on its own.

We also tried the obvious yes/no question, "was this made by an AI generator?", and dropped it: it put 13 of the 20 real photos above 50%. Asking *how* an image was made, with a real alternative for each answer, worked far better than asking *whether* it was AI.

Run end to end through trust0:

| | Detector | Jev | Before | Now |
|---|---|---|---|---|
| Meghalaya landscape reel (real) | 72% | 19% | likely AI | **unverified** |
| Midjourney image (AI) | 100% | 91% | likely AI | likely AI |
| FLUX image (AI) | 100% | 89% | likely AI | likely AI |
| Dance commercial (real) | 97% | 60% | likely AI | likely AI |

The reel that started this is fixed, and real AI images are still caught. Here is the whole rule as a map, with those four checks on it:

```chart
jev-verdicts
```

### The one we still get wrong

The dance commercial is still flagged. It's real footage, but shot in a stark white studio with uniform styling and an app's interface drawn around it, and Jev is fooled the same way the detector is. We could raise the bar so Jev has to be more certain to agree, which would clear this video. But on our test set that would also have let three real fakes through unflagged, so we didn't.

The sample is small and we're not presenting it as a benchmark. The honest fix is more labelled data from the content people actually check (reels, ads, screen recordings), and that's what we're building next.

## What Jev doesn't do in trust0

- **It doesn't decide what's true.** Fact-checking needs multi-step research with cited sources, and that stays with the research model.
- **It doesn't set the trust score.** The trust score is a set of transparent rules where every point matches a check you can see.
- **It isn't our AI detector.** It's a second opinion that can confirm or question the detector, never a replacement.

## What's next

- **Show the evidence.** Jev 1.14's new Box question can point to *where* in an image something looks off: a garbled sign, a strange hand. "Likely AI" could come with a crop you can see for yourself. A Box answer is always a box, even when the target isn't there, so we'd pair each one with a Noul asking whether the target exists[^box].
- **Tune on real reels.** A labelled set of the videos people actually check, to set our thresholds from data.
- **Match against originals.** When a reverse search finds candidate originals, ask Jev which one shows the same scene, alongside our perceptual hashes.

[^jev]: TypeSafe. [Introduction to Jev](https://docs.typesafe.ai/introduction).
[^systemone]: TypeSafe. [System One](https://docs.typesafe.ai/concepts/system-one): what System One models are, and how their probabilities are calibrated across groups of predictions.
[^primitives]: TypeSafe. [Primitives (questions)](https://docs.typesafe.ai/primitives), with pages for [Choice](https://docs.typesafe.ai/primitives/choice), [Score](https://docs.typesafe.ai/primitives/score) and [Noul](https://docs.typesafe.ai/primitives/noul).
[^box]: TypeSafe. [Box](https://docs.typesafe.ai/primitives/box). Requires Jev 1.14; there is no "not found" answer, so presence should be checked with a Noul.
[^confidence]: TypeSafe. [Confidence](https://docs.typesafe.ai/confidence): the Choice and Score formulas, and why Noul answers have no confidence field.
[^routing]: TypeSafe. [Confidence-gated routing](https://docs.typesafe.ai/patterns/confidence-routing).
[^jagged]: TypeSafe. [Jev 1.13 jaggedness](https://docs.typesafe.ai/model-jaggedness/jev-1.13): known weak spots, including first-option bias in Choice, compound questions, and long or noisy state.
[^allsides]: [AllSides media bias ratings](https://www.allsides.com/media-bias/ratings).
[^adfontes]: [Ad Fontes Media](https://adfontesmedia.com/) Media Bias Chart.
[^mbfc]: [Media Bias/Fact Check](https://mediabiasfactcheck.com/).
[^images]: TypeSafe. [Images](https://docs.typesafe.ai/images). Jev 1.13 and 1.14 accept PNG and JPEG images behind the `TypeSafe-Danger-Zone-Images` header. TypeSafe calls the feature "Dreamer-ready", not yet production quality, and says formats, answers and limits can change between releases. That's why trust0 pins the model version and keeps every raw answer for recalibration.
