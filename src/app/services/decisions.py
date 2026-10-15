"""OpenAI's Decisions API: typed, calibrated answers to narrow questions about an input we supply.

We use it where a decision has to be trustworthy and its uncertainty visible, after an LLM has done the research.
It only judges the input it's given; it doesn't search. https://developers.openai.com/api/docs/guides/decisions
"""

import json
import logging
from dataclasses import dataclass
from functools import cache

import openai

from app.config import get_settings

log = logging.getLogger(__name__)


@dataclass
class Choice:
    choice: str
    probabilities: dict[str, float]
    # How concentrated the probabilities are, 0-1 (not the chance the choice is right)
    confidence: float


@cache
def _client() -> openai.AsyncOpenAI:
    # Always OpenAI direct: decisions aren't available through OpenRouter. The SDK retries 429s and 5xx itself
    return openai.AsyncOpenAI(api_key=get_settings().openai_api_key, max_retries=3, timeout=30)


def _encode(input: str | dict | list) -> str:
    return input if isinstance(input, str) else json.dumps(input, ensure_ascii=False)


async def predicates(input: str | dict | list, questions: dict[str, str]) -> dict[str, float] | None:
    """Probability (0-1) that each statement holds for the input, by question name, all in one request.

    None when decisions aren't configured or the call fails. A refused question is left out of the result.
    """
    if not get_settings().has_decisions or not questions:
        return None
    try:
        decision = await _client().decisions.create(
            model=get_settings().decision_model,
            input=_encode(input),
            questions=[{"type": "predicate", "name": name, "instructions": text} for name, text in questions.items()],
        )
    except openai.OpenAIError as exc:
        log.warning("Decisions request failed: %s", exc)
        return None
    return {a.name: a.probability for a in decision.answers if a.type == "predicate" and a.name in questions}


async def choice(input: str | dict, instructions: str, choices: dict[str, str]) -> Choice | None:
    """One choice question about the input. None when decisions aren't configured, the model refuses, or the call fails."""
    settings = get_settings()
    if not settings.has_decisions:
        return None
    try:
        decision = await _client().decisions.create(
            model=settings.decision_model,
            input=_encode(input),
            questions=[
                {
                    "type": "choice",
                    "name": "answer",
                    "instructions": instructions,
                    "choices": [{"value": value, "description": description} for value, description in choices.items()],
                }
            ],
        )
    except openai.OpenAIError as exc:
        log.warning("Decisions request failed: %s", exc)
        return None

    answer = decision.answers[0] if decision.answers else None
    if answer is None or answer.type != "choice":
        log.info("No decision returned (%s)", answer.type if answer else "empty")
        return None
    return Choice(
        choice=str(answer.choice),
        probabilities={str(p.value): p.probability for p in answer.probabilities},
        confidence=answer.confidence,
    )
