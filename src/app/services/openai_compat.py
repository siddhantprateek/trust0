"""Research via an OpenAI-compatible backend: OpenAI direct (Responses API, hosted web_search) or OpenRouter
(Chat Completions API, proxying to whatever model openrouter_model names, with OpenRouter's "web" plugin for
live search). Same `research()` shape as app.services.claude, so the pipeline doesn't care which is active.
"""

import json
import logging
from typing import TypeVar

import openai
from pydantic import BaseModel, ValidationError

from app.config import get_settings
from app.services.schema import strict_schema

log = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)

MAX_TURNS = 8
TOOL_NAME = "submit_findings"
TOOL_DESCRIPTION = "Submit your final findings. Call this exactly once, after you have finished researching."

_client: openai.AsyncOpenAI | None = None


def client() -> openai.AsyncOpenAI:
    global _client
    if _client is None:
        settings = get_settings()
        if settings.llm_provider == "openrouter":
            _client = openai.AsyncOpenAI(api_key=settings.openrouter_api_key, base_url=settings.openrouter_base_url, max_retries=3)
        else:
            _client = openai.AsyncOpenAI(api_key=settings.openai_api_key, max_retries=3)
    return _client


async def research(*, system: str, prompt: str, output: type[T], max_searches: int = 8, max_fetches: int = 6) -> T | None:
    """Let the model research with web access, then return its findings as `output`. None if it can't finish."""
    try:
        if get_settings().llm_provider == "openrouter":
            return await _research_openrouter(system=system, prompt=prompt, output=output)
        return await _research_openai(system=system, prompt=prompt, output=output)
    except openai.RateLimitError:
        log.warning("LLM rate limited")
        return None
    except openai.APIStatusError as exc:
        log.error("LLM API error %s: %s", exc.status_code, exc.message)
        return None
    except openai.APIConnectionError:
        log.error("Could not reach the LLM API")
        return None


def _parse(output: type[T], arguments: str) -> T | None:
    try:
        return output.model_validate(json.loads(arguments))
    except (ValidationError, json.JSONDecodeError) as exc:
        log.error("LLM findings did not match the schema: %s", exc)
        return None


# --- OpenAI direct: Responses API, hosted web_search tool, previous_response_id chains the turns ------------


async def _research_openai(*, system: str, prompt: str, output: type[T]) -> T | None:
    settings = get_settings()
    tools = [
        {"type": "web_search"},
        {"type": "function", "name": TOOL_NAME, "description": TOOL_DESCRIPTION, "strict": True, "parameters": strict_schema(output)},
    ]
    previous_response_id: str | None = None
    next_input = prompt

    for _ in range(MAX_TURNS):
        response = await client().responses.create(
            model=settings.openai_model,
            instructions=system if previous_response_id is None else None,
            input=next_input,
            previous_response_id=previous_response_id,
            tools=tools,
        )
        previous_response_id = response.id

        call = next((item for item in response.output if item.type == "function_call" and item.name == TOOL_NAME), None)
        if call is not None:
            return _parse(output, call.arguments)

        if response.status == "incomplete":
            log.warning("OpenAI response incomplete: %s", response.incomplete_details)
            return None

        next_input = f"Finish now: call {TOOL_NAME} with what you have found."

    log.warning("OpenAI research ended without findings")
    return None


# --- OpenRouter: Chat Completions, the "web" plugin augments every call regardless of the model ---------------


async def _research_openrouter(*, system: str, prompt: str, output: type[T]) -> T | None:
    settings = get_settings()
    tools = [{"type": "function", "function": {"name": TOOL_NAME, "description": TOOL_DESCRIPTION, "strict": True, "parameters": strict_schema(output)}}]
    messages: list[dict] = [{"role": "system", "content": system}, {"role": "user", "content": prompt}]

    for _ in range(MAX_TURNS):
        response = await client().chat.completions.create(
            model=settings.openrouter_model,
            messages=messages,
            tools=tools,
            tool_choice="auto",
            extra_body={"plugins": [{"id": "web"}]},
        )
        message = response.choices[0].message

        call = next((tc for tc in (message.tool_calls or []) if tc.function.name == TOOL_NAME), None)
        if call is not None:
            return _parse(output, call.function.arguments)

        messages.append(message.model_dump(exclude_none=True))
        messages.append({"role": "user", "content": f"Finish now: call {TOOL_NAME} with what you have found."})

    log.warning("OpenRouter research ended without findings")
    return None
