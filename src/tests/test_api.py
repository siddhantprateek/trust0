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
from app.pipeline.progress import PLAN  # noqa: E402

# Captured before the autouse fixture swaps in the fake, for tests that exercise the real error handling
real_run = runner.run

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


def test_new_report_lists_planned_steps_and_shows_in_runs(client):
    report = client.post("/v1/reports", json={"kind": "link", "url": "https://example.com/planned-steps"}).json()
    assert [step["id"] for step in report["steps"]] == [step_id for step_id, _ in PLAN]
    assert all(step["status"] == "pending" for step in report["steps"])

    runs = client.get("/v1/runs").json()
    run = next(r for r in runs if r["id"] == report["id"])
    assert run["title"] and run["createdAt"] and len(run["steps"]) == len(PLAN)
    assert "claims" not in run  # summaries stay light enough to poll


def test_stage_progress_is_saved_and_a_failure_marks_the_running_stage(client, monkeypatch):
    async def failing_stages(job, progress):
        await progress.start("ingest")
        await progress.complete("ingest", "Video from youtube.com")
        await progress.skip("media", "No image or video to fingerprint")
        await progress.start("provenance")
        raise RuntimeError("search provider down")

    monkeypatch.setattr(runner, "run", real_run)
    monkeypatch.setattr(runner, "_run", failing_stages)
    report_id = client.post("/v1/reports", json={"kind": "link", "url": "https://example.com/failing-stages"}).json()["id"]

    deadline = time.time() + 5
    while (body := client.get(f"/v1/reports/{report_id}").json())["status"] == "analyzing" and time.time() < deadline:
        time.sleep(0.05)

    assert body["status"] == "failed"
    assert "search provider down" in body["error"]
    steps = {step["id"]: step for step in body["steps"]}
    assert steps["ingest"]["status"] == "complete"
    assert steps["ingest"]["detail"] == "Video from youtube.com"
    assert steps["ingest"]["startedAt"] and steps["ingest"]["endedAt"]
    assert steps["media"]["status"] == "skipped"
    assert steps["provenance"]["status"] == "failed"
    assert steps["score"]["status"] == "pending"


def test_cancel_stops_the_running_stage_and_frees_the_content_for_a_new_check(client, monkeypatch):
    async def slow_stages(job, progress):
        await progress.start("ingest")
        await progress.complete("ingest", "12 words")
        await progress.start("provenance")
        await asyncio.sleep(30)

    monkeypatch.setattr(runner, "run", real_run)
    monkeypatch.setattr(runner, "_run", slow_stages)
    url = "https://example.com/cancel-me"
    report_id = client.post("/v1/reports", json={"kind": "link", "url": url}).json()["id"]

    deadline = time.time() + 5
    while time.time() < deadline:
        steps = {s["id"]: s for s in client.get(f"/v1/reports/{report_id}").json()["steps"]}
        if steps["provenance"]["status"] == "running":
            break
        time.sleep(0.05)

    cancelled = client.post(f"/v1/reports/{report_id}/cancel")
    assert cancelled.status_code == 200
    body = cancelled.json()
    assert body["status"] == "cancelled"
    steps = {s["id"]: s for s in body["steps"]}
    assert steps["ingest"]["status"] == "complete"
    assert steps["provenance"]["status"] == "cancelled"
    assert steps["factcheck"]["status"] == "pending"

    assert client.post(f"/v1/reports/{report_id}/cancel").status_code == 409
    # A cancelled check isn't reused, so checking the same link again starts over
    assert client.post("/v1/reports", json={"kind": "link", "url": url}).json()["id"] != report_id


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


def test_active_sites_are_seeded_and_editable(client):
    seeded = client.get("/v1/extension/active-sites").json()
    assert {"x.com", "reddit.com", "chatgpt.com"} <= {s["domain"] for s in seeded}

    created = client.post("/v1/extension/active-sites", json={"domain": "https://www.Example.com/path"})
    assert created.status_code == 201
    assert created.json()["domain"] == "example.com"

    after_add = {s["domain"] for s in client.get("/v1/extension/active-sites").json()}
    assert "example.com" in after_add

    # Re-adding is idempotent
    assert client.post("/v1/extension/active-sites", json={"domain": "example.com"}).status_code == 201

    assert client.delete("/v1/extension/active-sites/example.com").status_code == 204
    after_delete = {s["domain"] for s in client.get("/v1/extension/active-sites").json()}
    assert "example.com" not in after_delete
    assert client.delete("/v1/extension/active-sites/example.com").status_code == 204  # deleting twice is fine


def test_active_site_rejects_garbage(client):
    assert client.post("/v1/extension/active-sites", json={"domain": "not a domain"}).status_code == 422


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


def test_models_catalog_lists_t0_vision(client):
    models = client.get("/v1/models").json()
    vision = next(m for m in models if m["id"] == "t0-vision")
    assert vision["endpoint"] == "/v1/models/predict"
    assert vision["status"] == "offline"  # no checkpoint configured in tests
    assert client.get("/v1/models/nope").status_code == 404


def test_api_key_lifecycle_and_auth(client):
    created = client.post("/v1/api-keys", json={"name": "CI"}).json()
    assert created["key"].startswith("t0_") and created["prefix"] == created["key"][:10]
    listed = client.get("/v1/api-keys").json()
    assert any(k["id"] == created["id"] and "key" not in k for k in listed)

    image = {"file": ("x.png", b"not really", "image/png")}
    payload = {"model": "t0-vision"}
    assert client.post("/v1/models/predict", data=payload, files=image).status_code == 401
    assert client.post("/v1/models/predict", data=payload, files=image, headers={"Authorization": "Bearer t0_wrong"}).status_code == 401
    auth = {"Authorization": f"Bearer {created['key']}"}
    # An unknown model is rejected before the real one is even looked at
    assert client.post("/v1/models/predict", data={"model": "nope"}, files=image, headers=auth).status_code == 404
    # A valid key and known model get past those checks; this server has no checkpoint, so the model itself is unavailable
    ok = client.post("/v1/models/predict", data=payload, files=image, headers=auth)
    assert ok.status_code == 503
    assert next(k for k in client.get("/v1/api-keys").json() if k["id"] == created["id"])["lastUsedAt"]

    assert client.delete(f"/v1/api-keys/{created['id']}").status_code == 204
    revoked = client.post("/v1/models/predict", data=payload, files=image, headers=auth)
    assert revoked.status_code == 401
