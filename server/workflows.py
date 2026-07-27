"""Declarative workflow definitions, read from YAML.

Three files describe the conversation. `entry` is the catalogue of domains a
first answer routes into. `operations` is the global list of things the
conversation can ask for — no domain may invent one. A domain file supplies
only the wording for those operations.

Control flow is deliberately absent here: which operation to ask about is
decided in `router`, from the graph itself. A new domain is therefore wording
and nothing else.
"""

from functools import cache
from pathlib import Path

import yaml
from pydantic import BaseModel, Field

WORKFLOW_DIR = Path(__file__).resolve().parent.parent / "workflows"


class WorkflowStep(BaseModel):
    """One prompt shown to the user, and what an answer may look like.

    `action` is the intent an answer is expected to become. A question asks for
    one thing, so naming it keeps the model filling known slots rather than
    choosing among every action there is."""

    id: str
    prompt: str
    choices: list[str] = Field(default_factory=list)
    hint: str = ""
    action: str = ""
    placeholder: str = ""


class Template(BaseModel):
    """Catalogue entry: one chip on the opening question, and the domain it
    opens. `about` is what the chip means, and what free text is scored against."""

    id: str
    chip: str
    about: str = ""


class Entry(BaseModel):
    """The opening question, and the domains a first answer routes into."""

    name: str = "entry"
    welcome: list[str] = Field(default_factory=list)
    placeholder: str = ""
    hint: str = ""
    templates: list[Template] = Field(default_factory=list)

    def chip(self, template_id: str) -> str:
        """Wording of one domain's chip, for naming what the user just chose."""
        return next((t.chip for t in self.templates if t.id == template_id), template_id)


class Operation(BaseModel):
    """One thing the conversation can ask for, and the intent an answer becomes.

    `when` names the condition under which there is anything to ask; `router`
    is what evaluates it."""

    id: str
    action: str
    chip: str = ""
    when: str = "always"


class Operations(BaseModel):
    """The global operation list, in the order they are preferred by default."""

    name: str = "operations"
    operations: list[Operation] = Field(default_factory=list)


class Wording(BaseModel):
    """What one domain says when it asks for one operation. `{label}` in either
    line is filled with the selected document's name."""

    prompt: str
    hint: str = ""
    choices: list[str] = Field(default_factory=list)


class Domain(BaseModel):
    """A domain's wording for the global operations.

    `lead` names the operation this domain prefers to open with — evidence
    comes before decomposition in research, for instance."""

    name: str
    lead: str = ""
    prompts: dict[str, Wording] = Field(default_factory=dict)

    def wording(self, operation: str, root: bool) -> Wording | None:
        """Wording for one operation, preferring the `_root` variant when the
        project itself is selected and there is no document to name."""
        keys = [f"{operation}_root", operation] if root else [operation]

        return next((self.prompts[key] for key in keys if key in self.prompts), None)


def _read(name: str, directory: Path) -> dict:
    """Parse one workflow file."""
    return yaml.safe_load((Path(directory) / f"{name}.yaml").read_text(encoding="utf-8"))


@cache
def entry(directory: Path = WORKFLOW_DIR) -> Entry:
    """The domain catalogue."""
    return Entry.model_validate(_read("entry", directory))


@cache
def operations(directory: Path = WORKFLOW_DIR) -> list[Operation]:
    """The global operation list."""
    return Operations.model_validate(_read("operations", directory)).operations


@cache
def domain(name: str, directory: Path = WORKFLOW_DIR) -> Domain:
    """One domain's wording, falling back to the catch-all if it has none."""
    try:
        return Domain.model_validate(_read(name, directory))
    except FileNotFoundError:
        return Domain.model_validate(_read("freeform", directory))
