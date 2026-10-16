"""Measure Jev's image judgment (pipeline/visual_review.py) on labelled AI and real images, plus video frames.

Run from this folder with the src virtualenv: python eval.py [frames_dir]
frames_dir holds still frames from real videos the detector misjudged (default ./frames). Results go to eval.json.
Results from the first run are in docs/jev.md.
"""

import asyncio
import base64
import io
import json
import random
import sys
import uuid
from pathlib import Path

import httpx
from dotenv import dotenv_values
from PIL import Image

ENV = dotenv_values(Path(__file__).resolve().parents[2] / "src" / ".env")

DATA = Path(__file__).resolve().parents[1] / "ai-detect" / "data"
FRAMES = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("frames")

ORIGIN = {
    "camera": "Captured by a real camera (photo or video frame), even if compressed, filtered, colour graded, cropped, or with text, captions, logos or a UI frame laid on top",
    "ai-generated": "Generated or substantially altered by an AI image or video generator (diffusion or GAN models such as Midjourney, Stable Diffusion, FLUX, DALL-E, Sora, Veo)",
    "graphics": "Made by people with design or 3D tools rather than a camera or an AI generator: illustration, 3D render, animation, motion graphics, screenshot of an interface",
}
NOUL = ("`image` was made by an AI image or video generator rather than captured by a camera or drawn by a person. "
        "Look for generator artifacts: malformed hands or teeth, garbled text, melting or merging objects, "
        "inconsistent lighting or reflections, impossibly smooth skin or textures.")


def encode(path: Path) -> str:
    image = Image.open(path).convert("RGB")
    w, h = image.size
    scale = min(1.0, 1568 / max(w, h))
    if scale < 1:
        image = image.resize((round(w * scale), round(h * scale)))
    w, h = image.size
    if min(w, h) < 280:
        up = 280 / min(w, h)
        image = image.resize((round(w * up), round(h * up)))
    buf = io.BytesIO()
    image.save(buf, "JPEG", quality=92)
    return base64.b64encode(buf.getvalue()).decode()


async def ask(client, path: Path, sem):
    ref = f"img-{uuid.uuid4()}"
    body = {
        "model": ENV.get("JEV_MODEL", "jev-preview"),
        "state": {"image": ref},
        "assets": {ref: {"type": "image", "format": "jpg", "data_base64": encode(path)}},
        "questions": {
            "origin": {"type": "choice", "instructions": "How was `image` made?", "criteria": ORIGIN},
            "ai": {"type": "noul", "instructions": NOUL},
        },
    }
    async with sem:
        r = await client.post(
            "https://api.typesafe.ai/v1/systemone",
            json=body,
            headers={"Authorization": f"Bearer {ENV["TYPESAFE_API_KEY"]}", "TypeSafe-Danger-Zone-Images": "true"},
            timeout=60,
        )
    if r.status_code != 200:
        return path.name, {"error": r.status_code, "body": r.text[:200]}
    a = r.json()["answers"]
    return path.name, {
        "origin": a["origin"]["choice"],
        "p_ai_choice": round(a["origin"]["probabilities"].get("ai-generated", 0), 3),
        "conf": round(a["origin"]["confidence"], 2),
        "noul_ai": round(a["ai"]["noul"], 3),
        "tokens": r.json()["usage"]["input_tokens"],
    }


async def main():
    random.seed(7)
    groups = {
        "AI": ["Midjourney-v6", "FLUX_2-dev", "FLUX_1-dev-faces", "genimage_SD15", "genimage_Midjourney"],
        "REAL": ["Real-faces", "genimage_Real"],
    }
    samples = []
    for label, prefixes in groups.items():
        for prefix in prefixes:
            files = sorted(DATA.glob(f"{prefix}_*"))
            n = 4 if label == "AI" else 10
            samples += [(label, f) for f in random.sample(files, n)]
    samples += [("REAL-REEL", f) for f in sorted(FRAMES.glob("*.jpg"))]

    sem = asyncio.Semaphore(6)
    async with httpx.AsyncClient() as client:
        results = await asyncio.gather(*(ask(client, f, sem) for _, f in samples))
    rows = [(label, *res) for (label, _), res in zip(samples, results)]
    for label, name, res in rows:
        print(f"{label:9} {name:32} {json.dumps(res)}")
    json.dump(rows, open(Path(__file__).with_name("eval.json"), "w"), indent=1)


asyncio.run(main())
