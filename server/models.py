"""Core schema for the system graph, model intents, mutations, and the step log.

These models are the single contract shared by the HTTP API, the disk
projection, and the JSON schema handed to the local model for constrained
decoding. Nothing else should define these shapes.
"""

from datetime import datetime, timezone
from typing import Annotated, Literal
from uuid import uuid4

from pydantic import BaseModel, Field


def new_id(prefix: str) -> str:
    """Short, readable identifier for a graph or log entity."""
    return f"{prefix}_{uuid4().hex[:8]}"


def now() -> datetime:
    """Timezone-aware creation timestamp."""
    return datetime.now(timezone.utc)


# --- Graph -----------------------------------------------------------------

NodeKind = Literal["module", "group", "external"]


class Node(BaseModel):
    """One module or grouping in the system graph.

    `x`/`y` are set only once the user has dragged the node. Until then they
    are None and the canvas lays it out, so an automatic arrangement is never
    fighting a position somebody chose."""

    id: str
    label: str
    kind: NodeKind = "module"
    parent: str | None = None
    summary: str = ""
    x: float | None = None
    y: float | None = None


class Edge(BaseModel):
    """Directed relation between two nodes."""

    id: str
    source: str
    target: str
    relation: str = ""


class Graph(BaseModel):
    """Full project state: nodes, edges, per-node documents, and the template
    driving the conversation. Documents live here and nowhere else — a node and
    its text are the same thing seen from the tree and from the canvas."""

    nodes: dict[str, Node] = Field(default_factory=dict)
    edges: dict[str, Edge] = Field(default_factory=dict)
    specs: dict[str, str] = Field(default_factory=dict)
    template: str = ""
    title: str = ""


# --- Intent ----------------------------------------------------------------
# Deliberately flat with non-nullable string slots: nested unions and nulls
# make grammar-constrained decoding unreliable on small local models. Nodes are
# referenced by label, never by id — a small model cannot track opaque ids.

Action = Literal[
    "add_module",
    "link_modules",
    "describe_module",
    "answer_choice",
    "unclear",
]


class Intent(BaseModel):
    """One constrained interpretation of a user turn."""

    action: Action
    label: str = ""
    parent_label: str = ""
    target_label: str = ""
    relation: str = ""
    summary: str = ""
    choice: str = ""


# --- Mutations -------------------------------------------------------------


class AddNode(BaseModel):
    """Introduce a new node, optionally nested under an existing parent."""

    op: Literal["add_node"] = "add_node"
    node: Node


class UpdateNode(BaseModel):
    """Revise an existing node's label or summary. Empty means unchanged."""

    op: Literal["update_node"] = "update_node"
    id: str
    label: str = ""
    summary: str = ""


class MoveNode(BaseModel):
    """Re-parent an existing node — what a move in the file tree records."""

    op: Literal["move_node"] = "move_node"
    id: str
    parent: str | None = None


class DeleteNode(BaseModel):
    """Remove a node and everything nested beneath it — a delete in the tree."""

    op: Literal["delete_node"] = "delete_node"
    id: str


class PlaceNode(BaseModel):
    """Pin a node where the user dragged it on the canvas."""

    op: Literal["place_node"] = "place_node"
    id: str
    x: float
    y: float


class LinkNodes(BaseModel):
    """Connect two existing nodes with a labelled relation."""

    op: Literal["link_nodes"] = "link_nodes"
    edge: Edge


class UpdateEdge(BaseModel):
    """Rename a relation without disturbing what it connects."""

    op: Literal["update_edge"] = "update_edge"
    id: str
    relation: str


class DeleteEdge(BaseModel):
    """Remove one relation."""

    op: Literal["delete_edge"] = "delete_edge"
    id: str


class GroupNodes(BaseModel):
    """Wrap existing nodes in a new parent — the abstraction step."""

    op: Literal["group_nodes"] = "group_nodes"
    group: Node
    members: list[str]


class WriteSpec(BaseModel):
    """Replace the specification markdown for one node."""

    op: Literal["write_spec"] = "write_spec"
    id: str
    body: str


class SetTemplate(BaseModel):
    """Record which domain template drives the conversation. Applied by the
    opening turn, and unwound by undoing it like anything else."""

    op: Literal["set_template"] = "set_template"
    template: str


class SetTitle(BaseModel):
    """Name the project itself — the root of the tree, which is not a node."""

    op: Literal["set_title"] = "set_title"
    title: str


Mutation = Annotated[
    AddNode | UpdateNode | MoveNode | PlaceNode | DeleteNode
    | LinkNodes | UpdateEdge | DeleteEdge | GroupNodes | WriteSpec
    | SetTemplate | SetTitle,
    Field(discriminator="op"),
]


# --- Step log --------------------------------------------------------------

StepStatus = Literal["applied", "reverted"]


class Step(BaseModel):
    """One user turn and the mutations it applied. A turn takes effect
    immediately; undo appends a status record rather than asking first."""

    id: str = Field(default_factory=lambda: new_id("step"))
    workflow_step: str = ""
    user_input: str = ""
    intent: Intent | None = None
    mutations: list[Mutation] = Field(default_factory=list)
    status: StepStatus = "applied"
    created_at: datetime = Field(default_factory=now)
