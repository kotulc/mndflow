"""Choosing what to ask next.

The conversation is a loop, not a script. Which question is asked depends on
the domain driving the project and on what the selected document is still
missing: a document with no text is asked for some, a document with parts to
connect is asked how they connect, and anything else is asked what it contains.

Selecting in the tree is how the user steers — it names the document every
question is about. Nothing here decides what to change; it only decides what to
ask.
"""

import random
from functools import cache

from server import workflows
from server.models import Graph, Node
from server.mutate import similarity

CHIP_LIMIT = 4
ENTRY = "entry"
FREEFORM = "freeform"
MATCH = 0.3
RHYTHM = 2


def children(graph: Graph, parent: str | None) -> list[Node]:
    """Nodes directly beneath a document, or the top level when None. A node
    whose parent has been undone counts as top level, not as lost."""
    return [node for node in graph.nodes.values()
            if (node.parent if node.parent in graph.nodes else None) == parent]


@cache
def _welcome(count: int) -> int:
    """Index of this session's greeting. Chosen once so the opening line does
    not change under the user between refreshes."""
    return random.randrange(count)


def entry_step(catalogue: workflows.Entry) -> workflows.WorkflowStep:
    """The opening question, offering one chip per domain."""
    welcome = catalogue.welcome[_welcome(len(catalogue.welcome))]

    return workflows.WorkflowStep(
        id=ENTRY,
        prompt=welcome,
        choices=[template.chip for template in catalogue.templates],
        hint=catalogue.hint,
        placeholder=catalogue.placeholder,
    )


def classify(catalogue: workflows.Entry, said: str) -> str:
    """The domain an opening answer belongs to.

    A chip is taken at its word. Anything else is scored against the catalogue,
    and a weak match is not guessed at: it falls to the freeform domain, which
    the catalogue declares for exactly that purpose."""
    wanted = said.strip().casefold()
    for template in catalogue.templates:
        if template.chip.casefold() == wanted:
            return template.id

    scored = [(max(similarity(said, t.chip), similarity(said, t.about)), t.id)
              for t in catalogue.templates]
    score, best = max(scored, default=(0.0, FREEFORM))

    return best if score >= MATCH else FREEFORM


def eligible(operation: workflows.Operation, graph: Graph, scope: str | None) -> bool:
    """Whether an operation has anything to ask about at this selection."""
    match operation.when:
        case "no_summary":
            return scope is not None and not graph.specs.get(scope, "").strip()

        case "has_parts":
            return len(children(graph, scope)) > 1

        case _:
            return True


def pick(domain: workflows.Domain, graph: Graph, scope: str | None,
         recent: tuple[str, ...] = ()) -> workflows.Operation | None:
    """The operation to ask about next.

    An operation that has filled the last few turns steps aside while anything
    else is eligible. Someone listing the parts of a system should be left to
    finish the list, and then asked how the parts fit together — not made to
    alternate, and not asked the same thing forever."""
    operations = workflows.operations()
    ordered = ([op for op in operations if op.id == domain.lead]
               + [op for op in operations if op.id != domain.lead])
    ready = [op for op in ordered if eligible(op, graph, scope)]
    worn = recent[0] if len(recent) == RHYTHM and len(set(recent)) == 1 else ""

    return next(iter([op for op in ready if op.id != worn] or ready), None)


def chips(graph: Graph, scope: str | None, operation: workflows.Operation,
          wording: workflows.Wording) -> list[str]:
    """Suggested answers: whatever the domain declares, and the documents
    already in view when the question is about connecting them."""
    if wording.choices or operation.action != "link_modules":
        return wording.choices

    nearby = children(graph, scope) or list(graph.nodes.values())

    return [node.label for node in nearby if node.id != scope][:CHIP_LIMIT]


def question(graph: Graph, scope: str | None,
             recent: tuple[str, ...] = ()) -> workflows.WorkflowStep | None:
    """The next question: the opening one until a domain is chosen, then the
    loop over whichever document is selected."""
    if not graph.template:
        return entry_step(workflows.entry())

    domain = workflows.domain(graph.template)
    operation = pick(domain, graph, scope, recent)
    wording = domain.wording(operation.id, root=scope is None) if operation else None
    if wording is None:
        return None

    label = graph.nodes[scope].label if scope in graph.nodes else ""

    return workflows.WorkflowStep(
        id=operation.id,
        prompt=wording.prompt.format(label=label),
        choices=chips(graph, scope, operation, wording),
        hint=wording.hint.format(label=label),
        action=operation.action,
    )
