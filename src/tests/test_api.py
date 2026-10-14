import asyncio
import os
import tempfile
import time

# Isolated database and no provider keys for API tests
os.environ["DATA_DIR"] = tempfile.mkdtemp(prefix="trust0-test-")
os.environ["CHECK_WAIT_SECONDS"] = "2"
for key in ("ANTHROPIC_API_KEY", "OPENAI_API_KEY", "OPENROUTER_API_KEY", "SERPAPI_API_KEY", "GOOGLE_FACTCHECK_API_KEY", "HIVE_API_KEY", "T0_VISION_MODEL_PATH", "WHISPER_MODEL"):
    os.environ[key] = ""

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.db import load_report, save_report  # noqa: E402
from app.main import app  # noqa: E402
from app.pipeline import runner  # noqa: E402

calls: list[runner.Job] = []


@pytest.fixture(autouse=True)
def fake_pipeline(monkeypatch):
    """Replace the real pipeline (network, yt-dlp, Claude) with one that completes instantly."""
    calls.clear()

    async def fake_run(job: runner.Job) -> None:
        calls.append(job)
        await asyncio.sleep(0.05)
        report = await load_report(job.report_id)
        report.status = "complete"
        report.verdict = "accurate"
        report.trust_score = 81
        report.summary = "Checked."
        await save_report(report)

    monkeypatch.setattr(runner, "run", fake_run)


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def test_health_reports_missing_providers(client):
    body = client.get("/v1/health").json()
    assert body["ok"] is True
    assert body["providers"]["claude"] is False


def test_extension_check_waits_for_result(client):
    response = client.post("/v1/checks", json={"kind": "ai-response", "url": "https://chatgpt.com/c/1", "text": "Paris is the capital of France."})
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "complete"
    assert body["verdict"] == "accurate"
    assert body["trustScore"] == 81
    assert body["reportUrl"].endswith(f"/reports/{body['id']}")
    assert body["pollUrl"].endswith(f"/v1/checks/{body['id']}")
    assert calls[0].kind == "ai-response"


def test_same_content_reuses_report(client):
    first = client.post("/v1/checks", json={"kind": "post", "url": "https://twitter.com/a/status/42?s=20"}).json()
    second = client.post("/v1/checks", json={"kind": "post", "url": "https://x.com/a/status/42"}).json()
    assert first["id"] == second["id"]
    assert len(calls) == 1


def test_studio_report_flow(client):
    created = client.post("/v1/reports", json={"kind": "link", "url": "https://www.youtube.com/watch?v=abc"})
    assert created.status_code == 202
    report = created.json()
    assert report["source"] == "youtube"
    assert report["status"] == "analyzing"

    listed = client.get("/v1/reports").json()
    assert any(r["id"] == report["id"] for r in listed)
    assert client.get("/v1/reports/rpt_missing").status_code == 404


def test_pasted_image_link_is_checked_as_an_image(client):
    report = client.post("/v1/reports", json={"kind": "link", "url": "https://i.pinimg.com/1200x/be/56/18/photo.jpg"}).json()
    assert report["source"] == "image"
    client.get(f"/v1/reports/{report['id']}")  # the job starts in a background task; give it a turn to run
    for _ in range(50):
        if calls:
            break
        time.sleep(0.02)
    assert calls[-1].kind == "image"
    assert calls[-1].media_url == "https://i.pinimg.com/1200x/be/56/18/photo.jpg"
    assert calls[-1].url is None


def test_rejects_empty_request(client):
    assert client.post("/v1/checks", json={"kind": "link"}).status_code == 422


def test_upload_rejects_non_media(client):
    response = client.post("/v1/reports/upload", files={"file": ("notes.txt", b"hello", "text/plain")})
    assert response.status_code == 415


def test_upload_starts_check(client):
    response = client.post("/v1/reports/upload", files={"file": ("photo.jpg", b"\xff\xd8fake", "image/jpeg")})
    assert response.status_code == 202
    report = response.json()
    assert report["source"] == "upload"
    # The check runs in the background; wait for it to land
    for _ in range(50):
        if client.get(f"/v1/reports/{report['id']}").json()["status"] == "complete":
            break
        time.sleep(0.05)
    assert calls[-1].upload_path is not None


def test_extension_origin_allowed(client):
    response = client.options(
        "/v1/checks",
        headers={"Origin": "chrome-extension://" + "a" * 32, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type"},
    )
    assert response.headers.get("access-control-allow-origin") == "chrome-extension://" + "a" * 32
