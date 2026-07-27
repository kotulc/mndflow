"""Ordered step log, held in memory for the life of the process.

The log is the only source of truth: a Graph is never stored, only folded from
the steps here. Undo therefore flips a status rather than computing an inverse,
and history stays intact behind it.

Nothing is persisted. A design conversation is a session, and documents are
graph nodes rather than files, so there is nothing on disk to fall out of step
with the log. Writing these same steps to a JSON-lines file is all that
outliving a session would take.
"""

from server.models import Step, StepStatus


class StepLog:
    """The history of applied and reverted steps, in the order applied."""

    def __init__(self) -> None:
        self._steps: dict[str, Step] = {}

    def append(self, step: Step) -> Step:
        """Record a newly applied step."""
        self._steps[step.id] = step

        return step

    def set_status(self, step_id: str, status: StepStatus) -> None:
        """Change an existing step's status; an unknown id is ignored."""
        if (step := self._steps.get(step_id)) is not None:
            step.status = status

    def steps(self) -> list[Step]:
        """Every step recorded, oldest first."""
        return list(self._steps.values())

    def last_applied(self) -> Step | None:
        """The most recent step still in effect — what undo unwinds next."""
        return next((step for step in reversed(self.steps()) if step.status == "applied"), None)
