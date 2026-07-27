"""Intent interpretation against a local OpenAI-compatible server.

One constrained JSON response per turn — no tool calling and no agent loop,
both of which are unreliable at small model sizes. The Intent schema is passed
as a decoding grammar, so malformed output is impossible by construction.

Context is deliberately narrow: small models degrade well before their
advertised window, so a slice of the graph is sent, never all of it.

The model is never asked which existing node a name refers to. It returns the
label the user used; matching that to a node is `mutate`'s job, and anything
it cannot match exactly becomes a question for the user.
"""

import json
import os
from functools import cache

from openai import OpenAI, OpenAIError
from pydantic import ValidationError

from server.models import Graph, Intent
from server.workflows import WorkflowStep

BASE_URL = os.getenv("MNDFLOW_BASE_URL", "http://localhost:1234/v1")
MODEL = os.getenv("MNDFLOW_MODEL", "gemma-4")
API_KEY = os.getenv("MNDFLOW_API_KEY", "not-needed")
MAX_CONTEXT_NODES = 24

SYSTEM = """You interpret a user's reply during a system design conversation.
Return one JSON object describing what the user wants, and nothing else.

A label is a name, not a sentence: 2-4 words, no trailing punctuation. Even
when the user writes a whole paragraph or a question, the label is the short
name for it — their own words are kept separately, so nothing is lost by
naming it briefly.

Refer to existing modules by their exact label. Never invent identifiers.
Use "unclear" when the reply does not map cleanly onto one action.

Actions:
- add_module: a new module. Set label, and parent_label if it belongs inside one.
- link_modules: a dependency. Set label (source), target_label, relation.
- describe_module: what a module does. Set label and summary.
- answer_choice: the user picked one of the offered choices. Set choice.
- unclear: anything else."""

CHOOSE = """You match what a user says to the closest option from a fixed list.
Return one JSON object holding the chosen option and nothing else.
Always pick the nearest option. Never invent one."""


@cache
def _client() -> OpenAI:
    """Client pointed at the local inference server, kept between calls so its
    connection pool is reused. Nothing is retried: a server on this machine
    either answers or is not running, and a turn that falls back costs the user
    far less than one that hangs."""
    return OpenAI(base_url=BASE_URL, api_key=API_KEY, max_retries=0)


def choose(options: dict[str, str], said: str) -> str:
    """The option a free-text answer is closest to, or "" if none could be had.

    A separate call from `interpret`, and a far easier one: the model is handed
    a list and asked to point at it, with the schema enumerating the only
    answers it can give. Asking one question at a time is what makes a small
    model reliable — interpreting a reply and classifying it are two questions.

    `options` maps each option to what it means, which is what a description
    gets matched against. The caller falls back to its own scoring on "".
    """
    if not options:
        return ""

    body = {
        "type": "object",
        "properties": {"choice": {"type": "string", "enum": list(options)}},
        "required": ["choice"],
        "additionalProperties": False,
    }
    listing = "\n".join(f"- {option}: {about}" for option, about in options.items())

    try:
        response = _client().chat.completions.create(
            model=MODEL,
            temperature=0,
            messages=[
                {"role": "system", "content": CHOOSE},
                {"role": "user", "content": f"Options:\n{listing}\n\nUser: {said}"},
            ],
            response_format={"type": "json_schema",
                             "json_schema": {"name": "choice", "strict": True, "schema": body}},
        )

        return json.loads(response.choices[0].message.content or "{}").get("choice", "")
    except (json.JSONDecodeError, OpenAIError, AttributeError) as error:
        print(f"choose failed: {error}")

        return ""


def context(graph: Graph, step: WorkflowStep | None, scope: str | None = None) -> str:
    """Scoped prompt context: the active question, the selected document, and
    nearby modules only."""
    lines: list[str] = []

    if step is not None:
        lines.append(f"Question: {step.prompt}")
        if step.choices:
            lines.append(f"Choices: {', '.join(step.choices)}")
        if step.action:
            lines.append(f'Use the "{step.action}" action unless the reply plainly is not one.')

    if (selected := graph.nodes.get(scope or "")) is not None:
        lines.append(f'Selected module: {selected.label} — "it" means this one.')

    nodes = list(graph.nodes.values())[-MAX_CONTEXT_NODES:]
    if nodes:
        lines.append("Existing modules:")
        lines.extend(f"- {node.label}" for node in nodes)

    return "\n".join(lines)


def interpret(graph: Graph, user_input: str, step: WorkflowStep | None = None,
              scope: str | None = None) -> Intent:
    """Map one user turn onto a validated Intent, or `unclear` on any failure."""
    body = Intent.model_json_schema()
    body["additionalProperties"] = False

    # The workflow owns control flow, so a question that asks for one operation
    # constrains the grammar to it and the model is left only filling slots.
    # Given the choice, a small model answers "name the parts" by describing the
    # whole, or by reaching for "unclear" on a reply that was perfectly clear.
    # A wrong guess is visible on the canvas and one undo away; a dropped turn
    # looks like the question was never answered at all.
    if step is not None and step.action:
        body["properties"]["action"] = {"type": "string", "enum": [step.action]}

    schema = {"name": "intent", "strict": True, "schema": body}
    prompt = f"{context(graph, step, scope)}\n\nUser reply: {user_input}".strip()

    try:
        response = _client().chat.completions.create(
            model=MODEL,
            temperature=0,
            messages=[
                {"role": "system", "content": SYSTEM},
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_schema", "json_schema": schema},
        )

        return Intent.model_validate_json(response.choices[0].message.content or "{}")
    except (ValidationError, json.JSONDecodeError, OpenAIError) as error:
        # A turn must never crash the session: an unreachable server or an
        # off-schema reply both surface as "unclear", changing nothing.
        print(f"interpret failed: {error}")

        return Intent(action="unclear")
