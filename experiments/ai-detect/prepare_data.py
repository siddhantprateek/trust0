"""Turn downloaded shards into a training set: 512 px JPEGs with a labels file.

    python prepare_data.py               # all sources
    python prepare_data.py flux2         # one source
    python prepare_data.py --workers 6   # parallel shard workers (default: CPU count - 2)
    python prepare_data.py --watch       # keep converting shards as they download, until downloads finish

Every image, real or AI, is re-encoded the same way (longest side 512 px, JPEG q95), so the model can't
learn file format or size as a shortcut. Images identical to the 1,380-image test set are skipped.
Resumable: shards already processed are skipped. Writes PREPARED/manifest.csv (path,label,source,generator).
"""

import csv
import hashlib
import io
import json
import os
import random
import sys
import tarfile
import time
from concurrent.futures import ProcessPoolExecutor, as_completed
from pathlib import Path

from PIL import Image

from sources import PREPARED, SHARD_EXTS, SOURCES, TEST_DATA

# Written by download_data.py when every download has finished
DOWNLOAD_DONE = Path(__file__).parent / "logs" / "download.done"

LONGEST_SIDE = 512
JPEG_QUALITY = 95
VAL_FRACTION = 0.02
REAL_NAMES = {"real", "nature", "human", "0_real", "authentic", "photo"}
Image.MAX_IMAGE_PIXELS = 100_000_000


def test_hashes() -> set[str]:
    return {hashlib.sha1(p.read_bytes()).hexdigest() for p in TEST_DATA.glob("*") if p.is_file()}


# --- Reading rows out of each shard format ----------------------------------------------------------


def label_names(schema) -> dict[str, list[str]]:
    """ClassLabel names stored in Hugging Face Arrow/Parquet metadata, e.g. {"label": ["real", "fake"]}."""
    meta = (schema.metadata or {}).get(b"huggingface")
    if not meta:
        return {}
    features = json.loads(meta).get("info", {}).get("features", {})
    return {k: v["names"] for k, v in features.items() if isinstance(v, dict) and v.get("names")}


def image_bytes(row: dict) -> bytes | None:
    for value in row.values():
        if isinstance(value, dict) and isinstance(value.get("bytes"), bytes):
            return value["bytes"]
        if isinstance(value, bytes) and len(value) > 1000:
            return value
    return None


def row_label(row: dict, names: dict[str, list[str]]) -> tuple[str, str] | None:
    """(label, generator) from a labelled row. None if the row has no recognisable label."""
    generator = ""
    if "generator" in row and row["generator"] is not None:
        value = row["generator"]
        generator = names["generator"][value] if isinstance(value, int) and "generator" in names else str(value)
    for key in ("label", "labels", "is_fake", "class"):
        if key in row and row[key] is not None:
            value = row[key]
            name = names[key][value] if isinstance(value, int) and key in names else str(value)
            if key == "is_fake":
                label = "ai" if value else "real"
            else:
                label = "real" if name.lower() in REAL_NAMES else "ai"
            # GenImage stores real photos inside each generator's folder; don't count them as that generator
            return label, ("Real" if label == "real" else generator or name)
    if generator:
        return ("real" if generator.lower() in REAL_NAMES else "ai"), generator
    return None


def rows_from_table_file(path: Path):
    import pyarrow as pa
    import pyarrow.parquet as pq

    if path.suffix == ".parquet":
        parquet = pq.ParquetFile(path)
        names = label_names(parquet.schema_arrow)
        for i in range(parquet.num_row_groups):
            for row in parquet.read_row_group(i).to_pylist():
                yield row, names
        return
    with pa.memory_map(str(path)) as source:  # .arrow: Hugging Face writes the IPC stream format
        try:
            reader = pa.ipc.open_stream(source)
        except pa.ArrowInvalid:
            reader = pa.ipc.open_file(source)
        names = label_names(reader.schema)
        batches = reader if hasattr(reader, "__iter__") else (reader.get_batch(i) for i in range(reader.num_record_batches))
        for batch in batches:
            for row in batch.to_pylist():
                yield row, names


def rows_from_tar(path: Path):
    with tarfile.open(path) as tar:
        for member in tar:
            if member.isfile() and member.name.lower().endswith((".png", ".jpg", ".jpeg", ".webp")):
                yield {"image": {"bytes": tar.extractfile(member).read()}}, {}


# --- One shard -> resized JPEGs -------------------------------------------------------------------


def process_shard(shard: str, source_name: str, fixed_label: str, out_dir: str, skip: set[str]) -> dict:
    shard_path, out = Path(shard), Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    rows_out, skipped_test, unlabelled, broken = [], 0, 0, 0
    reader = rows_from_tar if shard_path.suffix == ".tar" else rows_from_table_file
    items = reader(shard_path) if shard_path.suffix in (".tar", ".parquet", ".arrow") else [({"image": {"bytes": shard_path.read_bytes()}}, {})]
    stem = hashlib.sha1(shard.encode()).hexdigest()[:10]
    rng = random.Random(stem)

    for i, (row, names) in enumerate(items):
        data = image_bytes(row)
        if not data:
            broken += 1
            continue
        if hashlib.sha1(data).hexdigest() in skip:
            skipped_test += 1
            continue
        if fixed_label == "column":
            labelled = row_label(row, names)
            if labelled is None:
                unlabelled += 1
                continue
            label, generator = labelled
        else:
            label, generator = fixed_label, source_name
        try:
            with Image.open(io.BytesIO(data)) as img:
                img = img.convert("RGB")
                img.thumbnail((LONGEST_SIDE, LONGEST_SIDE), Image.LANCZOS)
                name = f"{stem}_{i:06d}.jpg"
                img.save(out / name, "JPEG", quality=JPEG_QUALITY)
        except Exception:
            broken += 1
            continue
        split = "val" if rng.random() < VAL_FRACTION else "train"
        rows_out.append({"path": f"{source_name}/{name}", "label": label, "source": source_name, "generator": generator, "split": split})

    # Per-shard manifest doubles as the "done" marker for resuming
    with open(out / f"{stem}.csv", "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["path", "label", "source", "generator", "split"])
        writer.writeheader()
        writer.writerows(rows_out)
    return {"shard": shard_path.name, "kept": len(rows_out), "test_overlap": skipped_test, "unlabelled": unlabelled, "broken": broken}


def process_pending(pool, sources, skip) -> int:
    """Convert every downloaded shard that hasn't been converted yet. Returns how many were processed.

    Only finished downloads are seen: huggingface_hub writes to a .incomplete file under .cache and moves
    it into place when complete.
    """
    processed = 0
    for source in sources:
        out_dir = PREPARED / source.name
        if not source.raw_dir.exists():
            continue
        shards = sorted(p for p in source.raw_dir.rglob("*") if p.is_file() and p.suffix.lower() in SHARD_EXTS)
        done = {p.stem for p in out_dir.glob("*.csv")} if out_dir.exists() else set()
        todo = [s for s in shards if hashlib.sha1(str(s).encode()).hexdigest()[:10] not in done]
        if not todo:
            continue
        print(f"\n== {source.name}: {len(shards)} shards on disk, {len(todo)} to process", flush=True)
        start, kept = time.time(), 0
        futures = [pool.submit(process_shard, str(s), source.name, source.label, str(out_dir), skip) for s in todo]
        for n, future in enumerate(as_completed(futures), 1):
            try:
                r = future.result()
            except Exception as exc:
                print(f"  !! shard failed: {exc.__class__.__name__}: {exc}", flush=True)
                continue
            processed += 1
            kept += r["kept"]
            rate = kept / (time.time() - start)
            warn = f"  !! {r['unlabelled']} rows had no recognisable label" if r["unlabelled"] else ""
            print(f"  [{source.name}] {n}/{len(todo)} {r['shard']}: +{r['kept']} images ({r['test_overlap']} test overlaps, {r['broken']} unreadable)  total {kept}  {rate:.0f} img/s{warn}", flush=True)
    return processed


def main() -> None:
    args = sys.argv[1:]
    workers = int(args[args.index("--workers") + 1]) if "--workers" in args else max((os.cpu_count() or 4) - 2, 1)
    names = [a for a in args if not a.startswith("--") and not a.isdigit()]
    sources = [s for s in SOURCES if not names or s.name in names]

    skip = test_hashes()
    watch = "--watch" in args
    print(f"Test-set images to exclude: {len(skip)}  |  workers: {workers}  |  output: {PREPARED}  |  watch: {watch}")

    with ProcessPoolExecutor(max_workers=workers) as pool:
        while True:
            # Read the flag before scanning, so shards that land during this pass get one more pass
            downloads_finished = DOWNLOAD_DONE.exists()
            processed = process_pending(pool, sources, skip)
            if not watch or (downloads_finished and processed == 0):
                break
            if processed == 0:
                time.sleep(60)  # waiting for the downloader to finish more shards

    # Combine per-shard manifests
    rows = []
    for csv_path in PREPARED.glob("*/*.csv"):
        with csv_path.open() as f:
            rows.extend(csv.DictReader(f))
    with (PREPARED / "manifest.csv").open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["path", "label", "source", "generator", "split"])
        writer.writeheader()
        writer.writerows(rows)

    from collections import Counter

    print(f"\nmanifest.csv: {len(rows)} images")
    for (split, label), count in sorted(Counter((r["split"], r["label"]) for r in rows).items()):
        print(f"  {split:5s} {label:4s} {count}")
    for generator, count in Counter(r["generator"] for r in rows).most_common():
        print(f"  {generator:30s} {count}")
    print("\nNext: python train.py")


if __name__ == "__main__":
    main()
