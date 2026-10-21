---
title: Introducing trust0-vision-1
description: Our AI-image detector, built for images as people actually share them: resized, recompressed and reposted. Here is how we measured it, and where it still falls short.
date: 2026-10-21
author: The trust0 team
tag: Research
---

Most AI-image detectors are measured on clean files straight out of a dataset. Nobody sees images that way. By the time a picture reaches you it has been resized by a platform, recompressed as a JPEG, screenshotted and reposted, sometimes several times. That process wipes out much of the fine detail detectors rely on.

Today we're releasing **trust0-vision-1**, the image model behind trust0's AI-generated media check. We built it for that messy middle ground. On our benchmark of 1,380 images it reaches an AUC of 0.98 on social-media-compressed images, catches 84% of AI images, and flags 6% of real photos, while running in about 21 ms per image on a laptop GPU.

```chart
scorecard condition=social
```

This post explains how we tested it, how it compares with open-source detectors, how we trained it, and the limits you should keep in mind before trusting any detector, including ours.

## Why compression matters

A detector looks for traces a generator leaves behind: texture statistics, frequency artifacts and the regularities of upsampling layers. Most of those traces live in the high frequencies, the exact information JPEG compression and downscaling throw away. Earlier research showed that detectors trained with blur and JPEG augmentation hold up far better than those trained on pristine images[^wang2020]. It also showed that generalising to generators a detector has never seen is the harder problem[^ojha2023].

There is a second, subtler issue. In several public datasets real photos are JPEGs and AI images are PNGs. A model can learn "PNG means AI" and look excellent on paper while learning nothing about generators. Our benchmark removes that shortcut by putting every image through the same recompression.

The cost of getting this wrong is not symmetric. Missing an AI image is bad. Telling someone their real photo is fake is worse, and for a journalist or a person reporting abuse it can be harmful. So we track false alarms as closely as detections.

## How we test

The test set has 1,380 images: 450 real and 930 AI-generated from 11 generators.

| Slice | Source | Images |
|---|---|---|
| Real photos | GenImage (ImageNet subset) | 300 |
| Real faces | FFHQ | 150 |
| FLUX.2 [dev] | Kempner Institute synthetic set | 150 |
| FLUX.1 [dev] faces | FFHQ-style FLUX training faces | 150 |
| Midjourney v6 | Photoroom recap set | 150 |
| FLUX.1 [dev] | Public FLUX.1 [dev] samples | 60 |
| Midjourney v5, SD 1.5, Wukong, GLIDE, BigGAN, VQDM, ADM | GenImage | 60 each |

Older generators come from GenImage[^genimage], real faces from FFHQ[^ffhq], and the newer generators from public Hugging Face datasets[^datasets]. None of these images were used for training: anything identical to a test image was removed from the training data before we started.

Each image is scored three ways:

```chart
conditions
```

We report four numbers per model and condition:

- **ROC AUC**, the probability that a random AI image scores higher than a random real one[^hanley]. It doesn't depend on a threshold, so it measures how well a model *ranks* images[^fawcett].
- **AI images caught**: the share of AI images scored above 0.5.
- **Real photos flagged**: the share of real photos scored above 0.5. This is the false-alarm rate, and lower is better.
- **Accuracy** at the same 0.5 threshold.

We compare against three open-source detectors from Hugging Face: Smogy[^smogy], Ateeqq[^ateeqq] and umm-maybe[^ummmaybe]. Every model ran on the same images, at the same threshold, on the same GPU.

## Results

```chart
auc
```

trust0-vision-1 has the highest AUC in every condition: 0.94 on the original files, 0.98 after social compression and 0.99 as reposts. The other detectors stay flat or get worse as images are degraded. Smogy is the clearest case: it matches the field on original files at 0.84, then drops to 0.69 once images are compressed.

Our model scores *better* on compressed images than on the originals. That is by design: every training image was re-encoded as a JPEG and then randomly degraded further, so a pristine full-resolution PNG is actually less familiar to it than a recompressed copy.

AUC alone can hide a model that catches everything by accusing everything. The next chart shows both sides of the trade-off at once.

```chart
tradeoff
```

Smogy catches the most AI images on reposts, at 82%, but only by flagging 34% of real photos and 94% of real faces. Its high detection rate is mostly a tendency to say "AI" regardless. trust0-vision-1 stays in the top-left corner in all three conditions.

On reposts its catch rate at the 0.5 threshold falls to 73%, while false alarms drop to 0.3%. The model becomes more cautious on heavily degraded images, yet its ranking (AUC 0.99) gets better, so a lower threshold for repost-quality images would recover detections. We would rather ship the cautious default and tune from real-world data than ship a model that accuses people.

Here is the social condition in full, since it is closest to what people actually share:

| Model | AUC | Accuracy | AI caught | Real photos flagged | Real faces flagged |
|---|---|---|---|---|---|
| **trust0-vision-1** | **0.978** | **88.1%** | **84.4%** | **6.3%** | **0%** |
| Smogy | 0.690 | 69.4% | 78.9% | 31.0% | 89% |
| Ateeqq | 0.703 | 64.9% | 56.0% | 21.3% | 7% |
| umm-maybe | 0.612 | 50.5% | 39.6% | 12.3% | 56% |

## Generator by generator

```chart
generators condition=social
```

On the generators that matter most today, trust0-vision-1 catches almost everything: 97% of FLUX.2 [dev], 100% of FLUX.1 [dev], 100% of Midjourney v5 and v6, and 93% of FLUX.1 faces. Faces are the hardest case to get right in both directions. The model catches 93% of AI faces and flagged none of the 150 real FFHQ faces in the social condition.

Its weak spots are older research generators. ADM and VQDM images are caught only 15–27% of the time, and BigGAN drops from 77% to 27% on the uncompressed originals. These models date from 2021–2022 and rarely appear in what people share today. Still, they show that trust0-vision-1 has not learned a single universal signature of "generated". It has learned the generators it was trained on very well.

## How we trained it

trust0-vision-1 is an image classifier fine-tuned for one job: telling camera photos from generated images after they have been through social media.

- **Data.** About 408 GB of raw images from five public datasets: GenImage, FLUX.2 [dev], FLUX.1 faces, real FFHQ faces and Midjourney v6. They were converted to roughly 146 GB of training images. Real faces were included on purpose, so the model doesn't learn that "face" means AI.
- **No format shortcuts.** Every image, real or AI, is resized to a longest side of 512 px and saved as a JPEG at quality 95 before training, so file format and size carry no label information. 2% is held out for validation.
- **Balanced batches.** The raw mix is mostly AI, so each batch is sampled 50/50 real and AI.
- **Social-media augmentation.** During training, images are randomly recompressed, downscaled, cropped and flipped, so the model sees the kinds of damage platforms cause[^wang2020].
- **Model selection.** Five epochs on a single 16 GB laptop GPU. After every epoch we score validation and test AUC under all three conditions and keep the checkpoint with the best validation AUC.

## How trust0 uses it

trust0-vision-1 is one signal in a check, never the verdict on its own. When you check a post, trust0 samples up to eight keyframes and scores each one. The mean score is then combined with other evidence:

- a second detector, when one is configured
- an independent visual review that judges whether each frame came from a camera, an AI generator or design tools
- content credentials such as C2PA "trained algorithmic media" markers[^c2pa]
- provenance: whether the same image was found earlier, and where

trust0 only says **likely AI** when two signals agree. That means a detector at 70% or more plus a second detector or the visual review at 50% or more, or a single detector at 90% or more with nothing contradicting it. When the detector and the review disagree, the verdict stays **unverified** and both numbers are shown. A 6% false-alarm rate is low for this field, but it still means about one real photo in sixteen, which is why the model never accuses anyone on its own.

## Limitations

We'd rather you hear these from us.

- **The test set is small.** With 60 images per older generator, a single number can move by about 10 points by chance. Treat differences of a few points as noise.
- **Generators we trained on.** trust0-vision-1 was trained on the same generator families as the test set, on different images. The open-source detectors may not have seen all of them. Part of the gap reflects that, and newer, unseen generators will be harder.
- **The real photos are narrow.** They are ImageNet photos and FFHQ faces. There are no phone snapshots, screenshots, memes or heavily edited photos, which are exactly where false alarms tend to appear.
- **Simulated platforms.** Our "social" and "repost" conditions approximate platform processing. Real pipelines vary by platform, upload path and time.
- **One threshold.** Every model is scored at 0.5. Tuning a threshold per model or condition would change the catch and false-alarm numbers, though not the AUC.

## What's next

- **A benchmark from real posts.** Images collected as they appear on X, Instagram, TikTok and Reddit, labelled by provenance rather than by dataset.
- **New generators as they ship,** added to both training and testing.
- **Calibrated scores,** so a 0.8 from trust0-vision-1 means about an 80% chance the image is AI, under each condition.
- **Video,** scored as a whole rather than frame by frame.

trust0-vision-1 powers the AI-image check in trust0 today, across the browser extension, the studio and the API. If you have images it gets wrong, we want them. Send them our way and they will go into the next benchmark.

[^wang2020]: Sheng-Yu Wang, Oliver Wang, Richard Zhang, Andrew Owens and Alexei A. Efros. [CNN-generated images are surprisingly easy to spot… for now](https://arxiv.org/abs/1912.11035). CVPR 2020. Shows that blur and JPEG augmentation improve robustness and generalisation.
[^ojha2023]: Utkarsh Ojha, Yuheng Li and Yong Jae Lee. [Towards Universal Fake Image Detectors that Generalize Across Generative Models](https://arxiv.org/abs/2302.10174). CVPR 2023.
[^genimage]: Mingjian Zhu et al. [GenImage: A Million-Scale Benchmark for Detecting AI-Generated Image](https://arxiv.org/abs/2306.08571). NeurIPS 2023 Datasets and Benchmarks. Real images are drawn from ImageNet.
[^ffhq]: Tero Karras, Samuli Laine and Timo Aila. [A Style-Based Generator Architecture for Generative Adversarial Networks](https://arxiv.org/abs/1812.04948). CVPR 2019. Introduces the FFHQ face dataset.
[^datasets]: Hugging Face datasets: [KempnerInstituteAI/flux.2-dev-synthetic-2M](https://huggingface.co/datasets/KempnerInstituteAI/flux.2-dev-synthetic-2M), [Photoroom/midjourney-v6-recap](https://huggingface.co/datasets/Photoroom/midjourney-v6-recap), [bitmind/ffhq-256](https://huggingface.co/datasets/bitmind/ffhq-256), [bitmind/ffhq-256___FLUX.1-dev_training_faces](https://huggingface.co/datasets/bitmind/ffhq-256___FLUX.1-dev_training_faces) and [Sarim-Hash/flux_dev_and_realism_flux](https://huggingface.co/datasets/Sarim-Hash/flux_dev_and_realism_flux).
[^hanley]: James A. Hanley and Barbara J. McNeil. [The meaning and use of the area under a receiver operating characteristic (ROC) curve](https://doi.org/10.1148/radiology.143.1.7063747). Radiology 143(1), 1982.
[^fawcett]: Tom Fawcett. [An introduction to ROC analysis](https://doi.org/10.1016/j.patrec.2005.10.010). Pattern Recognition Letters 27(8), 2006.
[^smogy]: [Smogy/SMOGY-Ai-images-detector](https://huggingface.co/Smogy/SMOGY-Ai-images-detector) on Hugging Face.
[^ateeqq]: [Ateeqq/ai-vs-human-image-detector](https://huggingface.co/Ateeqq/ai-vs-human-image-detector) on Hugging Face.
[^ummmaybe]: [umm-maybe/AI-image-detector](https://huggingface.co/umm-maybe/AI-image-detector) on Hugging Face.
[^c2pa]: Coalition for Content Provenance and Authenticity. [C2PA technical specification](https://c2pa.org/specifications/).
