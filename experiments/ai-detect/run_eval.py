"""Score open-source AI-image detectors from Hugging Face on the local test set.

Each model sees every image three ways: as downloaded, after a social-media style upload (resize + JPEG),
and after a repost of that (smaller, recompressed again). Prints a summary and writes results.json.

    python run_eval.py                       # all models
    python run_eval.py umm-maybe/AI-image-detector
"""

import csv
import io
import json
import socket
import sys
import time
from collections import defaultdict
from pathlib import Path

_getaddrinfo = socket.getaddrinfo
socket.getaddrinfo = lambda *a, **k: sorted(_getaddrinfo(*a, **k), key=lambda i: i[0] != socket.AF_INET)

import torch  # noqa: E402
from PIL import Image  # noqa: E402
from sklearn.metrics import roc_auc_score  # noqa: E402
from transformers import pipeline  # noqa: E402

ROOT = Path(__file__).parent
MODELS = [
    "umm-maybe/AI-image-detector",
    "Ateeqq/ai-vs-human-image-detector",
    "haywoodsloan/ai-image-detector-deploy",
    "Smogy/SMOGY-Ai-images-detector",
]
AI_WORDS = ("ai", "artificial", "fake", "generated", "synthetic", "machine")
REAL_WORDS = ("real", "human", "hum", "authentic", "natural", "not")


def jpeg(image: Image.Image, longest: int, quality: int) -> Image.Image:
    image = image.copy()
    image.thumbnail((longest, longest))
    buffer = io.BytesIO()
    image.save(buffer, "JPEG", quality=quality)
    return Image.open(io.BytesIO(buffer.getvalue())).convert("RGB")


CONDITIONS = {
    "original": lambda im: im,
    "social": lambda im: jpeg(im, 1080, 75),
    "repost": lambda im: jpeg(jpeg(im, 1080, 75), 720, 60),
}


def ai_label_set(id2label: dict) -> set[str]:
    """Which of the model's labels mean 'AI-generated'. Model cards name them differently."""
    ai = set()
    for name in id2label.values():
        lower = name.lower()
        if any(w == lower or lower.startswith(w) for w in REAL_WORDS):
            continue
        if any(w in lower for w in AI_WORDS):
            ai.add(name)
    if len(ai) != 1:
        raise ValueError(f"Can't tell which label means AI in {id2label}; add it to AI_WORDS/REAL_WORDS")
    return ai


def evaluate(model_id: str, items: list[dict]) -> dict:
    classifier = pipeline("image-classification", model=model_id, device=0 if torch.cuda.is_available() else -1, top_k=None)
    id2label = classifier.model.config.id2label
    ai_labels = ai_label_set(id2label)
    print(f"\n### {model_id}\n  labels {id2label} -> AI = {ai_labels}")

    results = {}
    labels = [1 if it["label"] == "ai" else 0 for it in items]
    for condition, transform in CONDITIONS.items():
        images = [transform(it["image"]) for it in items]
        start = time.perf_counter()
        outputs = classifier(images, batch_size=16)
        elapsed = (time.perf_counter() - start) / len(images) * 1000
        scores = [sum(o["score"] for o in out if o["label"] in ai_labels) for out in outputs]

        predicted = [s >= 0.5 for s in scores]
        by_generator = defaultdict(list)
        for it, p in zip(items, predicted):
            by_generator[it["generator"]].append(p)
        results[condition] = {
            "auc": round(roc_auc_score(labels, scores), 3),
            "accuracy": round(sum(p == bool(l) for p, l in zip(predicted, labels)) / len(labels), 3),
            "real_flagged_as_ai": round(sum(by_generator["Real"]) / len(by_generator["Real"]), 3),
            "ai_caught": round(sum(p for p, l in zip(predicted, labels) if l) / sum(labels), 3),
            "detection_by_generator": {g: round(sum(v) / len(v), 2) for g, v in sorted(by_generator.items()) if g != "Real"},
            "ms_per_image": round(elapsed, 1),
        }
        r = results[condition]
        print(f"  {condition:8s} AUC {r['auc']:.3f}  acc {r['accuracy']:.2f}  AI caught {r['ai_caught']:.0%}  real wrongly flagged {r['real_flagged_as_ai']:.0%}  {r['ms_per_image']} ms/img")

    del classifier
    torch.cuda.empty_cache()
    return {"labels": id2label, "results": results}


def main() -> None:
    models = sys.argv[1:] or MODELS
    with (ROOT / "manifest.csv").open() as f:
        items = list(csv.DictReader(f))
    for it in items:
        it["image"] = Image.open(ROOT / "data" / it["path"]).convert("RGB")
    print(f"{len(items)} images, device: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'cpu'}")

    out_path = ROOT / "results.json"
    all_results = json.loads(out_path.read_text()) if out_path.exists() else {}
    for model_id in models:
        # A local checkpoint (C:/trust0-data/checkpoints/t0-vision/best) is listed as "t0-vision/best"
        path = Path(model_id)
        key = f"{path.parent.name}/{path.name}" if path.is_dir() else model_id
        try:
            all_results[key] = evaluate(model_id, items)
        except Exception as exc:
            print(f"\n### {model_id}\n  FAILED: {exc.__class__.__name__}: {exc}")
        out_path.write_text(json.dumps(all_results, indent=2))
    print(f"\nWrote {out_path.name}")


if __name__ == "__main__":
    main()
