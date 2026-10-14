"""Pydantic -> strict JSON schema, shared by every LLM backend's structured-output tool."""

from typing import Any


def strict_schema(model) -> dict[str, Any]:
    """Pydantic schema -> strict tool schema: inline $defs, every object closed and fully required.

    Meets both Anthropic's and OpenAI's strict-mode rules: no $ref, additionalProperties: false, every
    property required (use `T | None` in the model for an optional field, not a default).
    """
    schema = model.model_json_schema()
    defs = schema.pop("$defs", {})

    def walk(node: Any) -> Any:
        if isinstance(node, dict):
            if "$ref" in node:
                return walk(defs[node["$ref"].split("/")[-1]])
            node = {k: walk(v) for k, v in node.items() if k not in ("title", "default")}
            if node.get("type") == "object" and "properties" in node:
                node["additionalProperties"] = False
                node["required"] = list(node["properties"])
            return node
        if isinstance(node, list):
            return [walk(item) for item in node]
        return node

    return walk(schema)
