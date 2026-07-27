"""Step storage and status replay."""

import pytest

from server.log import StepLog
from server.models import AddNode, Step


def test_steps_empty_log(log):
    """A log with nothing in it replays to no steps."""
    assert log.steps() == []


def test_append_roundtrip(log, auth_node):
    """An appended step reads back with its mutations intact."""
    log.append(Step(user_input="add auth", mutations=[AddNode(node=auth_node)]))

    steps = log.steps()

    assert len(steps) == 1
    assert steps[0].user_input == "add auth"
    assert steps[0].mutations[0].node.label == "Auth Service"


def test_append_preserves_order(log, auth_node, api_node):
    """Steps replay in the order they were appended."""
    first = log.append(Step(mutations=[AddNode(node=auth_node)]))
    second = log.append(Step(mutations=[AddNode(node=api_node)]))

    assert [step.id for step in log.steps()] == [first.id, second.id]


@pytest.mark.parametrize("status", ["applied", "reverted"])
def test_set_status_replays(log, auth_node, status):
    """A status change overrides the status the step was appended with."""
    step = log.append(Step(mutations=[AddNode(node=auth_node)]))

    log.set_status(step.id, status)

    assert log.steps()[0].status == status


def test_set_status_last_wins(log, auth_node):
    """Repeated status changes resolve to the most recent one — redo works."""
    step = log.append(Step(mutations=[AddNode(node=auth_node)]))

    log.set_status(step.id, "reverted")
    log.set_status(step.id, "applied")

    assert log.steps()[0].status == "applied"


def test_set_status_unknown_step_ignored(log, auth_node):
    """A status change for a step that was never appended is skipped."""
    log.append(Step(mutations=[AddNode(node=auth_node)]))

    log.set_status("step_missing", "applied")

    assert len(log.steps()) == 1


def test_logs_do_not_share_state(log, auth_node):
    """Two logs are independent — one cannot see the other's steps."""
    log.append(Step(mutations=[AddNode(node=auth_node)]))

    assert StepLog().steps() == []


def test_last_applied_returns_most_recent(log, auth_node, api_node):
    """Undo targets the newest step still in effect."""
    log.append(Step(mutations=[AddNode(node=auth_node)]))
    second = log.append(Step(mutations=[AddNode(node=api_node)]))

    assert log.last_applied().id == second.id


def test_last_applied_skips_reverted(log, auth_node, api_node):
    """A step that was already undone is not undone again."""
    first = log.append(Step(mutations=[AddNode(node=auth_node)]))
    second = log.append(Step(mutations=[AddNode(node=api_node)]))
    log.set_status(second.id, "reverted")

    assert log.last_applied().id == first.id


def test_last_applied_none_when_all_reverted(log, auth_node):
    """Nothing to undo once every step has been unwound."""
    step = log.append(Step(mutations=[AddNode(node=auth_node)]))
    log.set_status(step.id, "reverted")

    assert log.last_applied() is None
