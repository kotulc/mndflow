"""Replay of mutations into a graph.

The step log is the source of truth; a Graph is only ever derived by folding
applied mutations in order. Undo therefore needs no inverse operations —
it flips a status and the graph is rebuilt from scratch.
"""

from collections.abc import Iterable

from server.models import Graph, Mutation, Step


def descends_from(graph: Graph, node_id: str | None, ancestor: str) -> bool:
    """Whether `node_id` sits under `ancestor` — the guard against a move
    that would make the hierarchy a cycle."""
    cursor = node_id

    while cursor is not None:
        if cursor == ancestor:
            return True
        node = graph.nodes.get(cursor)
        cursor = node.parent if node else None

    return False


def apply_mutation(graph: Graph, mutation: Mutation) -> None:
    """Apply one mutation in place. Unknown targets are skipped, not raised —
    a reverted parent can legitimately strand a later step's reference."""
    match mutation.op:
        case "add_node":
            graph.nodes[mutation.node.id] = mutation.node.model_copy()

        case "update_node":
            node = graph.nodes.get(mutation.id)
            if node is None:
                return
            if mutation.label:
                node.label = mutation.label
            if mutation.summary:
                node.summary = mutation.summary

        case "move_node":
            node = graph.nodes.get(mutation.id)
            if node is not None and not descends_from(graph, mutation.parent, mutation.id):
                node.parent = mutation.parent

        case "delete_node":
            gone = {node.id for node in graph.nodes.values()
                    if descends_from(graph, node.id, mutation.id)}
            for node_id in gone:
                graph.nodes.pop(node_id, None)
                graph.specs.pop(node_id, None)

            graph.edges = {edge_id: edge for edge_id, edge in graph.edges.items()
                           if edge.source not in gone and edge.target not in gone}

        case "place_node":
            if (node := graph.nodes.get(mutation.id)) is not None:
                node.x, node.y = mutation.x, mutation.y

        case "link_nodes":
            edge = mutation.edge
            if edge.source in graph.nodes and edge.target in graph.nodes:
                graph.edges[edge.id] = edge.model_copy()

        case "update_edge":
            if (edge := graph.edges.get(mutation.id)) is not None:
                edge.relation = mutation.relation

        case "delete_edge":
            graph.edges.pop(mutation.id, None)

        case "group_nodes":
            graph.nodes[mutation.group.id] = mutation.group.model_copy()
            for member in mutation.members:
                node = graph.nodes.get(member)
                if node is not None:
                    node.parent = mutation.group.id

        case "write_spec":
            if mutation.id in graph.nodes:
                graph.specs[mutation.id] = mutation.body

        case "set_template":
            graph.template = mutation.template

        case "set_title":
            graph.title = mutation.title


def fold(steps: Iterable[Step]) -> Graph:
    """Rebuild the graph from every applied step, in log order."""
    graph = Graph()

    for step in steps:
        if step.status != "applied":
            continue
        for mutation in step.mutations:
            apply_mutation(graph, mutation)

    return graph


def touched_ids(step: Step) -> set[str]:
    """Node ids a step created or changed — highlights what a turn just did."""
    ids: set[str] = set()

    for mutation in step.mutations:
        match mutation.op:
            case "add_node":
                ids.add(mutation.node.id)
            case "update_node" | "move_node" | "place_node" | "delete_node" | "write_spec":
                ids.add(mutation.id)
            case "link_nodes":
                ids.update({mutation.edge.source, mutation.edge.target})
            case "group_nodes":
                ids.add(mutation.group.id)
                ids.update(mutation.members)

    return ids
