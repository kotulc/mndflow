"""Choosing the next question from the domain and the selected document."""

import pytest

from server import router, workflows
from server.models import Graph, Node


@pytest.fixture
def catalogue():
    """The shipped entry catalogue."""
    return workflows.entry()


@pytest.fixture
def project():
    """A software project with one described root and two parts beneath it."""
    return Graph(
        nodes={
            "n_sys": Node(id="n_sys", label="Ledger"),
            "n_auth": Node(id="n_auth", label="Auth Service", parent="n_sys"),
            "n_api": Node(id="n_api", label="API Gateway", parent="n_sys"),
        },
        specs={"n_sys": "A double-entry ledger."},
        template="software",
    )


@pytest.mark.parametrize(
    "said, expected",
    [
        ("Creative Writing", "writing"),
        ("creative writing", "writing"),
        ("Research & Analysis", "research"),
        ("something entirely unlike any chip", "freeform"),
        ("", "freeform"),
    ],
)
def test_classify_routes_to_a_domain(catalogue, said, expected):
    """A chip is taken at its word; a weak match falls to the catch-all."""
    assert router.classify(catalogue, said) == expected


def test_classify_never_invents_a_domain(catalogue):
    """Whatever is typed, the answer is always a domain that has wording."""
    known = {template.id for template in catalogue.templates}

    assert router.classify(catalogue, "a quilt pattern generator") in known


def test_question_opens_with_the_catalogue():
    """An empty project is asked which adventure it is, with chips to pick."""
    question = router.question(Graph(), None)

    assert question.id == router.ENTRY
    assert "Creative Writing" in question.choices
    assert question.placeholder == "Something novel..."


def test_question_is_stable_across_calls():
    """The greeting is chosen once, so it does not change under the user."""
    assert router.question(Graph(), None).prompt == router.question(Graph(), None).prompt


def test_question_asks_the_domains_words(project):
    """Once a domain is chosen, its wording drives the conversation."""
    question = router.question(project, "n_auth")

    assert question.prompt == 'What is "Auth Service" responsible for?'


def test_question_names_the_selection(project):
    """The selected document is what the question is about."""
    assert 'API Gateway' in router.question(project, "n_api").prompt


def test_question_at_the_root_names_no_document(project):
    """With the project selected there is nothing to name, so wording differs."""
    question = router.question(project, None)

    assert "{label}" not in question.prompt
    assert '"' not in question.prompt


def test_describe_comes_before_breaking_down(project):
    """A document with no text is asked for some before it is split up."""
    assert router.question(project, "n_auth").id == "describe"


def test_described_document_is_broken_down(project):
    """Once it has text and no parts, the question moves on to its contents."""
    project.specs["n_auth"] = "Issues tokens."

    assert router.question(project, "n_auth").id == "add"


def test_relate_needs_something_to_relate(project):
    """A lone document is not asked what it connects to — there is nothing."""
    project.specs["n_auth"] = "Issues tokens."
    project.nodes["n_db"] = Node(id="n_db", label="Token Store", parent="n_auth")

    assert router.question(project, "n_auth").id == "add"


def test_building_is_the_default(project):
    """Someone listing the parts of something is left to finish the list."""
    assert router.question(project, "n_sys", recent=("add",)).id == "add"


def test_a_run_of_one_operation_gives_way(project):
    """Having built for a while, the loop steps back to connect what was built."""
    assert router.question(project, "n_sys", recent=("add", "add")).id == "relate"


def test_a_broken_run_does_not(project):
    """A run interrupted by another question is not a run."""
    assert router.question(project, "n_sys", recent=("add", "relate")).id == "add"


def test_question_repeats_when_nothing_else_is_eligible(project):
    """With one operation left there is nothing to move on to."""
    project.specs["n_auth"] = "Issues tokens."

    assert router.question(project, "n_auth", recent=("add", "add")).id == "add"


def test_lead_promotes_a_domains_preferred_operation(project):
    """Research asks what the evidence says before it asks for parts."""
    project.template = "research"
    project.specs["n_sys"] = "How does the ledger balance?"

    assert router.question(project, "n_sys").id == "relate"


def test_relate_offers_the_documents_in_view(project):
    """The chips for a connection are the documents it could connect."""
    question = router.question(project, "n_sys", recent=("add", "add"))

    assert question.choices == ["Auth Service", "API Gateway"]


def test_relate_needs_two_documents_to_join(project):
    """A parent with one child has nothing to connect, so it is not asked."""
    del project.nodes["n_api"]

    assert router.question(project, "n_sys", recent=("add", "add")).id == "add"


def test_add_offers_no_documents(project):
    """Naming something new is not helped by a list of what exists."""
    project.specs["n_auth"] = "Issues tokens."

    assert router.question(project, "n_auth").choices == []


def test_children_ignores_an_undone_parent():
    """A node whose parent was undone is top level, not lost from the tree."""
    graph = Graph(nodes={"n_a": Node(id="n_a", label="Orphan", parent="n_gone")})

    assert [node.id for node in router.children(graph, None)] == ["n_a"]


def test_unknown_domain_still_asks_something(project):
    """A template with no wording file falls back rather than going silent."""
    project.template = "no-such-domain"

    assert router.question(project, "n_auth") is not None
