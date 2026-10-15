"""Stage-by-stage progress for a running check, saved onto the report as each stage starts and ends."""

import asyncio
from datetime import datetime, timezone

from app.db import load_report, save_report
from app.schemas import Report, ReportStep, StepStatus

PLAN: list[tuple[str, str]] = [
    ("ingest", "Fetching the content"),
    ("media", "Fingerprinting media"),
    ("provenance", "Tracing where it came from"),
    ("ai", "Checking for AI generation"),
    ("factcheck", "Fact-checking claims"),
    ("coverage", "Comparing news coverage"),
    ("score", "Scoring trust"),
]


def initial_steps() -> list[ReportStep]:
    return [ReportStep(id=step_id, label=label) for step_id, label in PLAN]


class Progress:
    def __init__(self, report_id: str) -> None:
        self.report_id = report_id
        self.steps = {step.id: step for step in initial_steps()}
        # Provenance and AI detection run concurrently; each save reloads and rewrites the report
        self._lock = asyncio.Lock()

    async def start(self, step_id: str, detail: str | None = None) -> None:
        step = self.steps[step_id]
        step.status = "running"
        step.started_at = _now()
        step.detail = detail
        await self._save()

    async def note(self, step_id: str, detail: str) -> None:
        self.steps[step_id].detail = detail
        await self._save()

    async def complete(self, step_id: str, detail: str | None = None, *, save: bool = True) -> None:
        self._end(step_id, "complete", detail)
        if save:
            await self._save()

    async def skip(self, step_id: str, detail: str) -> None:
        self._end(step_id, "skipped", detail)
        await self._save()

    def end_running(self, status: StepStatus) -> None:
        """Mark whatever was mid-flight when the check failed or was cancelled; stages never reached stay pending."""
        for step in self.steps.values():
            if step.status == "running":
                step.status = status
                step.ended_at = _now()

    def apply(self, report: Report) -> None:
        report.steps = list(self.steps.values())

    def _end(self, step_id: str, status: StepStatus, detail: str | None) -> None:
        step = self.steps[step_id]
        step.status = status
        step.ended_at = _now()
        if detail is not None:
            step.detail = detail

    async def _save(self) -> None:
        async with self._lock:
            report = await load_report(self.report_id)
            if report is None or report.status != "analyzing":
                return
            self.apply(report)
            await save_report(report)


def _now() -> datetime:
    return datetime.now(timezone.utc)
