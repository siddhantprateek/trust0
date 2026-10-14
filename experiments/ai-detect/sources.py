"""Training data sources: which Hugging Face datasets, how much of each, and where they go on disk.

Edit budgets and paths here; download_data.py and prepare_data.py both read this file.
Delete RAW dirs after training; PREPARED is all train.py needs.
"""

import os
import socket
from dataclasses import dataclass
from pathlib import Path

# Xet downloads use their own (Rust) networking, which ignores the IPv4 fix below and hangs on this
# network; plain HTTP downloads go through Python. The timeout turns a stalled transfer into a retry.
os.environ.setdefault("HF_HUB_DISABLE_XET", "1")
os.environ.setdefault("HF_HUB_DOWNLOAD_TIMEOUT", "60")
os.environ.setdefault("HF_HUB_ETAG_TIMEOUT", "60")

# This network advertises IPv6 but can't route it; try IPv4 first so downloads don't hang
_getaddrinfo = socket.getaddrinfo
socket.getaddrinfo = lambda *a, **k: sorted(_getaddrinfo(*a, **k), key=lambda i: i[0] != socket.AF_INET)

RAW_D = Path("D:/trust0-data/raw")
RAW_C = Path("C:/trust0-data/raw")
# Resized training images (~80 GB). On C: because D: is mostly taken by raw data
PREPARED = Path("C:/trust0-data/prepared")
CHECKPOINTS = Path("C:/trust0-data/checkpoints")

# Our fine-tuned detector; train.py saves it to CHECKPOINTS/<name>/{last,best}
MODEL_NAME = "t0-vision"
MODEL_DIR = CHECKPOINTS / MODEL_NAME

# The 1,380-image test set; anything identical to it is kept out of training
TEST_DATA = Path(__file__).parent / "data"


@dataclass(frozen=True)
class Source:
    name: str
    repo: str
    budget_gb: float
    root: Path
    # "ai" or "real" when the whole dataset is one class; "column" when each row has a real/fake label
    label: str

    @property
    def raw_dir(self) -> Path:
        return self.root / self.name


SOURCES = [
    # GenImage: real photos plus 8 generators, labelled per row. Arrow shards, so any subset is usable
    # (the original GenImage repo ships split zip archives, which can't be partially downloaded)
    Source("genimage", "nebula/GenImage-arrow", 400, RAW_D, "column"),
    # Newest generator and the weakest spot for current detectors
    Source("flux2", "KempnerInstituteAI/flux.2-dev-synthetic-2M", 200, RAW_D, "ai"),
    Source("flux1-faces", "bitmind/ffhq-256___FLUX.1-dev_training_faces", 5, RAW_D, "ai"),
    # Real faces, so the model doesn't learn "face = AI"
    Source("ffhq-real", "bitmind/ffhq-256", 5, RAW_D, "real"),
    Source("midjourney-v6", "Photoroom/midjourney-v6-recap", 150, RAW_C, "ai"),
    # For a commercial model, add a commercially licensed real-photo set here (e.g. Open Images, CC-BY);
    # GenImage's real photos are ImageNet, which is licensed for non-commercial research only.
]

# Shard formats that are self-contained, so a subset of files is still valid data
SHARD_EXTS = (".parquet", ".arrow", ".tar", ".png", ".jpg", ".jpeg", ".webp")
