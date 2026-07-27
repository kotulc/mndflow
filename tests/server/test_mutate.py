"""Label resolution and intent-to-mutation planning."""

import pytest

from server.models import Graph, Intent
from server.mutate import plan, rank, resolve


@pytest.fixture
def graph(auth_node, api_node):
    """Two-node graph to resolve labels against."""
    return Graph(nodes={"n_auth": auth_node, "n_api": api_node})


@pytest.mark.parametrize(
    "label, expected",
    [
        ("Auth Service", "n_auth"),
        ("auth service", "n_auth"),
        ("  AUTH SERVICE  ", "n_auth"),
        ("Auth", None),
        ("Gateway", None),
        ("Billing", None),
        ("", None),
    ],
)
def test_resolve_matches(graph, label, expected):
    """Labels resolve on an exact match only — a partial one is never guessed."""
    assert resolve(graph, label) == expected


def test_rank_orders_by_similarity(graph):
    """The nearest existing labels come first, ready to offer as chips."""
    assert rank(graph, "auth serv") == ["Auth Service", "API Gateway"]


def test_rank_drops_unrelated_labels(graph):
    """Nothing sharing any trigram with the name is offered at all."""
    assert rank(graph, "zzzz") == []


def test_rank_limits_options(graph):
    """The chip list stays short enough to choose from at a glance."""
    assert len(rank(graph, "service", limit=1)) == 1


def test_plan_add_module(graph):
    """A new label produces one node carrying the given summary."""
    mutations = plan(graph, Intent(action="add_module", label="Billing",
                                   summary="Handles invoices."))

    assert len(mutations) == 1
    assert mutations[0].node.label == "Billing"
    assert mutations[0].node.summary == "Handles invoices."


def test_plan_add_module_keeps_the_users_words(graph):
    """The document body is what the user wrote, not the model's paraphrase."""
    said = "billing, which reconciles invoices against the ledger every night"
    mutations = plan(graph, Intent(action="add_module", label="Billing",
                                   summary="Handles invoices."), said)

    assert [m.op for m in mutations] == ["add_node", "write_spec"]
    assert mutations[1].body == said


def test_plan_add_module_nests_under_parent(graph):
    """A resolvable parent_label nests the new node."""
    mutations = plan(graph, Intent(action="add_module", label="Token Store",
                                   parent_label="Auth Service"))

    assert mutations[0].node.parent == "n_auth"


def test_plan_add_module_rejects_duplicate(graph):
    """An existing label proposes nothing rather than creating a twin."""
    assert plan(graph, Intent(action="add_module", label="Auth Service")) == []


def test_plan_add_module_rejects_blank(graph):
    """A blank label proposes nothing."""
    assert plan(graph, Intent(action="add_module", label="   ")) == []


def test_plan_link_modules(graph):
    """Two resolvable labels produce a relation between them."""
    mutations = plan(graph, Intent(action="link_modules", label="API Gateway",
                                   target_label="Auth Service",
                                   relation="authenticates via"))

    assert mutations[0].edge.source == "n_api"
    assert mutations[0].edge.target == "n_auth"
    assert mutations[0].edge.relation == "authenticates via"


@pytest.mark.parametrize(
    "source, target",
    [("API Gateway", "Billing"), ("Billing", "Auth Service"), ("Auth", "Auth Service")],
)
def test_plan_link_rejects_bad_endpoints(graph, source, target):
    """An endpoint that does not resolve plans nothing, pending a question."""
    intent = Intent(action="link_modules", label=source, target_label=target)

    assert plan(graph, intent) == []


def test_plan_link_creates_target_once_confirmed(graph):
    """With the user's say-so, a missing target is created and then linked."""
    intent = Intent(action="link_modules", label="API Gateway",
                    target_label="Rate Limiter", relation="throttles via")

    mutations = plan(graph, intent, create="target_label")

    assert [m.op for m in mutations] == ["add_node", "link_nodes"]
    assert mutations[0].node.label == "Rate Limiter"
    assert mutations[1].edge.target == mutations[0].node.id


def test_plan_link_creates_the_source_too(graph):
    """Either end of a relation can be the name that turned out to be new."""
    intent = Intent(action="link_modules", label="Rate Limiter",
                    target_label="API Gateway", relation="throttles")

    mutations = plan(graph, intent, create="label")

    assert [m.op for m in mutations] == ["add_node", "link_nodes"]
    assert mutations[1].edge.source == mutations[0].node.id


def test_plan_link_creates_only_the_slot_confirmed(graph):
    """One answer authorises one node; the other name is still a question."""
    intent = Intent(action="link_modules", label="Rate Limiter", target_label="Cache")

    assert plan(graph, intent, create="label") == []


def test_plan_link_never_creates_unasked(graph):
    """The model alone cannot bring a node into being through a link."""
    intent = Intent(action="link_modules", label="API Gateway", target_label="Rate Limiter")

    assert plan(graph, intent) == []


def test_plan_describe_creates_the_subject_once_confirmed(graph):
    """A description of something new makes it, once the user has said so."""
    intent = Intent(action="describe_module", label="Rate Limiter", summary="Throttles.")

    mutations = plan(graph, intent, create="label")

    assert [m.op for m in mutations] == ["add_node", "update_node", "write_spec"]
    assert mutations[0].node.label == "Rate Limiter"


def test_plan_describe_never_creates_unasked(graph):
    """A misheard name must not quietly become a second document."""
    intent = Intent(action="describe_module", label="auth servise", summary="Tokens.")

    assert plan(graph, intent) == []


def test_plan_describe_keeps_the_users_words_alone(graph):
    """A description with no model summary still writes what was said."""
    mutations = plan(graph, Intent(action="describe_module", label="Auth Service"),
                     "it issues tokens")

    assert mutations[-1].body == "it issues tokens"


def test_plan_describe_writes_node_and_spec(graph):
    """Describing a module updates its summary and its markdown document."""
    mutations = plan(graph, Intent(action="describe_module", label="Auth Service",
                                   summary="Issues and validates tokens."))

    assert [m.op for m in mutations] == ["update_node", "write_spec"]
    assert mutations[1].body == "Issues and validates tokens."


def test_plan_describe_prefers_the_users_words(graph):
    """The summary stays short for context; the body keeps what was said."""
    said = "it issues tokens, validates them, and rotates the signing key weekly"
    mutations = plan(graph, Intent(action="describe_module", label="Auth Service",
                                   summary="Issues and validates tokens."), said)

    assert mutations[0].summary == "Issues and validates tokens."
    assert mutations[1].body == said


@pytest.mark.parametrize("action", ["answer_choice", "unclear"])
def test_plan_non_graph_actions(graph, action):
    """Choices and unclear replies advance the conversation, not the graph."""
    assert plan(graph, Intent(action=action, choice="web application")) == []
