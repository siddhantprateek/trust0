import importlib.util
from functools import cache, lru_cache
from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Which backend does claim extraction, fact checking and provenance research. "anthropic" (default) uses
    # Claude's own web_search/web_fetch tools; the other two go through the OpenAI-compatible Chat Completions
    # API, so the same request shape reaches either OpenAI directly or any model OpenRouter proxies to.
    llm_provider: Literal["anthropic", "openai", "openrouter"] = "anthropic"

    anthropic_api_key: str = ""
    claude_model: str = "claude-opus-5-5"

    # OpenAI direct: Responses API, with OpenAI's own hosted web_search tool for live research.
    openai_api_key: str = ""
    openai_model: str = "gpt-5.1"

    # OpenRouter: one key reaches any model it proxies to (e.g. "openai/gpt-5.1", "anthropic/claude-sonnet-4.5",
    # "google/gemini-3-pro"). Web research comes from OpenRouter's own "web" plugin, not a per-model tool, so it
    # works the same regardless of which underlying model openrouter_model names.
    openrouter_api_key: str = ""
    openrouter_model: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1"

    serpapi_api_key: str = ""
    google_factcheck_api_key: str = ""
    hive_api_key: str = ""
    ytdlp_cookies_file: str = ""

    # Models that run on this machine; need the [local] extra (torch + transformers)
    # t0-vision: our fine-tuned AI-image detector (experiments/ai-detect). A checkpoint folder, e.g. C:/trust0-data/checkpoints/t0-vision/best
    t0_vision_model_path: str = ""
    # Whisper for videos with no captions. Any Hugging Face Whisper checkpoint; empty turns speech-to-text off
    whisper_model: str = "openai/whisper-large-v3-turbo"
    # "auto" uses the GPU when there is one. Set "cpu" while training on the GPU
    local_device: str = "auto"
    reddit_client_id: str = ""
    reddit_client_secret: str = ""

    # Try IPv4 addresses first. Needed on networks where DNS returns IPv6 but IPv6 traffic goes nowhere:
    # Python and yt-dlp wait out each IPv6 attempt instead of falling back quickly like browsers and curl.
    prefer_ipv4: bool = False

    data_dir: Path = Path("./data")
    cors_origins: str = "http://localhost:5173,http://localhost:5174"
    studio_url: str = "http://localhost:5173"

    # Limits that keep one check from tying up the server
    max_media_mb: int = 200
    max_video_seconds: int = 900
    keyframes: int = 16
    max_concurrent_checks: int = 4
    # How long POST /v1/checks waits for a result before handing back a report to poll
    check_wait_seconds: float = 25.0
    # Reuse a finished report for the same content within this window
    reuse_report_hours: int = 24
    # Keep each checked image or video so the studio can show it full size. Off keeps only a small thumbnail
    keep_media: bool = True

    @property
    def has_claude(self) -> bool:
        return self.llm_provider == "anthropic" and bool(self.anthropic_api_key)

    @property
    def has_llm(self) -> bool:
        """Claim extraction, fact checking and provenance research all gate on this, whichever backend it is."""
        if self.llm_provider == "anthropic":
            return bool(self.anthropic_api_key)
        if self.llm_provider == "openai":
            return bool(self.openai_api_key)
        return bool(self.openrouter_api_key and self.openrouter_model)

    @property
    def has_local_detector(self) -> bool:
        return bool(self.t0_vision_model_path) and Path(self.t0_vision_model_path).is_dir() and local_models_installed()

    @property
    def has_transcriber(self) -> bool:
        return bool(self.whisper_model) and local_models_installed()

    @property
    def has_ai_detector(self) -> bool:
        return bool(self.hive_api_key) or self.has_local_detector

    @property
    def media_dir(self) -> Path:
        return self.data_dir / "media"

    @property
    def previews_dir(self) -> Path:
        return self.data_dir / "previews"

    @property
    def database_url(self) -> str:
        return f"sqlite+aiosqlite:///{(self.data_dir / 'trust0.db').as_posix()}"


@cache
def local_models_installed() -> bool:
    return all(importlib.util.find_spec(name) for name in ("torch", "transformers"))


@lru_cache
def get_settings() -> Settings:
    return Settings()
