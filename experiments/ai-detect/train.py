"""Fine-tune an AI-image detector on the prepared training set.

    python train.py                              # full run, defaults below
    python train.py --subset 50000 --epochs 1    # quick baseline on 50k images
    python train.py --batch-size 8 --grad-accum 4  # same effective batch of 32 with less GPU memory
    python train.py --resume                     # start from the last checkpoint's weights (schedule restarts)
    python train.py --model Ateeqq/ai-vs-human-image-detector

Logs every --log-every steps (loss, accuracy, images/s, ETA). After each epoch it reports AUC, accuracy and
real-image false alarms on the validation split, and on the 1,380-image test set under the same
original/social/repost conditions as run_eval.py. The best epoch (by validation AUC) is saved to
CHECKPOINTS/t0-vision/best; load it with AutoModelForImageClassification.from_pretrained.
"""

import argparse
import csv
import io
import os
import random
import time
from pathlib import Path

import sources  # noqa: F401  (applies the IPv4 fix before any downloads)

# Must be set before torch touches CUDA; avoids OOM from fragmented memory on a 16 GB card
os.environ.setdefault("PYTORCH_CUDA_ALLOC_CONF", "expandable_segments:True")

import torch
from PIL import Image
from sklearn.metrics import roc_auc_score
from torch.utils.data import DataLoader, Dataset, WeightedRandomSampler
from torchvision import transforms as T
from transformers import AutoImageProcessor, AutoModelForImageClassification, get_cosine_schedule_with_warmup

from run_eval import CONDITIONS, ai_label_set
from sources import MODEL_DIR, MODEL_NAME, PREPARED

ROOT = Path(__file__).parent


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("--model", default="haywoodsloan/ai-image-detector-deploy")
    p.add_argument("--epochs", type=int, default=5)
    # Batch 32 of SwinV2 doesn't fit in 16 GB; 16 x 2 accumulation steps trains the same as batch 32
    p.add_argument("--batch-size", type=int, default=16)
    p.add_argument("--grad-accum", type=int, default=2, help="optimizer step every N batches")
    p.add_argument("--grad-checkpointing", action="store_true", help="recompute activations: ~40%% less memory, ~30%% slower")
    p.add_argument("--lr", type=float, default=2e-5)
    p.add_argument("--weight-decay", type=float, default=0.05)
    p.add_argument("--warmup", type=float, default=0.03, help="fraction of steps")
    p.add_argument("--subset", type=int, default=0, help="train on this many random images (0 = all)")
    p.add_argument("--workers", type=int, default=8)
    p.add_argument("--log-every", type=int, default=50)
    p.add_argument("--resume", action="store_true")
    p.add_argument("--seed", type=int, default=7)
    return p.parse_args()


# --- Augmentation: what happens to images on their way through social media ---------------------


class RandomJpeg:
    def __init__(self, p=0.6, quality=(40, 95)):
        self.p, self.quality = p, quality

    def __call__(self, img):
        if random.random() > self.p:
            return img
        buffer = io.BytesIO()
        img.save(buffer, "JPEG", quality=random.randint(*self.quality))
        return Image.open(io.BytesIO(buffer.getvalue())).convert("RGB")


class RandomDownscale:
    """Shrink and scale back up, like a screenshot of a repost."""

    def __init__(self, p=0.3, scale=(0.4, 0.9)):
        self.p, self.scale = p, scale

    def __call__(self, img):
        if random.random() > self.p:
            return img
        factor = random.uniform(*self.scale)
        small = img.resize((max(16, int(img.width * factor)), max(16, int(img.height * factor))), Image.BILINEAR)
        return small.resize(img.size, Image.BILINEAR)


def build_transforms(processor):
    size = processor.size.get("height") or processor.size.get("shortest_edge") or 224
    normalize = T.Normalize(processor.image_mean, processor.image_std)
    train = T.Compose([
        RandomDownscale(),
        RandomJpeg(),
        T.RandomResizedCrop(size, scale=(0.5, 1.0), ratio=(0.75, 1.33)),
        T.RandomHorizontalFlip(),
        T.ToTensor(),
        normalize,
    ])
    evaluate = T.Compose([T.Resize(size), T.CenterCrop(size), T.ToTensor(), normalize])
    return train, evaluate


# --- Data ----------------------------------------------------------------------------------------


class ImageSet(Dataset):
    def __init__(self, rows, root: Path, transform, ai_index: int, condition: str | None = None):
        # Condition is a name, not a function: DataLoader workers on Windows are new processes and
        # can't receive the lambdas in run_eval.CONDITIONS, but can look them up by name
        self.rows, self.root, self.transform, self.ai_index, self.condition = rows, root, transform, ai_index, condition

    def __len__(self):
        return len(self.rows)

    def __getitem__(self, i):
        row = self.rows[i]
        img = Image.open(self.root / row["path"]).convert("RGB")
        if self.condition:
            img = CONDITIONS[self.condition](img)
        target = self.ai_index if row["label"] == "ai" else 1 - self.ai_index
        return self.transform(img), target


def load_manifest(path: Path) -> list[dict]:
    with path.open() as f:
        return list(csv.DictReader(f))


# --- Evaluation ----------------------------------------------------------------------------------


@torch.no_grad()
def evaluate(model, loader, ai_index, device) -> dict:
    model.eval()
    scores, labels = [], []
    for images, targets in loader:
        with torch.autocast("cuda", dtype=torch.bfloat16, enabled=device.type == "cuda"):
            logits = model(pixel_values=images.to(device, non_blocking=True)).logits
        scores += logits.float().softmax(-1)[:, ai_index].cpu().tolist()
        labels += [int(t == ai_index) for t in targets.tolist()]
    model.train()
    predicted = [s >= 0.5 for s in scores]
    real = [p for p, l in zip(predicted, labels) if not l]
    ai = [p for p, l in zip(predicted, labels) if l]
    return {
        "auc": roc_auc_score(labels, scores),
        "acc": sum(p == bool(l) for p, l in zip(predicted, labels)) / len(labels),
        "ai_caught": sum(ai) / max(len(ai), 1),
        "real_flagged": sum(real) / max(len(real), 1),
    }


def fmt(m: dict) -> str:
    return f"AUC {m['auc']:.3f}  acc {m['acc']:.3f}  AI caught {m['ai_caught']:.0%}  real flagged {m['real_flagged']:.0%}"


# --- Training ------------------------------------------------------------------------------------


def main():
    args = parse_args()
    random.seed(args.seed)
    torch.manual_seed(args.seed)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    MODEL_DIR.mkdir(parents=True, exist_ok=True)

    start_from = MODEL_DIR / "last" if args.resume and (MODEL_DIR / "last").exists() else args.model
    processor = AutoImageProcessor.from_pretrained(args.model)
    model = AutoModelForImageClassification.from_pretrained(start_from).to(device)
    if args.grad_checkpointing:
        model.gradient_checkpointing_enable()
    ai_label = next(iter(ai_label_set(model.config.id2label)))
    ai_index = model.config.label2id[ai_label]
    print(f"{MODEL_NAME} from {start_from}  labels {model.config.id2label}  (AI = {ai_label})  device {device}")

    train_tf, eval_tf = build_transforms(processor)
    rows = load_manifest(PREPARED / "manifest.csv")
    train_rows = [r for r in rows if r["split"] == "train"]
    val_rows = [r for r in rows if r["split"] == "val"]
    if args.subset:
        train_rows = random.sample(train_rows, min(args.subset, len(train_rows)))
    test_rows = [{"path": r["path"], "label": r["label"]} for r in load_manifest(ROOT / "manifest.csv")]

    # Balance real vs AI per batch: the raw mix is mostly AI
    n_ai = sum(r["label"] == "ai" for r in train_rows)
    n_real = len(train_rows) - n_ai
    weights = [0.5 / n_ai if r["label"] == "ai" else 0.5 / n_real for r in train_rows]
    sampler = WeightedRandomSampler(weights, num_samples=len(train_rows), replacement=True)
    print(f"Train {len(train_rows)} ({n_real} real, {n_ai} AI, sampled 50/50)  |  val {len(val_rows)}  |  test {len(test_rows)}")

    loader_kw = dict(batch_size=args.batch_size, num_workers=args.workers, pin_memory=True, persistent_workers=args.workers > 0)
    train_loader = DataLoader(ImageSet(train_rows, PREPARED, train_tf, ai_index), sampler=sampler, drop_last=True, **loader_kw)
    val_loader = DataLoader(ImageSet(val_rows, PREPARED, eval_tf, ai_index), **loader_kw)
    test_loaders = {
        name: DataLoader(ImageSet(test_rows, ROOT / "data", eval_tf, ai_index, condition=name), **loader_kw)
        for name in CONDITIONS
    }

    optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr, weight_decay=args.weight_decay)
    total_steps = args.epochs * (len(train_loader) // args.grad_accum)
    scheduler = get_cosine_schedule_with_warmup(optimizer, int(args.warmup * total_steps), total_steps)
    loss_fn = torch.nn.CrossEntropyLoss()

    print("\nBefore training (test set):")
    for name, loader in test_loaders.items():
        print(f"  {name:8s} {fmt(evaluate(model, loader, ai_index, device))}", flush=True)

    batch = args.batch_size * args.grad_accum
    print(f"\nBatch {args.batch_size} x {args.grad_accum} accumulation steps = {batch} per optimizer step")
    best_auc, step, start = -1.0, 0, time.time()
    model.train()
    for epoch in range(1, args.epochs + 1):
        running_loss, running_correct, seen = 0.0, 0, 0
        optimizer.zero_grad(set_to_none=True)
        for i, (images, targets) in enumerate(train_loader, 1):
            images, targets = images.to(device, non_blocking=True), targets.to(device, non_blocking=True)
            with torch.autocast("cuda", dtype=torch.bfloat16, enabled=device.type == "cuda"):
                logits = model(pixel_values=images).logits
                loss = loss_fn(logits.float(), targets)
            (loss / args.grad_accum).backward()
            running_loss += loss.item() * len(targets)
            running_correct += (logits.argmax(-1) == targets).sum().item()
            seen += len(targets)
            if i % args.grad_accum:
                continue
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
            scheduler.step()
            optimizer.zero_grad(set_to_none=True)

            step += 1
            if step % args.log_every == 0:
                elapsed = time.time() - start
                rate = step * batch / elapsed
                eta = (total_steps - step) * batch / rate / 3600
                print(
                    f"epoch {epoch}/{args.epochs}  step {step}/{total_steps}  loss {running_loss / seen:.4f}  "
                    f"acc {running_correct / seen:.3f}  lr {scheduler.get_last_lr()[0]:.2e}  {rate:.0f} img/s  ETA {eta:.1f} h",
                    flush=True,
                )
                running_loss, running_correct, seen = 0.0, 0, 0

        val = evaluate(model, val_loader, ai_index, device)
        print(f"\n== epoch {epoch} validation: {fmt(val)}")
        for name, loader in test_loaders.items():
            print(f"   test {name:8s} {fmt(evaluate(model, loader, ai_index, device))}", flush=True)

        model.save_pretrained(MODEL_DIR / "last")
        processor.save_pretrained(MODEL_DIR / "last")
        if val["auc"] > best_auc:
            best_auc = val["auc"]
            model.save_pretrained(MODEL_DIR / "best")
            processor.save_pretrained(MODEL_DIR / "best")
            print(f"   saved new best (val AUC {best_auc:.3f}) -> {MODEL_DIR / 'best'}")
        print()

    print(f"Done in {(time.time() - start) / 3600:.1f} h. Best val AUC {best_auc:.3f}. {MODEL_NAME}: {MODEL_DIR / 'best'}")


if __name__ == "__main__":
    main()
