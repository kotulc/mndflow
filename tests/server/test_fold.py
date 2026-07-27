"""Replay of mutations into a graph, and revert by re-projection."""

import pytest

from server.fold import apply_mutation, descends_from, fold, touched_ids
from server.models import (
    AddNode,
    DeleteNode,
    Edge,
    GroupNodes,
    Graph,
    LinkNodes,
    MoveNode,
    Node,
    SetTemplate,
    Step,
    UpdateNode,
    WriteSpec,
)


def test_fold_applied_step(applied_step):
    """An applied step contributes its nodes and edges to the graph."""
    graph = fold([applied_step])

    assert set(graph.nodes) == {"n_auth", "n_api"}
    assert graph.edges["e_1"].relation == "authenticates via"


def test_fold_skips_reverted(applied_step):
    """An undone step contributes nothing to the graph."""
    applied_step.status = "reverted"

    assert fold([applied_step]).nodes == {}


def test_fold_revert_middle_step(auth_node, api_node):
    """Reverting an earlier step drops its nodes but keeps later applied ones."""
    first = Step(status="reverted", mutations=[AddNode(node=auth_node)])
    second = Step(status="applied", mutations=[AddNode(node=api_node)])

    graph = fold([first, second])

    assert set(graph.nodes) == {"n_api"}


def test_fold_is_deterministic(applied_step):
    """Replaying the same log twice yields the same graph."""
    assert fold([applied_step]) == fold([applied_step])


def test_apply_update_node_partial(auth_node):
    """Empty fields on an update leave the existing value alone."""
    graph = Graph(nodes={"n_auth": auth_node})

    apply_mutation(graph, UpdateNode(id="n_auth", summary="Issues tokens."))

    assert graph.nodes["n_auth"].label == "Auth Service"
    assert graph.nodes["n_auth"].summary == "Issues tokens."


def test_apply_update_node_missing_target(auth_node):
    """An update against a reverted node is skipped, not raised."""
    graph = Graph()

    apply_mutation(graph, UpdateNode(id="n_auth", label="Renamed"))

    assert graph.nodes == {}


def test_apply_link_requires_both_endpoints(auth_node):
    """An edge is dropped when either endpoint is missing from the graph."""
    graph = Graph(nodes={"n_auth": auth_node})

    apply_mutation(graph, LinkNodes(edge=Edge(id="e_1", source="n_auth", target="n_gone")))

    assert graph.edges == {}


def test_apply_group_reparents_members(auth_node, api_node):
    """Grouping creates the parent and reparents each member."""
    graph = Graph(nodes={"n_auth": auth_node, "n_api": api_node})
    group = Node(id="n_edge", label="Edge Layer", kind="group")

    apply_mutation(graph, GroupNodes(group=group, members=["n_auth", "n_api"]))

    assert graph.nodes["n_edge"].kind == "group"
    assert graph.nodes["n_auth"].parent == "n_edge"
    assert graph.nodes["n_api"].parent == "n_edge"


@pytest.mark.parametrize("parent", ["n_api", None])
def test_apply_move_node_reparents(auth_node, api_node, parent):
    """A move sets the node's parent, and a null parent returns it to the root."""
    auth_node.parent = "n_api" if parent is None else None
    graph = Graph(nodes={"n_auth": auth_node, "n_api": api_node})

    apply_mutation(graph, MoveNode(id="n_auth", parent=parent))

    assert graph.nodes["n_auth"].parent == parent


def test_apply_move_node_refuses_cycle(auth_node, api_node):
    """A node cannot move under its own descendant — that would orphan the tree."""
    api_node.parent = "n_auth"
    graph = Graph(nodes={"n_auth": auth_node, "n_api": api_node})

    apply_mutation(graph, MoveNode(id="n_auth", parent="n_api"))

    assert graph.nodes["n_auth"].parent is None


def test_descends_from_walks_the_chain(auth_node, api_node):
    """Descent is transitive, and the root belongs to no one."""
    api_node.parent = "n_auth"
    graph = Graph(nodes={"n_auth": auth_node, "n_api": api_node})

    assert descends_from(graph, "n_api", "n_auth")
    assert not descends_from(graph, "n_auth", "n_api")
    assert not descends_from(graph, None, "n_auth")


def test_apply_write_spec_requires_node(auth_node):
    """Spec markdown is only stored for a node that exists."""
    graph = Graph(nodes={"n_auth": auth_node})

    apply_mutation(graph, WriteSpec(id="n_auth", body="# Auth"))
    apply_mutation(graph, WriteSpec(id="n_gone", body="# Ghost"))

    assert graph.specs == {"n_auth": "# Auth"}


def test_apply_delete_node_takes_its_document(auth_node):
    """Deleting a node deletes the document it is — they are the same thing."""
    graph = Graph(nodes={"n_auth": auth_node}, specs={"n_auth": "Issues tokens."})

    apply_mutation(graph, DeleteNode(id="n_auth"))

    assert graph.nodes == {}
    assert graph.specs == {}


def test_apply_delete_node_takes_its_descendants(auth_node, api_node):
    """A delete removes everything nested beneath, as a folder delete does."""
    api_node.parent = "n_auth"
    graph = Graph(nodes={"n_auth": auth_node, "n_api": api_node})

    apply_mutation(graph, DeleteNode(id="n_auth"))

    assert graph.nodes == {}


def test_apply_delete_node_drops_its_edges(auth_node, api_node):
    """An edge to a deleted node would dangle, so it goes with it."""
    graph = Graph(
        nodes={"n_auth": auth_node, "n_api": api_node},
        edges={"e_1": Edge(id="e_1", source="n_api", target="n_auth")},
    )

    apply_mutation(graph, DeleteNode(id="n_auth"))

    assert graph.edges == {}


def test_apply_set_template(auth_node):
    """The domain driving the conversation folds like any other change."""
    graph = Graph()

    apply_mutation(graph, SetTemplate(template="writing"))

    assert graph.template == "writing"


def test_undoing_the_template_returns_to_no_domain():
    """Reverting the opening step leaves the project unclaimed again."""
    step = Step(status="reverted", mutations=[SetTemplate(template="writing")])

    assert fold([step]).template == ""


def test_touched_ids_covers_every_op(auth_node, api_node):
    """Highlighting picks up nodes created, changed, linked, or grouped."""
    step = Step(
        mutations=[
            AddNode(node=auth_node),
            LinkNodes(edge=Edge(id="e_1", source="n_api", target="n_auth")),
            GroupNodes(group=Node(id="n_edge", label="Edge", kind="group"),
                       members=["n_api"]),
        ],
    )

    assert touched_ids(step) == {"n_auth", "n_api", "n_edge"}
