"""Loading the entry catalogue, the global operations, and domain wording."""

import pytest

from server import workflows

DOMAINS = ["software", "website", "writing", "research", "product", "freeform"]
OPERATIONS = ["describe", "add", "relate"]


@pytest.fixture
def catalogue():
    """The shipped entry catalogue."""
    return workflows.entry()


def test_entry_offers_a_chip_per_domain(catalogue):
    """The opening question has a greeting and something to click."""
    assert catalogue.welcome
    assert [t.id for t in catalogue.templates] == DOMAINS


def test_entry_chip_names_a_domain(catalogue):
    """A domain id resolves back to the wording the user saw."""
    assert catalogue.chip("writing") == "Creative Writing"


def test_entry_chip_unknown_domain(catalogue):
    """An id with no catalogue entry names itself rather than raising."""
    assert catalogue.chip("nope") == "nope"


def test_operations_are_ordered():
    """The global list is the default order operations are preferred in."""
    assert [op.id for op in workflows.operations()] == OPERATIONS


def test_operations_map_to_intents():
    """Every operation names an action the planner already understands."""
    actions = {op.action for op in workflows.operations()}

    assert actions == {"describe_module", "link_modules", "add_module"}


@pytest.mark.parametrize("name", DOMAINS)
@pytest.mark.parametrize("operation", OPERATIONS)
def test_every_domain_words_every_operation(name, operation):
    """No domain can leave the conversation with nothing to say."""
    assert workflows.domain(name).wording(operation, root=False) is not None


@pytest.mark.parametrize("name", DOMAINS)
def test_every_domain_words_the_root(name):
    """The project itself is selectable, so it needs prompts naming no document."""
    domain = workflows.domain(name)

    assert "{label}" not in domain.wording("add", root=True).prompt
    assert "{label}" not in domain.wording("relate", root=True).prompt


@pytest.mark.parametrize("name", DOMAINS)
def test_domain_lead_is_a_real_operation(name):
    """A lead naming an operation that does not exist would silently do nothing."""
    lead = workflows.domain(name).lead

    assert lead == "" or lead in OPERATIONS


def test_wording_prefers_the_root_variant():
    """With the project selected, the root prompt wins over the nested one."""
    wording = workflows.domain("software").wording("add", root=True)

    assert wording.prompt == "What are the main parts of this system?"


def test_wording_falls_back_to_the_nested_variant():
    """An operation with no root variant still has something to ask."""
    wording = workflows.domain("software").wording("describe", root=True)

    assert "{label}" in wording.prompt


def test_wording_unknown_operation():
    """An operation a domain has no wording for resolves to nothing."""
    assert workflows.domain("software").wording("nope", root=False) is None


def test_unknown_domain_falls_back_to_freeform():
    """A template with no file of its own still drives a conversation."""
    assert workflows.domain("no-such-domain").name == "freeform"
