"""Emit JSON Schema for the models the frontend consumes.

The server's Pydantic models are the single source of truth for the graph
shape; running this and json-schema-to-typescript keeps web/src/types.ts from
drifting away from them.
"""

import json
from pathlib import Path

from server.models import Graph, Step
from server.workflows import WorkflowStep

OUT = Path(__file__).resolve().parent.parent / "web" / "src" / "schema.json"


def main() -> None:
    """Write a combined schema document for the client-facing models."""
    schema = {
        "title": "mndflow",
        "type": "object",
        "properties": {
            "graph": Graph.model_json_schema(),
            "step": Step.model_json_schema(),
            "workflow_step": WorkflowStep.model_json_schema(),
        },
    }

    OUT.write_text(json.dumps(schema, indent=2), encoding="utf-8")
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
