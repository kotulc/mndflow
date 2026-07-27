"""Deterministic grouping heuristic."""

import pytest

from server.group import crowded_parents, propose_group
from server.models import Graph, Node


@pytest.fixture
def wide_graph():
    """Ten sibling nodes at the root — past the clutter threshold."""
    nodes = {f"n_{i}": Node(id=f"n_{i}", label=f"Module {i}") for i in range(10)}

    return Graph(nodes=nodes)


def test_crowded_parents_flags_wide_root(wide_graph):
    """A parent with more children than the limit is reported."""
    assert len(crowded_parents(wide_graph, limit=7)[None]) == 10


def test_crowded_parents_ignores_narrow(wide_graph):
    """Nothing is flagged when the limit is above the widest fan-out."""
    assert crowded_parents(wide_graph, limit=20) == {}


def test_propose_group_wraps_members(wide_graph):
    """Grouping creates one parent covering the named members."""
    mutations = propose_group(wide_graph, ["n_0", "n_1", "n_2"], "Core")

    assert mutations[0].group.label == "Core"
    assert mutations[0].group.kind == "group"
    assert mutations[0].members == ["n_0", "n_1", "n_2"]


def test_propose_group_drops_unknown_members(wide_graph):
    """Members that are not in the graph are filtered out."""
    mutations = propose_group(wide_graph, ["n_0", "n_missing", "n_1"], "Core")

    assert mutations[0].members == ["n_0", "n_1"]


@pytest.mark.parametrize("members", [[], ["n_0"], ["n_absent", "n_gone"]])
def test_propose_group_needs_two_members(wide_graph, members):
    """Fewer than two known members is not an abstraction."""
    assert propose_group(wide_graph, members, "Core") == []


def test_propose_group_defaults_label(wide_graph):
    """A blank label falls back rather than producing an unnamed node."""
    assert propose_group(wide_graph, ["n_0", "n_1"], "  ")[0].group.label == "Group"
