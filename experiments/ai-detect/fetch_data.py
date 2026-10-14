"""Build a labelled test set of real and AI-generated images by streaming from Hugging Face.

Nothing is downloaded in bulk: Parquet shards are read one random row group at a time over HTTP range
requests, and WebDataset tar shards are read as a stream until enough images are collected. Only the kept
images are written, to data/, with labels in manifest.csv.

Uses your `hf auth login` token. Doesn't use the `datasets` library, because Windows Application Control
blocks one of the pyarrow DLLs it needs on this machine; pyarrow.parquet itself is fine.
"""

import csv
import random
import re
import socket
import tarfile
from collections import defaultdict
from pathlib import Path

# This network advertises IPv6 but can't route it; try IPv4 first so requests don't hang
_getaddrinfo = socket.getaddrinfo
socket.getaddrinfo = lambda *a, **k: sorted(_getaddrinfo(*a, **k), key=lambda i: i[0] != socket.AF_INET)

import pyarrow.parquet as pq  # noqa: E402
from huggingface_hub import HfFileSystem  # noqa: E402

ROOT = Path(__file__).parent
DATA = ROOT / "data"
fs = HfFileSystem()
random.seed(7)

# How many images to keep from each source
GENIMAGE = "TheKernel01/Tiny-GenImage"
GENIMAGE_NAMES = ["Real", "ADM", "BigGAN", "GLIDE", "Midjourney", "SD14", "SD15", "VQDM", "Wukong"]
# Tiny-GenImage lists SD14 as a class but has no SD14 images; scanning for them reads the whole dataset
GENIMAGE_SKIP = {"SD14"}
GENIMAGE_REAL = 300
GENIMAGE_PER_GENERATOR = 60

# (dataset, generator name, label, count)
PARQUET_SOURCES = [
    ("bitmind/ffhq-256", "Real-faces (FFHQ)", "real", 150),
    ("bitmind/ffhq-256___FLUX.1-dev_training_faces", "FLUX.1-dev-faces", "ai", 150),
    ("Photoroom/midjourney-v6-recap", "Midjourney-v6", "ai", 150),
]
# Repos that store images as loose files: (dataset, glob inside the repo, generator name, label, count)
FILE_SOURCES = [
    # Plain FLUX.1-dev (the repo also has a "realism" LoRA folder). Full-resolution PNGs, so fewer of these
    ("Sarim-Hash/flux_dev_and_realism_flux", "flux_dev_without_realism/*.png", "FLUX.1-dev", "ai", 60),
]
TAR_SOURCES = [
    ("KempnerInstituteAI/flux.2-dev-synthetic-2M", "FLUX.2-dev", "ai", 150),
]
MAX_ROW_GROUPS = 60  # stop scanning a dataset after this many row groups

IMAGE_EXTS = {b"\x89PNG": ".png", b"\xff\xd8\xff": ".jpg", b"RIFF": ".webp", b"GIF8": ".gif"}


def extension(data: bytes) -> str | None:
    return next((ext for magic, ext in IMAGE_EXTS.items() if data.startswith(magic)), None)


def parquet_shards(repo: str) -> list[str]:
    shards = fs.glob(f"datasets/{repo}/**/*.parquet")
    random.shuffle(shards)
    return shards


def stream_row_groups(repo: str, columns: list[str]):
    """Yield rows from random row groups across a dataset's Parquet shards."""
    read = 0
    for shard in parquet_shards(repo):
        with fs.open(shard, "rb", block_size=8 * 1024 * 1024) as handle:
            parquet = pq.ParquetFile(handle)
            available = [c for c in columns if c in parquet.schema_arrow.names]
            groups = list(range(parquet.num_row_groups))
            random.shuffle(groups)
            for group in groups[:4]:  # a few groups per shard, for variety across shards
                yield from parquet.read_row_group(group, columns=available).to_pylist()
                read += 1
                if read >= MAX_ROW_GROUPS:
                    return


def image_bytes(row: dict) -> bytes | None:
    for value in row.values():
        if isinstance(value, dict) and isinstance(value.get("bytes"), bytes):
            return value["bytes"]
    return None


def save(data: bytes, stem: str) -> str | None:
    ext = extension(data)
    if not ext:
        return None
    name = stem + ext
    (DATA / name).write_bytes(data)
    return name


def stem_for(name: str) -> str:
    return name.split(" ")[0].replace(".", "_")


def reuse(name: str, label: str, count: int, manifest: list[dict]) -> int:
    """Add images already in data/ from an earlier run, so reruns only download what's missing."""
    pattern = re.compile(rf"^{re.escape(stem_for(name))}_\d{{3}}$")
    existing = sorted(p for p in DATA.iterdir() if pattern.match(p.stem))[:count]
    manifest.extend({"path": p.name, "label": label, "generator": name} for p in existing)
    return len(existing)


def fetch_genimage(manifest: list[dict]) -> None:
    wanted = {g: (GENIMAGE_REAL if g == "Real" else GENIMAGE_PER_GENERATOR) for g in GENIMAGE_NAMES if g not in GENIMAGE_SKIP}
    kept: dict[str, int] = defaultdict(int)
    # Reuse images from an earlier run instead of downloading them again
    for path in sorted(DATA.glob("genimage_*")):
        generator = path.stem.split("_")[1]
        if generator in wanted and kept[generator] < wanted[generator]:
            manifest.append({"path": path.name, "label": "real" if generator == "Real" else "ai", "generator": generator})
            kept[generator] += 1
    if all(kept[g] >= wanted[g] for g in wanted):
        print("  GenImage: reusing images already in data/")
    for row in stream_row_groups(GENIMAGE, ["image", "label", "generator"]):
        if all(kept[g] >= wanted[g] for g in wanted):
            break
        generator = GENIMAGE_NAMES[row["generator"]]
        if generator not in wanted or kept[generator] >= wanted[generator]:
            continue
        data = image_bytes(row)
        name = data and save(data, f"genimage_{generator}_{kept[generator]:03d}")
        if name:
            manifest.append({"path": name, "label": "real" if generator == "Real" else "ai", "generator": generator})
            kept[generator] += 1
    for g in wanted:
        print(f"  GenImage {g}: {kept[g]}")


def fetch_parquet(repo: str, name: str, label: str, count: int, manifest: list[dict]) -> None:
    kept = reuse(name, label, count, manifest)
    try:
        for row in stream_row_groups(repo, ["image", "jpg", "png", "webp"]) if kept < count else []:
            data = image_bytes(row)
            stem = f"{stem_for(name)}_{kept:03d}"
            if data and (path := save(data, stem)):
                manifest.append({"path": path, "label": label, "generator": name})
                kept += 1
                if kept >= count:
                    break
    except Exception as exc:
        print(f"  {name}: stopped early ({exc.__class__.__name__}: {exc})")
    print(f"  {name}: {kept}")


def fetch_tar(repo: str, name: str, label: str, count: int, manifest: list[dict]) -> None:
    kept = reuse(name, label, count, manifest)
    shards = sorted(fs.glob(f"datasets/{repo}/*.tar")) if kept < count else []
    for shard in random.sample(shards, min(3, len(shards))):
        with fs.open(shard, "rb", block_size=8 * 1024 * 1024) as handle, tarfile.open(fileobj=handle, mode="r|") as tar:
            for member in tar:
                if not member.isfile() or not member.name.lower().endswith((".png", ".jpg", ".jpeg", ".webp")):
                    continue
                data = tar.extractfile(member).read()
                if path := save(data, f"{stem_for(name)}_{kept:03d}"):
                    manifest.append({"path": path, "label": label, "generator": name})
                    kept += 1
                if kept >= count:
                    break
        if kept >= count:
            break
    print(f"  {name}: {kept}")


def fetch_files(repo: str, pattern: str, name: str, label: str, count: int, manifest: list[dict]) -> None:
    kept = reuse(name, label, count, manifest)
    files = fs.glob(f"datasets/{repo}/{pattern}") if kept < count else []
    for remote in random.sample(files, min(len(files), count * 2)):
        if kept >= count:
            break
        with fs.open(remote, "rb") as handle:
            if path := save(handle.read(), f"{stem_for(name)}_{kept:03d}"):
                manifest.append({"path": path, "label": label, "generator": name})
                kept += 1
    print(f"  {name}: {kept}")


def main() -> None:
    DATA.mkdir(exist_ok=True)
    manifest: list[dict] = []
    fetch_genimage(manifest)
    for source in PARQUET_SOURCES:
        fetch_parquet(*source, manifest)
    for source in FILE_SOURCES:
        fetch_files(*source, manifest)
    for source in TAR_SOURCES:
        fetch_tar(*source, manifest)

    with (ROOT / "manifest.csv").open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["path", "label", "generator"])
        writer.writeheader()
        writer.writerows(manifest)
    real = sum(r["label"] == "real" for r in manifest)
    size = sum((DATA / r["path"]).stat().st_size for r in manifest) / 1e6
    print(f"\n{len(manifest)} images ({real} real, {len(manifest) - real} AI), {size:.0f} MB -> manifest.csv")


if __name__ == "__main__":
    main()
