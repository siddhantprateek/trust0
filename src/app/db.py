from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from app.config import get_settings
from app.schemas import Report


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class ReportRow(Base):
    __tablename__ = "reports"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    # Hash of the canonical URL or text, used to reuse recent reports for the same content
    content_key: Mapped[str] = mapped_column(String(64), index=True)
    status: Mapped[str] = mapped_column(String(16))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    data: Mapped[dict] = mapped_column(JSON)


class MediaRow(Base):
    """Every media item we've fingerprinted. This is the index that links re-uploads across checks."""

    __tablename__ = "media"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    report_id: Mapped[str] = mapped_column(ForeignKey("reports.id"), index=True)
    url: Mapped[str] = mapped_column(Text)
    platform: Mapped[str] = mapped_column(String(32))
    account: Mapped[str] = mapped_column(String(256), default="")
    posted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    duration: Mapped[float | None] = mapped_column(nullable=True)
    # Perceptual hashes (hex) of sampled keyframes, in order
    frame_hashes: Mapped[list] = mapped_column(JSON)


settings = get_settings()
settings.data_dir.mkdir(parents=True, exist_ok=True)
engine = create_async_engine(settings.database_url)
Session = async_sessionmaker(engine, expire_on_commit=False)


async def init_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def save_report(report: Report, content_key: str | None = None) -> None:
    async with Session() as session:
        row = await session.get(ReportRow, report.id)
        data = report.model_dump(mode="json")
        if row is None:
            session.add(ReportRow(id=report.id, content_key=content_key or "", status=report.status, created_at=report.created_at, data=data))
        else:
            row.status = report.status
            row.data = data
        await session.commit()


async def load_report(report_id: str) -> Report | None:
    async with Session() as session:
        row = await session.get(ReportRow, report_id)
        return Report.model_validate(row.data) if row else None


async def find_recent_report(content_key: str, since: datetime) -> Report | None:
    """A finished or still-running report for the same content, so repeat checks don't redo the work."""
    async with Session() as session:
        row = await session.scalar(
            select(ReportRow)
            .where(ReportRow.content_key == content_key, ReportRow.created_at >= since, ReportRow.status != "failed")
            .order_by(ReportRow.created_at.desc())
        )
        return Report.model_validate(row.data) if row else None


async def list_reports(limit: int = 50) -> list[Report]:
    async with Session() as session:
        rows = await session.scalars(select(ReportRow).order_by(ReportRow.created_at.desc()).limit(limit))
        return [Report.model_validate(row.data) for row in rows]


async def add_media(session: AsyncSession, row: MediaRow) -> None:
    session.add(row)
    await session.commit()
