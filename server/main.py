"""HTTP API tying the log, the model, and the question machine together.

Every turn applies immediately. The user is never asked to confirm a change —
they see what it did on the canvas and undo it if it was wrong.

Nothing is stored outside the process. Documents are graph nodes, the graph is
folded from an in-memory log, and `scope` — the document selected in the tree —
is what every question is about.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from server import fold, group, interpret, mutate, router, workflows
from server.log import StepLog
from server.models import (
    AddNode,
    DeleteEdge,
    DeleteNode,
    Edge,
    Graph,
    Intent,
    LinkNodes,
    MoveNode,
    Node,
    PlaceNode,
    SetTemplate,
    SetTitle,
    Step,
    UpdateEdge,
    UpdateNode,
    WriteSpec,
    new_id,
)

LOG = StepLog()

app = FastAPI(title="mndflow")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class TurnRequest(BaseModel):
    """A user reply to the active question."""

    input: str


class NodeRequest(BaseModel):
    """A new document, optionally nested inside an existing one."""

    label: str
    parent: str | None = None


class MoveRequest(BaseModel):
    """A request to re-parent a node. A null parent moves it to the top level."""

    parent: str | None = None


class RenameRequest(BaseModel):
    """A request to relabel a node the model named badly."""

    label: str


class BodyRequest(BaseModel):
    """A request to replace a document's text."""

    body: str


class PlaceRequest(BaseModel):
    """Where the user dragged a node to on the canvas."""

    x: float
    y: float


class LinkRequest(BaseModel):
    """A relation drawn by hand between two documents."""

    source: str
    target: str
    relation: str = ""


class RelationRequest(BaseModel):
    """New wording for an existing relation."""

    relation: str


class GroupRequest(BaseModel):
    """A request to wrap sibling nodes in a new parent."""

    members: list[str]
    label: str = ""


AMBIGUOUS = "disambiguate"
CREATE_IT = "+ create it"

# Intent slots that must name a document that already exists, in the order they
# are asked about. Anything else the model fills in is free text.
SLOTS = {"link_modules": ("label", "target_label"), "describe_module": ("label",)}


def unresolved(graph: Graph, intent: Intent | None) -> str:
    """Name of the first intent slot holding a document that does not exist.

    A turn that applied nothing always has one — the planner refuses to guess —
    and it is the slot to retarget once the user says what they meant."""
    if intent is None:
        return ""

    return next((slot for slot in SLOTS.get(intent.action, ())
                 if not mutate.resolve(graph, getattr(intent, slot))), "")


def ambiguity(graph: Graph, step: Step | None) -> workflows.WorkflowStep | None:
    """Question to ask when the last turn named no document it could use.

    Labels are matched exactly, so a near miss stalls the turn rather than
    writing to the wrong document. The user is shown the closest existing
    names, and the option to create what they meant — unless the model left the
    slot empty, in which case there is no name to create anything from and the
    documents already in the project are all there is to offer."""
    if step is None or step.mutations or step.intent is None:
        return None

    slot = unresolved(graph, step.intent)
    if not slot:
        return None

    wanted = getattr(step.intent, slot).strip()
    prompt = (f'Nothing here is called "{wanted}". Which did you mean?' if wanted
              else "Which document did you mean?")
    choices = ([*mutate.rank(graph, wanted), CREATE_IT] if wanted
               else [node.label for node in graph.nodes.values()][:router.CHIP_LIMIT])
    if not choices:
        return None

    return workflows.WorkflowStep(id=AMBIGUOUS, prompt=prompt, choices=choices,
                                  hint="Pick the one you meant.")


def nudge(question: workflows.WorkflowStep | None,
          step: Step | None) -> workflows.WorkflowStep | None:
    """Say so when a turn changed nothing.

    Re-asking a question unaltered reads as though the answer never arrived.
    A duplicate name or an empty one is a dead end, and the user can only see
    that if they are told."""
    if question is None or step is None or step.mutations or not step.workflow_step:
        return question

    return question.model_copy(update={"hint": f"Nothing came of that. {question.hint}".strip()})


def answered() -> tuple[str, ...]:
    """Questions the last few applied turns answered, most recent first —
    what gives the loop its rhythm."""
    asked = [s.workflow_step for s in LOG.steps() if s.status == "applied" and s.workflow_step]

    return tuple(reversed(asked[-router.RHYTHM:]))


def current_step(graph: Graph, scope: str | None) -> workflows.WorkflowStep | None:
    """Question to ask next: an unresolved reference first, then the loop."""
    last = LOG.last_applied()
    if (question := ambiguity(graph, last)) is not None:
        return question

    return nudge(router.question(graph, scope, answered()), last)


def action_of(step: Step) -> str:
    """Label for the action log — the model's intent, or the operation itself
    for steps the user performed directly."""
    if step.intent:
        return step.intent.action

    return step.mutations[0].op if step.mutations else "unclear"


def state(scope: str | None = None) -> dict:
    """Everything the client needs to render all three panes."""
    steps = LOG.steps()
    graph = fold.fold(steps)
    scope = scope if scope in graph.nodes else None
    last = LOG.last_applied()
    question = current_step(graph, scope)

    return {
        "graph": graph.model_dump(),
        "scope": scope,
        "touched": sorted(fold.touched_ids(last)) if last else [],
        "workflow_step": question.model_dump() if question else None,
        "history": [
            {"id": s.id, "input": s.user_input, "status": s.status,
             "action": action_of(s), "mutations": len(s.mutations)}
            for s in steps
        ],
    }


def commit(step: Step, scope: str | None) -> dict:
    """Record an applied step and hand back the state it produced."""
    LOG.append(step)

    return state(scope)


def anchored(intent: Intent, graph: Graph, scope: str | None) -> Intent:
    """Fill in what the selection already says.

    The answer was to a question about the selected document, so the model does
    not have to name it: a subject or parent it left blank or got wrong becomes
    the selection rather than a question."""
    if scope is None:
        return intent

    label = graph.nodes[scope].label
    if intent.action == "add_module" and not mutate.resolve(graph, intent.parent_label):
        return intent.model_copy(update={"parent_label": label})
    if intent.action in ("describe_module", "link_modules") and \
            not mutate.resolve(graph, intent.label):
        return intent.model_copy(update={"label": label})

    return intent


def clicked(question: workflows.WorkflowStep, said: str, graph: Graph,
            scope: str | None) -> Intent | None:
    """Intent for an answer that was clicked rather than typed.

    A chip is already the exact text of an option the application offered, so
    there is nothing left to interpret and the model is not worth waiting for.
    Which slot the text fills follows from the operation being asked about."""
    selected = graph.nodes[scope].label if scope in graph.nodes else ""
    chip = said.strip()
    if chip not in question.choices:
        return None

    match question.action:
        case "add_module":
            return Intent(action="add_module", label=chip)

        case "describe_module":
            return Intent(action="describe_module", label=selected, summary=chip)

        case "link_modules":
            # With a document selected the chip is the far end. At the project
            # level it is the near end, and the far end is the next question.
            return Intent(action="link_modules", label=selected or chip,
                          target_label=chip if selected else "")

        case _:
            return None


def begin(graph: Graph, said: str, question: workflows.WorkflowStep) -> Step:
    """The opening turn: it chooses the domain, names the project, and opens
    the first document, so the words that started it are not thrown away.

    A chip settles the domain outright. Free text takes two model calls,
    because it asks two things: which domain this is, and what to call it.
    Asked together, a description of a novel gets named well and filed under
    the catch-all."""
    catalogue = workflows.entry()
    picked = next((t for t in catalogue.templates if t.chip == said.strip()), None)

    if picked is not None:
        template, label = picked.id, picked.chip
        intent = Intent(action="answer_choice", choice=picked.chip)
    else:
        chosen = interpret.choose({t.chip: t.about for t in catalogue.templates}, said)
        template = router.classify(catalogue, chosen or said)
        intent = interpret.interpret(graph, said, question)
        label = intent.label.strip() or chosen.strip() or catalogue.chip(template)

    node = Node(id=new_id("n"), label=label)

    return Step(
        workflow_step=question.id,
        user_input=said,
        intent=intent,
        mutations=[SetTemplate(template=template), SetTitle(title=label),
                   AddNode(node=node), WriteSpec(id=node.id, body=said.strip())],
    )


def settle(graph: Graph, deferred: Step, said: str) -> Step:
    """Finish a stalled turn once the user has said what they meant.

    Picking an existing document retargets whichever name did not resolve;
    asking to create one keeps the name they used and authorises that node
    alone. Either way the document keeps the words of the turn that stalled,
    not the chip clicked to unstick it."""
    slot = unresolved(graph, deferred.intent)
    create = slot if said.strip() == CREATE_IT else ""
    intent = deferred.intent if create else deferred.intent.model_copy(update={slot: said.strip()})

    # The question this turn is still answering, so the loop's rhythm counts it
    # once rather than once per attempt it took to land.
    return Step(workflow_step=deferred.workflow_step, user_input=said, intent=intent,
                mutations=mutate.plan(graph, intent, deferred.user_input, create))


@app.get("/state")
def read_state(scope: str | None = None) -> dict:
    """Current graph, the question for this selection, and the history."""
    return state(scope)


@app.post("/turn")
def take_turn(request: TurnRequest, scope: str | None = None) -> dict:
    """Interpret a user reply and apply the mutations it implies."""
    graph = fold.fold(LOG.steps())
    scope = scope if scope in graph.nodes else None
    question = current_step(graph, scope)
    if question is None:
        raise HTTPException(400, "nothing to answer")

    if question.id == AMBIGUOUS:
        return commit(settle(graph, LOG.last_applied(), request.input), scope)
    if question.id == router.ENTRY:
        return commit(begin(graph, request.input, question), scope)

    # A clicked chip is a direct answer; only typed text needs interpreting.
    answer = clicked(question, request.input, graph, scope)
    if answer is None:
        answer = interpret.interpret(graph, request.input, question, scope)

    intent = anchored(answer, graph, scope)

    return commit(Step(
        workflow_step=question.id,
        user_input=request.input,
        intent=intent,
        mutations=mutate.plan(graph, intent, request.input),
    ), scope)


@app.post("/undo")
def undo(scope: str | None = None) -> dict:
    """Unwind the most recent applied step. Steps only ever undo in the order
    they were applied, so the client needs no step id."""
    last = LOG.last_applied()
    if last is None:
        raise HTTPException(400, "nothing to undo")

    LOG.set_status(last.id, "reverted")

    return state(scope)


@app.post("/project/rename")
def rename_project(request: RenameRequest, scope: str | None = None) -> dict:
    """Name the project. The tree's root is not a node, so it renames apart
    from the documents inside it."""
    label = request.label.strip()
    if not label:
        raise HTTPException(400, "a label cannot be empty")

    return commit(Step(user_input=f"rename project: {label}",
                       mutations=[SetTitle(title=label)]), scope)


@app.post("/nodes")
def create_node(request: NodeRequest, scope: str | None = None) -> dict:
    """Create a document outright, the way a file tree's "new" does."""
    graph = fold.fold(LOG.steps())
    label = request.label.strip()
    if not label:
        raise HTTPException(400, "a label cannot be empty")
    if request.parent is not None and request.parent not in graph.nodes:
        raise HTTPException(404, f"no such node: {request.parent}")

    node = Node(id=new_id("n"), label=label, parent=request.parent)

    return commit(Step(user_input=f"new: {label}", mutations=[AddNode(node=node)]), scope)


@app.delete("/nodes/{node_id}")
def delete_node(node_id: str, scope: str | None = None) -> dict:
    """Delete a document and everything nested inside it."""
    graph = fold.fold(LOG.steps())
    if node_id not in graph.nodes:
        raise HTTPException(404, f"no such node: {node_id}")

    step = Step(user_input=f"delete: {graph.nodes[node_id].label}",
                mutations=[DeleteNode(id=node_id)])

    return commit(step, None if scope == node_id else scope)


@app.post("/nodes/{node_id}/move")
def move_node(node_id: str, request: MoveRequest, scope: str | None = None) -> dict:
    """Re-parent a node — what a move in the file tree records."""
    graph = fold.fold(LOG.steps())
    if node_id not in graph.nodes:
        raise HTTPException(404, f"no such node: {node_id}")
    if request.parent is not None and fold.descends_from(graph, request.parent, node_id):
        raise HTTPException(400, "a node cannot move under its own descendant")

    step = Step(user_input=f"move: {graph.nodes[node_id].label}",
                mutations=[MoveNode(id=node_id, parent=request.parent)])

    return commit(step, scope)


@app.post("/nodes/{node_id}/rename")
def rename_node(node_id: str, request: RenameRequest, scope: str | None = None) -> dict:
    """Relabel a node. Labels are generated by the model, so the user needs a
    way to fix a bad one without losing the document beneath it."""
    graph = fold.fold(LOG.steps())
    label = request.label.strip()
    if node_id not in graph.nodes:
        raise HTTPException(404, f"no such node: {node_id}")
    if not label:
        raise HTTPException(400, "a label cannot be empty")

    step = Step(user_input=f"rename: {label}", mutations=[UpdateNode(id=node_id, label=label)])

    return commit(step, scope)


@app.post("/nodes/{node_id}/body")
def write_body(node_id: str, request: BodyRequest, scope: str | None = None) -> dict:
    """Replace a document's text — the file tree's edit."""
    graph = fold.fold(LOG.steps())
    if node_id not in graph.nodes:
        raise HTTPException(404, f"no such node: {node_id}")

    step = Step(user_input=f"edit: {graph.nodes[node_id].label}",
                mutations=[WriteSpec(id=node_id, body=request.body)])

    return commit(step, scope)


@app.post("/nodes/{node_id}/place")
def place_node(node_id: str, request: PlaceRequest, scope: str | None = None) -> dict:
    """Pin a node where it was dragged. Layout is automatic until the user
    positions something; from then on their arrangement is the one that
    counts."""
    graph = fold.fold(LOG.steps())
    if node_id not in graph.nodes:
        raise HTTPException(404, f"no such node: {node_id}")

    step = Step(user_input=f"place: {graph.nodes[node_id].label}",
                mutations=[PlaceNode(id=node_id, x=request.x, y=request.y)])

    return commit(step, scope)


@app.post("/edges")
def link_nodes(request: LinkRequest, scope: str | None = None) -> dict:
    """Draw a relation by hand between two documents."""
    graph = fold.fold(LOG.steps())
    missing = [end for end in (request.source, request.target) if end not in graph.nodes]
    if missing:
        raise HTTPException(404, f"no such node: {missing[0]}")
    if request.source == request.target:
        raise HTTPException(400, "a document cannot relate to itself")

    edge = Edge(id=new_id("e"), source=request.source, target=request.target,
                relation=request.relation.strip())

    return commit(Step(user_input=f"link: {graph.nodes[request.source].label}",
                       mutations=[LinkNodes(edge=edge)]), scope)


@app.post("/edges/{edge_id}/relation")
def relabel_edge(edge_id: str, request: RelationRequest, scope: str | None = None) -> dict:
    """Reword a relation. What it connects is unchanged."""
    graph = fold.fold(LOG.steps())
    if edge_id not in graph.edges:
        raise HTTPException(404, f"no such edge: {edge_id}")

    step = Step(user_input=f"relation: {request.relation.strip()}",
                mutations=[UpdateEdge(id=edge_id, relation=request.relation.strip())])

    return commit(step, scope)


@app.delete("/edges/{edge_id}")
def unlink_nodes(edge_id: str, scope: str | None = None) -> dict:
    """Remove a relation, leaving both documents in place."""
    graph = fold.fold(LOG.steps())
    if edge_id not in graph.edges:
        raise HTTPException(404, f"no such edge: {edge_id}")

    return commit(Step(user_input="unlink", mutations=[DeleteEdge(id=edge_id)]), scope)


@app.post("/group")
def group_nodes(request: GroupRequest, scope: str | None = None) -> dict:
    """Wrap sibling nodes in a new parent."""
    graph = fold.fold(LOG.steps())
    mutations = group.propose_group(graph, request.members, request.label)
    if not mutations:
        raise HTTPException(400, "need at least two known members to group")

    return commit(Step(user_input=f"group: {request.label}", mutations=list(mutations)), scope)


@app.get("/crowded")
def crowded() -> dict:
    """Parents past the clutter threshold — candidates for abstraction."""
    graph = fold.fold(LOG.steps())

    return {"crowded": {str(k): v for k, v in group.crowded_parents(graph).items()}}
