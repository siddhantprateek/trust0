# Open-source AI-image detector test

Scores open-source AI-image detectors from Hugging Face on a small labelled set, to see whether any could run alongside (or later replace) Hive.

```bash
python -m venv .venv
.venv/Scripts/pip install torch torchvision --index-url https://download.pytorch.org/whl/cu126
.venv/Scripts/pip install transformers accelerate pillow scikit-learn timm sentencepiece protobuf
python fetch_data.py            # ~200 images into data/, labels in manifest.csv
.venv/Scripts/python run_eval.py
```

If `import torch` fails with "An Application Control policy has blocked this file", Windows Smart App Control is
refusing torch's unsigned DLLs. Run it under WSL instead; the venv goes in the Linux home dir, where `eval.sh` finds it:

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
uv venv --python 3.12 ~/venvs/ai-detect
uv pip install --python ~/venvs/ai-detect/bin/python torch torchvision --index-url https://download.pytorch.org/whl/cu126
uv pip install --python ~/venvs/ai-detect/bin/python transformers accelerate pillow scikit-learn timm sentencepiece protobuf
./eval.sh
```

## Test set

| Slice | Source | Count |
|---|---|---|
| Real photos | GenImage (ImageNet) | 60 |
| Older generators: ADM, BigGAN, GLIDE, Midjourney v5, SD 1.5, VQDM, Wukong | GenImage | 12 each |
| FLUX.1-dev, photorealistic | `Sarim-Hash/flux_dev_and_realism_flux` | 20 |
| FLUX.1-dev faces | `bitmind/ffhq-256___FLUX.1-dev_training_faces` | 20 |
| Midjourney v6 | `Photoroom/midjourney-v6-recap` | 20 |

Every image is scored three ways:
- **original**: as downloaded
- **social**: longest side 1080 px, JPEG quality 75, roughly what X and Instagram do on upload
- **repost**: the social version shrunk to 720 px and saved again at JPEG quality 60, like a screenshot of a repost

The re-encoded conditions also remove a known shortcut in GenImage: its real images are JPEGs and its fakes are PNGs, so a detector can score well on the originals just by noticing compression.

## Caveats

This is a quick sanity check, not a benchmark. The set is small (a few points of accuracy is noise), and the real photos are all ImageNet (no real faces, screenshots or phone photos). For decisions, build a test set from real posts as they appear on the platforms trust0 covers.

## Results (2026-10-05, 1,380 images, RTX 3080 Laptop)

450 real (300 ImageNet photos + 150 FFHQ faces) and 930 AI from 11 generators. AUC: 0.5 = coin toss, 1.0 = perfect. "Caught" and "flagged" use a 0.5 threshold.

| Model | AUC original / social / repost | AI caught (social) | Real flagged (social) | ms/img |
|---|---|---|---|---|
| umm-maybe/AI-image-detector | 0.60 / 0.61 / 0.62 | 40% | 12% | 9 |
| Ateeqq/ai-vs-human-image-detector | 0.70 / 0.70 / 0.77 | 56% | 21% | 8 |
| **haywoodsloan/ai-image-detector-deploy** | **0.83 / 0.83 / 0.84** | 50% | **5%** | 22 |
| Smogy/SMOGY-Ai-images-detector | 0.84 / 0.69 / 0.68 | 79% | 31% | 9 |

Detection rate by generator, social condition. The **Real faces** row is the share of real FFHQ faces wrongly flagged as AI (lower is better):

| Generator | umm-maybe | Ateeqq | haywoodsloan | Smogy |
|---|---|---|---|---|
| FLUX.2-dev | 22% | **81%** | 51% | 64% |
| FLUX.1-dev | 25% | **95%** | 88% | 90% |
| FLUX.1-dev faces | 59% | 76% | 67% | **94%** |
| Midjourney v6 | 11% | 63% | **81%** | 71% |
| Midjourney v5 | 22% | 58% | **68%** | 58% |
| SD 1.5 | 48% | 50% | 43% | **83%** |
| Older (ADM, BigGAN, GLIDE, VQDM, Wukong) | 42–68% | 0–67% | 0–67% | **77–95%** |
| **Real faces (false alarms)** | 56% | 7% | **5%** | 89% |

Takeaways:
- **haywoodsloan** is the only model that holds up across all three conditions and rarely accuses real photos or faces. It misses many older-generator images and half of FLUX.2.
- **Smogy** catches the most AI images, but calls 89% of real faces AI and degrades sharply once images are compressed. Its high "caught" rate is largely "flag everything".
- **Ateeqq** is strongest on Flux, weak on older generators.
- **umm-maybe** is close to a coin toss.

## Training t0-vision (fine-tune on ~765 GB)

Our detector is called **t0-vision**: `haywoodsloan/ai-image-detector-deploy` fine-tuned on the sources below. The name and checkpoint folder are set in `sources.py`. Step-by-step guide with a diagram: [docs/training.md](docs/training.md).

Run from this folder. Each step is resumable; stop with Ctrl+C and rerun the same command to continue.

```powershell
# 1. See what will be downloaded (which shards, how many GB per source)
.venv\Scripts\python download_data.py --dry-run

# 2. Download raw shards (~765 GB: GenImage/FLUX.2/faces to D:\trust0-data\raw, Midjourney v6 to C:\trust0-data\raw)
.venv\Scripts\python download_data.py            # or one source: download_data.py flux2

# 3. Convert to 512 px JPEGs + labels (~80 GB in C:\trust0-data\prepared), excluding the 1,380 test images
.venv\Scripts\python prepare_data.py

# 4. Quick baseline: 50k images, 1 epoch (~1 h). Worth checking before the full run
.venv\Scripts\python train.py --subset 50000 --epochs 1

# 5. Full run: 5 epochs, checkpoints in C:\trust0-data\checkpoints\t0-vision\{last,best}
.venv\Scripts\python train.py

# 6. Score the fine-tuned model alongside the off-the-shelf ones
.venv\Scripts\python run_eval.py C:\trust0-data\checkpoints\t0-vision\best

# 7. Free the raw data once training is done
Remove-Item -Recurse -Force D:\trust0-data\raw, C:\trust0-data\raw
```

Sources, budgets and paths are in `sources.py`. Useful `train.py` flags: `--batch-size` (lower it if you run out of GPU memory), `--lr`, `--epochs`, `--workers`, `--model`, `--resume`.

What to watch in the logs:
- **download**: GB done, MB/s and ETA per source.
- **prepare**: images per shard. Lines marked `!! rows had no recognisable label` mean a dataset's label column wasn't understood; stop and check that source.
- **train**: loss and accuracy every 50 steps. After each epoch, validation and test results under original/social/repost. The goal is test AUC above the starting 0.83, with "real flagged" staying around 5% or lower.
