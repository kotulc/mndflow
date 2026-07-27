"""Deterministic abstraction heuristic.

Deciding *when* a cluster becomes a parent is structural, so it is code. The
model is only ever asked to name a group it did not choose to create.
"""

from collections import defaultdict

from server.models import Graph, GroupNodes, Node, new_id

MAX_CHILDREN = 7


def crowded_parents(graph: Graph, limit: int = MAX_CHILDREN) -> dict[str | None, list[str]]:
    """Parents whose direct children exceed the clutter threshold."""
    children: dict[str | None, list[str]] = defaultdict(list)
    for node in graph.nodes.values():
        children[node.parent].append(node.id)

    return {parent: ids for parent, ids in children.items() if len(ids) > limit}


def propose_group(graph: Graph, members: list[str], label: str) -> list[GroupNodes]:
    """Wrap existing sibling nodes in a new group node."""
    known = [node_id for node_id in members if node_id in graph.nodes]
    if len(known) < 2:
        return []

    group = Node(
        id=new_id("g"),
        label=label.strip() or "Group",
        kind="group",
        parent=graph.nodes[known[0]].parent,
    )

    return [GroupNodes(group=group, members=known)]
