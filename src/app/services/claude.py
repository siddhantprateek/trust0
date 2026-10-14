"""Claude research helper: web search + web fetch, with findings returned through a strict tool."""

import json
import logging
from typing import TypeVar

import anthropic
from pydantic import BaseModel, ValidationError

from app.config import get_settings
from app.services.schema import strict_schema

log = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)

# Server-side fallback re-runs a request on another model if Claude Opus 5.5's safety classifiers decline it
FALLBACK_BETA = "server-side-fallback-2026-07-01"
MAX_TURNS = 8

_client: anthropic.AsyncAnthropic | None = None


def client() -> anthropic.AsyncAnthropic:
    global _client
    if _client is None:
        _client = anthropic.AsyncAnthropic(api_key=get_settings().anthropic_api_key, max_retries=3)
    return _client


async def research(*, system: str, prompt: str, output: type[T], max_searches: int = 8, max_fetches: int = 6) -> T | None:
    """Let Claude research with web tools, then return its findings as `output`. None if it can't finish."""
    tools = [
        {"type": "web_search_20260209", "name": "web_search", "max_uses": max_searches},
        {"type": "web_fetch_20260209", "name": "web_fetch", "max_uses": max_fetches},
        {
            "name": "submit_findings",
            "description": "Submit your final findings. Call this exactly once, after you have finished researching.",
            "strict": True,
            "input_schema": strict_schema(output),
        },
    ]
    messages: list[dict] = [{"role": "user", "content": prompt}]

    for _ in range(MAX_TURNS):
        try:
            response = await client().beta.messages.create(
                model=get_settings().claude_model,
                max_tokens=16000,
                betas=[FALLBACK_BETA],
                fallbacks="default",
                output_config={"effort": "medium"},
                system=system,
                messages=messages,
                tools=tools,
            )
        except anthropic.RateLimitError:
            log.warning("Claude rate limited")
            return None
        except anthropic.APIStatusError as exc:
            log.error("Claude API error %s: %s", exc.status_code, exc.message)
            return None
        except anthropic.APIConnectionError:
            log.error("Could not reach the Claude API")
            return None

        if response.stop_reason == "refusal":
            log.warning("Claude declined the research request: %s", response.stop_details)
            return None

        submit = next((b for b in response.content if b.type == "tool_use" and b.name == "submit_findings"), None)
        if submit is not None:
            try:
                return output.model_validate(submit.input if isinstance(submit.input, dict) else json.loads(submit.input))
            except (ValidationError, json.JSONDecodeError) as exc:
                log.error("Claude findings did not match the schema: %s", exc)
                return None

        messages.append({"role": "assistant", "content": response.content})
        if response.stop_reason == "pause_turn":
            # Server-side search loop hit its iteration cap; resending the turn resumes it
            continue
        messages.append({"role": "user", "content": "Finish now: call submit_findings with what you have found."})

    log.warning("Claude research ended without findings")
    return None
