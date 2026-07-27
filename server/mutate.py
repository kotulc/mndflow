"""Translation of a model intent into concrete graph mutations.

The model emits labels, never ids — a small local model cannot reliably track
opaque identifiers across turns. Resolving labels to nodes happens here, in
code, where a miss is a caught error rather than a corrupt graph.

Matching is exact. A name that does not match is not guessed at: `rank` orders
the nearest existing labels so the caller can ask the user which they meant.
"""

import math
from collections import Counter

from server.models import (
    AddNode,
    Edge,
    Graph,
    Intent,
    LinkNodes,
    Mutation,
    Node,
    UpdateNode,
    WriteSpec,
    new_id,
)


def resolve(graph: Graph, label: str) -> str | None:
    """Node id for a label, matching exactly and not otherwise.

    A loose match is a silent wrong answer; an exact one is either right or
    absent. Everything that fails here becomes a question for the user."""
    wanted = label.strip().casefold()
    if not wanted:
        return None

    return next((node.id for node in graph.nodes.values()
                 if node.label.casefold() == wanted), None)


def _trigrams(text: str) -> Counter[str]:
    """Character trigrams of a label, padded so short labels still overlap."""
    padded = f"  {text.casefold().strip()}  "

    return Counter(padded[index:index + 3] for index in range(len(padded) - 2))


def similarity(left: str, right: str) -> float:
    """Cosine similarity of two labels over their character trigrams."""
    first, second = _trigrams(left), _trigrams(right)
    shared = set(first) & set(second)
    if not shared:
        return 0.0

    dot = sum(first[gram] * second[gram] for gram in shared)
    size = math.sqrt(sum(count**2 for count in first.values()))
    size *= math.sqrt(sum(count**2 for count in second.values()))

    return dot / size if size else 0.0


def rank(graph: Graph, label: str, limit: int = 4) -> list[str]:
    """Existing labels most like the one given, closest first.

    Only used to order the options put in front of the user, so a rough
    ranking is enough — the choice itself is always theirs."""
    scored = sorted(
        ((similarity(label, node.label), node.label) for node in graph.nodes.values()),
        key=lambda pair: (-pair[0], pair[1]),
    )

    return [name for score, name in scored[:limit] if score > 0]


def plan(graph: Graph, intent: Intent, said: str = "", create: str = "") -> list[Mutation]:
    """Mutations an intent implies. Unresolvable references yield nothing,
    which the caller turns into a question rather than a guess.

    `said` is the user's own words. The model supplies a short label and a
    summary; the document body is what the user actually wrote, so nothing
    they said is lost to a paraphrase.

    `create` names the one intent slot the user has confirmed holds something
    new. Only that slot may bring a node into being, so a turn can never invent
    a document on the model's say-so, and two unknown names are asked about one
    at a time rather than conjured together."""
    match intent.action:
        case "add_module":
            return _plan_add(graph, intent, said)

        case "link_modules":
            return _plan_link(graph, intent, create)

        case "describe_module":
            return _plan_describe(graph, intent, said, create)

        case _:
            return []


def _plan_add(graph: Graph, intent: Intent, said: str) -> list[Mutation]:
    """New module, nested under the named parent when one resolves."""
    if not intent.label.strip() or resolve(graph, intent.label):
        return []

    node = Node(
        id=new_id("n"),
        label=intent.label.strip(),
        parent=resolve(graph, intent.parent_label),
        summary=intent.summary.strip(),
    )
    mutations: list[Mutation] = [AddNode(node=node)]
    if said.strip():
        mutations.append(WriteSpec(id=node.id, body=said.strip()))

    return mutations


def _make(graph: Graph, intent: Intent, slot: str, create: str) -> tuple[str, list[Mutation]]:
    """Node id for one intent slot, and what it took to get it.

    A name that resolves costs nothing. One that does not is created only if
    the user has said that is what they meant; otherwise the caller is left
    with nothing to apply, which is what stalls the turn into a question."""
    wanted = getattr(intent, slot).strip()
    if (node_id := resolve(graph, wanted)) is not None:
        return node_id, []
    if slot != create or not wanted:
        return "", []

    node = Node(id=new_id("n"), label=wanted)

    return node.id, [AddNode(node=node)]


def _plan_link(graph: Graph, intent: Intent, create: str = "") -> list[Mutation]:
    """Edge between two nodes, creating whichever endpoint the user asked for."""
    source, made = _make(graph, intent, "label", create)
    target, more = _make(graph, intent, "target_label", create)
    if not source or not target or source == target:
        return []

    edge = Edge(id=new_id("e"), source=source, target=target,
                relation=intent.relation.strip())

    return [*made, *more, LinkNodes(edge=edge)]


def _plan_describe(graph: Graph, intent: Intent, said: str, create: str = "") -> list[Mutation]:
    """Summary on the node plus the matching specification document."""
    node_id, made = _make(graph, intent, "label", create)
    summary = intent.summary.strip()
    body = said.strip() or summary
    if not node_id or not body:
        return []

    return [*made, UpdateNode(id=node_id, summary=summary), WriteSpec(id=node_id, body=body)]
