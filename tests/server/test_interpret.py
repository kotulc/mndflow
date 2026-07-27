"""Prompt context, and the fallbacks when the local model is not answering."""

import pytest
from openai import OpenAIError

from server import interpret
from server.models import Graph
from server.workflows import WorkflowStep


@pytest.fixture
def graph(auth_node, api_node):
    """Two-node graph to build prompt context from."""
    return Graph(nodes={"n_auth": auth_node, "n_api": api_node})


@pytest.fixture
def unreachable(monkeypatch):
    """Stand in for a local model server that is not running."""
    def refuse(*args, **kwargs):
        raise OpenAIError("connection refused")

    monkeypatch.setattr(interpret, "_client", refuse)


def test_context_lists_existing_modules(graph):
    """The model is told what already exists so it reuses those names."""
    assert "- Auth Service" in interpret.context(graph, None)


def test_context_carries_the_question(graph):
    """The active question frames what a reply is meant to answer."""
    step = WorkflowStep(id="describe", prompt="What is it for?", choices=["a", "b"])

    prompt = interpret.context(graph, step)

    assert "What is it for?" in prompt
    assert "a, b" in prompt


def test_context_names_the_selection(graph):
    """The selected document is what "it" refers to, so the model is told."""
    assert "Selected module: Auth Service" in interpret.context(graph, None, "n_auth")


def test_context_ignores_an_unknown_selection(graph):
    """A stale selection is left out rather than named as nothing."""
    assert "Selected module" not in interpret.context(graph, None, "n_gone")


def test_choose_without_options(unreachable):
    """Nothing to choose between is answered without troubling the model."""
    assert interpret.choose({}, "anything") == ""


def test_choose_survives_an_unreachable_server(unreachable):
    """A model server that is not running leaves the choice to the caller."""
    assert interpret.choose({"Creative Writing": "Characters and scenes."}, "a novel") == ""


def test_interpret_survives_an_unreachable_server(graph, unreachable):
    """A turn never crashes the session; it changes nothing instead."""
    assert interpret.interpret(graph, "add billing").action == "unclear"
