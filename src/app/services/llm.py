"""Dispatches research() to whichever backend `LLM_PROVIDER` names (see app.config.Settings.llm_provider).

The pipeline (factcheck.py, provenance.py) imports this module, never app.services.claude or
app.services.openai_compat directly, so it doesn't need to know or care which backend is active.
"""

from pydantic import BaseModel
from typing import TypeVar

from app.config import get_settings
from app.services import claude, openai_compat

T = TypeVar("T", bound=BaseModel)


async def research(*, system: str, prompt: str, output: type[T], max_searches: int = 8, max_fetches: int = 6) -> T | None:
    if get_settings().llm_provider == "anthropic":
        return await claude.research(system=system, prompt=prompt, output=output, max_searches=max_searches, max_fetches=max_fetches)
    return await openai_compat.research(system=system, prompt=prompt, output=output, max_searches=max_searches, max_fetches=max_fetches)
