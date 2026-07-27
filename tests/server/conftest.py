"""Shared fixtures for server tests."""

import pytest

from server.log import StepLog
from server.models import AddNode, Edge, LinkNodes, Node, Step


@pytest.fixture
def log():
    """Empty step log."""
    return StepLog()


@pytest.fixture
def auth_node():
    """A single module node."""
    return Node(id="n_auth", label="Auth Service")


@pytest.fixture
def api_node():
    """A second module node, for edge and grouping cases."""
    return Node(id="n_api", label="API Gateway")


@pytest.fixture
def applied_step(auth_node, api_node):
    """An applied step adding two nodes and the edge between them."""
    return Step(
        status="applied",
        mutations=[
            AddNode(node=auth_node),
            AddNode(node=api_node),
            LinkNodes(edge=Edge(id="e_1", source="n_api", target="n_auth",
                                relation="authenticates via")),
        ],
    )
