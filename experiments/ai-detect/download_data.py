"""Download a size-budgeted subset of each training dataset from Hugging Face.

    python download_data.py              # everything in sources.py
    python download_data.py flux2        # one source
    python download_data.py --dry-run    # show what would be downloaded
    python download_data.py --parallel 8 # concurrent transfers (default 6)

Picks random self-contained shards (parquet/arrow/tar/images) until each source's budget is reached.
Resumable: files already on disk are skipped, and interrupted downloads continue where they stopped.
"""

import random
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

# sources sets the download environment (IPv4, no Xet, timeouts); import it before huggingface_hub reads it
from sources import SHARD_EXTS, SOURCES  # isort: skip

from huggingface_hub import HfApi, hf_hub_download

api = HfApi()
# Written when every download has finished; prepare_data.py --watch stops once it sees this
DONE_FLAG = Path(__file__).parent / "logs" / "download.done"


def plan(source) -> list[tuple[str, int]]:
    info = api.dataset_info(source.repo, files_metadata=True)
    files = [(s.rfilename, s.size or 0) for s in info.siblings if s.rfilename.lower().endswith(SHARD_EXTS)]
    total = sum(size for _, size in files)
    if not files:
        print(f"  !! {source.repo} has no usable shards ({SHARD_EXTS}); check its file layout on the Hub")
        return []
    random.Random(7).shuffle(files)
    budget = source.budget_gb * 1e9
    chosen, used = [], 0
    for name, size in files:
        if used + size > budget and chosen:
            continue
        chosen.append((name, size))
        used += size
    print(f"  {source.repo}: {len(chosen)} of {len(files)} files, {used / 1e9:.1f} of {total / 1e9:.1f} GB -> {source.raw_dir}")
    return chosen


def fetch_one(source, name: str) -> bool:
    for attempt in range(1, 6):
        try:
            hf_hub_download(source.repo, name, repo_type="dataset", local_dir=source.raw_dir)
            return True
        except Exception as exc:  # network drops over a multi-hour run; back off and retry, then move on
            print(f"  [{source.name}] {name}: attempt {attempt} failed ({exc.__class__.__name__}: {exc})", flush=True)
            time.sleep(min(30 * attempt, 120))
    print(f"  [{source.name}] !! skipping {name} after 5 attempts; rerun to retry it", flush=True)
    return False


def download_all(plans, parallel: int) -> None:
    """Download every planned file across all sources with `parallel` concurrent transfers."""
    jobs, total, already = [], 0, 0
    for source, files in plans:
        source.raw_dir.mkdir(parents=True, exist_ok=True)
        for name, size in files:
            total += size
            target = source.raw_dir / name
            if target.exists() and target.stat().st_size == size:
                already += size
            else:
                jobs.append((source, name, size))
    print(f"\n{already / 1e9:.1f} GB already on disk, {len(jobs)} files ({(total - already) / 1e9:.1f} GB) to download, {parallel} at a time")

    lock = threading.Lock()
    fetched, finished, start = 0, 0, time.time()

    def run(job):
        nonlocal fetched, finished
        source, name, size = job
        ok = fetch_one(source, name)
        with lock:
            finished += 1
            fetched += size if ok else 0
            rate = fetched / (time.time() - start)  # only bytes fetched this run, so the ETA is honest
            remaining = total - already - fetched
            eta = remaining / rate / 3600 if rate else 0
            print(
                f"  [{source.name}] {finished}/{len(jobs)} files  {(already + fetched) / 1e9:.1f}/{total / 1e9:.1f} GB  "
                f"{rate / 1e6:.0f} MB/s  ETA {eta:.1f} h",
                flush=True,
            )

    # Interleave sources so C: and D: are written at the same time
    random.Random(7).shuffle(jobs)
    with ThreadPoolExecutor(max_workers=parallel) as pool:
        list(pool.map(run, jobs))


def main() -> None:
    args = [a for a in sys.argv[1:] if not a.startswith("--") and not a.isdigit()]
    dry_run = "--dry-run" in sys.argv
    parallel = int(sys.argv[sys.argv.index("--parallel") + 1]) if "--parallel" in sys.argv else 6
    sources = [s for s in SOURCES if not args or s.name in args]

    print("Planning...")
    plans = [(s, plan(s)) for s in sources]
    grand = sum(size for _, files in plans for _, size in files)
    print(f"Total: {grand / 1e9:.0f} GB")
    if dry_run:
        return
    download_all(plans, parallel)
    DONE_FLAG.parent.mkdir(exist_ok=True)
    DONE_FLAG.write_text(time.strftime("%Y-%m-%d %H:%M:%S"))
    print("\nDone. Next: python prepare_data.py")


if __name__ == "__main__":
    main()
