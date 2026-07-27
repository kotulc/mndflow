"""Turns, undo, and direct manipulation over the HTTP API."""

import pytest
from fastapi.testclient import TestClient

from server import main
from server.models import Intent


@pytest.fixture
def client(monkeypatch):
    """API client backed by its own empty log."""
    monkeypatch.setattr(main, "LOG", main.StepLog())

    return TestClient(main.app)


@pytest.fixture
def scripted(monkeypatch):
    """Replace the model calls with a queue of canned intents.

    `choose` returns nothing, which is what an unreachable server gives, so
    every test here exercises the scoring fallback rather than the model."""
    queue: list[Intent] = []
    monkeypatch.setattr(main.interpret, "interpret",
                        lambda *args, **kwargs: queue.pop(0) if queue else Intent(action="unclear"))
    monkeypatch.setattr(main.interpret, "choose", lambda *args, **kwargs: "")

    return queue


@pytest.fixture
def started(client, scripted):
    """A project past the opening question, driven by the software domain."""
    client.post("/turn", json={"input": "Software System"})

    return client


def add(client, scripted, label: str, scope: str | None = None) -> dict:
    """Take one turn that adds a module, returning the resulting state."""
    scripted.append(Intent(action="add_module", label=label))
    query = f"?scope={scope}" if scope else ""

    return client.post(f"/turn{query}", json={"input": label}).json()


def node_id(body: dict, label: str) -> str:
    """Id of the node carrying a label, for tests that need to address one."""
    return next(k for k, v in body["graph"]["nodes"].items() if v["label"] == label)


# --- Opening the project ---------------------------------------------------


def test_state_starts_with_the_catalogue(client):
    """An empty project is asked which kind of thing it is."""
    body = client.get("/state").json()

    assert body["graph"]["nodes"] == {}
    assert body["workflow_step"]["id"] == "entry"
    assert "Creative Writing" in body["workflow_step"]["choices"]


def test_opening_answer_chooses_a_domain(client, scripted):
    """Picking a chip settles which domain drives every later question."""
    body = client.post("/turn", json={"input": "Creative Writing"}).json()

    assert body["graph"]["template"] == "writing"


def test_opening_answer_is_routed_by_the_model(client, scripted, monkeypatch):
    """Free text reaches a domain by the model matching it, not by spelling."""
    monkeypatch.setattr(main.interpret, "choose", lambda *args, **kwargs: "Creative Writing")

    body = client.post("/turn", json={"input": "a mystery set in a lighthouse"}).json()

    assert body["graph"]["template"] == "writing"


def test_opening_answer_routes_without_a_model(client, scripted):
    """With no model reachable, an answer it cannot place still opens a project."""
    body = client.post("/turn", json={"input": "a mystery set in a lighthouse"}).json()

    assert body["graph"]["template"] == "freeform"
    assert body["workflow_step"]["id"] == "add"


def test_opening_answer_keeps_what_was_said(client, scripted):
    """The words that started the project become its first document."""
    body = client.post("/turn", json={"input": "Research & Analysis"}).json()
    root = node_id(body, "Research & Analysis")

    assert body["graph"]["specs"][root] == "Research & Analysis"


def test_opening_answer_leads_into_the_domain(client, scripted):
    """The next question is the domain's, not the catalogue's."""
    body = client.post("/turn", json={"input": "Software System"}).json()

    assert body["workflow_step"]["prompt"] == "What are the main parts of this system?"


def test_undoing_the_opening_returns_to_the_catalogue(client, scripted):
    """Choosing wrongly is undone like anything else."""
    client.post("/turn", json={"input": "Software System"})

    body = client.post("/undo").json()

    assert body["graph"]["template"] == ""
    assert body["workflow_step"]["id"] == "entry"


# --- Taking turns ----------------------------------------------------------


def test_turn_applies_immediately(started, scripted):
    """A turn lands in the committed graph with nothing left to confirm."""
    body = add(started, scripted, "Auth Service")

    assert node_id(body, "Auth Service")
    assert "pending" not in body


def test_turn_writes_the_document(started, scripted):
    """A node is a document: adding one records what was said about it."""
    body = add(started, scripted, "Auth Service")

    assert body["graph"]["specs"][node_id(body, "Auth Service")] == "Auth Service"


def test_touched_marks_the_last_change(started, scripted):
    """Highlighting follows the most recent turn."""
    add(started, scripted, "Auth Service")
    body = add(started, scripted, "Billing")

    assert body["touched"] == [node_id(body, "Billing")]


def test_unclear_intent_changes_nothing(started):
    """With no model server reachable, a turn is recorded but mutates nothing."""
    before = started.get("/state").json()

    body = started.post("/turn", json={"input": "???"}).json()

    assert body["graph"]["nodes"].keys() == before["graph"]["nodes"].keys()
    assert body["history"][-1]["action"] == "unclear"


def test_a_turn_that_lands_nothing_says_so(started, scripted):
    """Re-asking unaltered would read as though the answer never arrived."""
    add(started, scripted, "Auth Service")

    body = add(started, scripted, "Auth Service")

    assert body["workflow_step"]["hint"].startswith("Nothing came of that")


def test_the_loop_finds_a_rhythm(started, scripted):
    """Two turns of building, then a step back to connect what was built."""
    add(started, scripted, "Auth Service")

    body = add(started, scripted, "Billing")

    assert body["workflow_step"]["id"] == "relate"


def test_the_loop_does_not_alternate(started, scripted):
    """One answer does not end the list the user is in the middle of making."""
    body = add(started, scripted, "Auth Service")

    assert body["workflow_step"]["id"] == "add"


def test_selection_scopes_the_question(started, scripted):
    """The question follows whatever document the user has selected."""
    body = add(started, scripted, "Auth Service")
    target = node_id(body, "Auth Service")

    body = started.get(f"/state?scope={target}").json()

    assert "Auth Service" in body["workflow_step"]["prompt"]


def test_selection_nests_what_is_added(started, scripted):
    """A module named while a document is selected goes inside it."""
    body = add(started, scripted, "Auth Service")
    parent = node_id(body, "Auth Service")

    body = add(started, scripted, "Token Store", scope=parent)

    assert body["graph"]["nodes"][node_id(body, "Token Store")]["parent"] == parent


def test_selection_supplies_the_subject(started, scripted):
    """A description need not name its document — the selection already did."""
    body = add(started, scripted, "Auth Service")
    target = node_id(body, "Auth Service")
    scripted.append(Intent(action="describe_module", summary="Issues tokens."))

    body = started.post(f"/turn?scope={target}", json={"input": "it issues tokens"}).json()

    assert body["graph"]["specs"][target] == "it issues tokens"


def test_stale_selection_falls_back_to_the_root(started, scripted):
    """A selection pointing at an undone document does not break the loop."""
    body = started.get("/state?scope=n_gone").json()

    assert body["scope"] is None
    assert body["workflow_step"] is not None


# --- Undo ------------------------------------------------------------------


def test_undo_reverts_the_last_applied_step(started, scripted):
    """Undo unwinds the most recent turn without being told which one."""
    add(started, scripted, "Auth Service")
    body = add(started, scripted, "Billing")
    assert node_id(body, "Billing")

    body = started.post("/undo").json()

    assert "Billing" not in [node["label"] for node in body["graph"]["nodes"].values()]


def test_undo_unwinds_in_sequence(started, scripted):
    """Repeated undo walks back through history one step at a time."""
    add(started, scripted, "Auth Service")
    add(started, scripted, "Billing")

    started.post("/undo")
    body = started.post("/undo").json()

    assert "Auth Service" not in [node["label"] for node in body["graph"]["nodes"].values()]


def test_undo_with_nothing_applied(client):
    """Undo on an empty history is a 400 rather than a silent no-op."""
    assert client.post("/undo").status_code == 400


def test_undo_removes_the_document(started, scripted):
    """Undoing the step that created a node also drops its text."""
    body = add(started, scripted, "Auth Service")
    target = node_id(body, "Auth Service")

    body = started.post("/undo").json()

    assert target not in body["graph"]["specs"]


# --- The file tree ---------------------------------------------------------


def test_create_makes_a_document(started):
    """A document can be made outright, the way a file tree's "new" does."""
    body = started.post("/nodes", json={"label": "Scratch", "parent": None}).json()

    assert node_id(body, "Scratch")


def test_create_nests_under_a_parent(started, scripted):
    """A new document goes inside whichever one it was created under."""
    body = add(started, scripted, "Auth Service")
    parent = node_id(body, "Auth Service")

    body = started.post("/nodes", json={"label": "Token Store", "parent": parent}).json()

    assert body["graph"]["nodes"][node_id(body, "Token Store")]["parent"] == parent


@pytest.mark.parametrize("label", ["", "   "])
def test_create_rejects_blank(started, label):
    """An unnamed document is refused rather than made."""
    assert started.post("/nodes", json={"label": label}).status_code == 400


def test_create_unknown_parent(started):
    """Nesting under a document that does not exist is a 404."""
    assert started.post("/nodes", json={"label": "X", "parent": "n_nope"}).status_code == 404


def test_delete_removes_the_document(started, scripted):
    """Deleting a document takes its text with it."""
    body = add(started, scripted, "Auth Service")
    target = node_id(body, "Auth Service")

    body = started.delete(f"/nodes/{target}").json()

    assert target not in body["graph"]["nodes"]
    assert target not in body["graph"]["specs"]


def test_delete_takes_the_contents_with_it(started, scripted):
    """A folder deletes as a folder does — everything nested inside goes too."""
    body = add(started, scripted, "Auth Service")
    parent = node_id(body, "Auth Service")
    body = add(started, scripted, "Token Store", scope=parent)
    child = node_id(body, "Token Store")

    body = started.delete(f"/nodes/{parent}").json()

    assert child not in body["graph"]["nodes"]


def test_delete_is_undoable(started, scripted):
    """A delete is a step like any other, so undo brings the document back."""
    body = add(started, scripted, "Auth Service")
    target = node_id(body, "Auth Service")
    started.delete(f"/nodes/{target}")

    body = started.post("/undo").json()

    assert target in body["graph"]["nodes"]


def test_delete_clears_a_selection_it_removed(started, scripted):
    """Deleting the selected document deselects it rather than dangling."""
    body = add(started, scripted, "Auth Service")
    target = node_id(body, "Auth Service")

    body = started.delete(f"/nodes/{target}?scope={target}").json()

    assert body["scope"] is None


def test_delete_unknown_node(started):
    """Deleting a document that does not exist is a 404."""
    assert started.delete("/nodes/n_nope").status_code == 404


def test_body_edits_the_document(started, scripted):
    """A document's text can be edited directly, not only dictated."""
    body = add(started, scripted, "Auth Service")
    target = node_id(body, "Auth Service")

    body = started.post(f"/nodes/{target}/body", json={"body": "Issues tokens."}).json()

    assert body["graph"]["specs"][target] == "Issues tokens."


def test_body_unknown_node(started):
    """Editing a document that does not exist is a 404."""
    assert started.post("/nodes/n_nope/body", json={"body": "x"}).status_code == 404


def test_move_reparents_node(started, scripted):
    """Moving a document in the tree re-parents it and commits at once."""
    add(started, scripted, "Auth Service")
    body = add(started, scripted, "Edge Layer")
    moved, parent = node_id(body, "Auth Service"), node_id(body, "Edge Layer")

    body = started.post(f"/nodes/{moved}/move", json={"parent": parent}).json()

    assert body["graph"]["nodes"][moved]["parent"] == parent


def test_move_is_undoable(started, scripted):
    """A move is a step like any other, so undo puts the document back."""
    add(started, scripted, "Auth Service")
    body = add(started, scripted, "Edge Layer")
    moved, parent = node_id(body, "Auth Service"), node_id(body, "Edge Layer")
    started.post(f"/nodes/{moved}/move", json={"parent": parent})

    body = started.post("/undo").json()

    assert body["graph"]["nodes"][moved]["parent"] is None


def test_move_unknown_node(started):
    """Moving a document that does not exist is a 404."""
    assert started.post("/nodes/n_nope/move", json={"parent": None}).status_code == 404


def test_move_under_own_descendant(started, scripted):
    """A move that would make the hierarchy a cycle is refused."""
    body = add(started, scripted, "Auth Service")
    target = node_id(body, "Auth Service")

    assert started.post(f"/nodes/{target}/move", json={"parent": target}).status_code == 400


def test_rename_relabels_node(started, scripted):
    """A model-generated label can be corrected without losing the document."""
    said = "what stripe actually costs us at current volume"
    body = add(started, scripted, said)
    target = node_id(body, said)

    body = started.post(f"/nodes/{target}/rename", json={"label": "Stripe Cost"}).json()

    assert body["graph"]["nodes"][target]["label"] == "Stripe Cost"
    assert body["graph"]["specs"][target] == said


@pytest.mark.parametrize("label", ["", "   "])
def test_rename_rejects_blank(started, scripted, label):
    """An empty label is refused rather than erasing the document's name."""
    body = add(started, scripted, "Auth Service")
    target = node_id(body, "Auth Service")

    assert started.post(f"/nodes/{target}/rename", json={"label": label}).status_code == 400


def test_rename_unknown_node(started):
    """Renaming a document that does not exist is a 404."""
    assert started.post("/nodes/n_nope/rename", json={"label": "X"}).status_code == 404


# --- Unresolved references -------------------------------------------------


def test_unknown_target_asks_instead_of_guessing(started, scripted):
    """A link to a name that does not exist stalls and offers the near misses."""
    add(started, scripted, "Auth Service")
    add(started, scripted, "API Gateway")

    scripted.append(Intent(action="link_modules", label="API Gateway",
                           target_label="auth servise", relation="authenticates via"))
    body = started.post("/turn", json={"input": "the gateway uses auth servise"}).json()

    assert body["workflow_step"]["id"] == "disambiguate"
    assert "Auth Service" in body["workflow_step"]["choices"]
    assert body["graph"]["edges"] == {}


def test_choosing_an_existing_document_links_it(started, scripted):
    """Picking a chip retargets the stalled link at the document meant."""
    add(started, scripted, "Auth Service")
    add(started, scripted, "API Gateway")
    scripted.append(Intent(action="link_modules", label="API Gateway",
                           target_label="auth servise", relation="authenticates via"))
    started.post("/turn", json={"input": "the gateway uses auth servise"})

    body = started.post("/turn", json={"input": "Auth Service"}).json()

    edge = next(iter(body["graph"]["edges"].values()))
    assert edge["target"] == node_id(body, "Auth Service")
    assert edge["relation"] == "authenticates via"


def test_creating_the_target_makes_the_node(started, scripted):
    """Choosing to create it keeps the user's name and links the new node."""
    add(started, scripted, "API Gateway")
    scripted.append(Intent(action="link_modules", label="API Gateway",
                           target_label="Rate Limiter", relation="throttles via"))
    started.post("/turn", json={"input": "the gateway throttles via a rate limiter"})

    body = started.post("/turn", json={"input": "+ create it"}).json()

    assert node_id(body, "Rate Limiter")
    assert len(body["graph"]["edges"]) == 1


def test_unknown_subject_asks_instead_of_doing_nothing(started, scripted):
    """A description of a name nothing matches stalls rather than vanishing."""
    add(started, scripted, "Auth Service")
    scripted.append(Intent(action="describe_module", label="auth servise",
                           summary="Issues tokens."))

    body = started.post("/turn", json={"input": "auth servise issues tokens"}).json()

    assert body["workflow_step"]["id"] == "disambiguate"
    assert "Auth Service" in body["workflow_step"]["choices"]


def test_settled_description_keeps_the_original_words(started, scripted):
    """The chip clicked to unstick a turn is not what lands in the document."""
    body = add(started, scripted, "Auth Service")
    target = node_id(body, "Auth Service")
    scripted.append(Intent(action="describe_module", label="auth servise",
                           summary="Issues tokens."))
    started.post("/turn", json={"input": "it issues and rotates tokens"})

    body = started.post("/turn", json={"input": "Auth Service"}).json()

    assert body["graph"]["specs"][target] == "it issues and rotates tokens"


def test_creating_the_subject_makes_the_document(started, scripted):
    """Choosing to create it keeps the name the user used."""
    add(started, scripted, "Auth Service")
    scripted.append(Intent(action="describe_module", label="Rate Limiter",
                           summary="Throttles requests."))
    started.post("/turn", json={"input": "the rate limiter throttles requests"})

    body = started.post("/turn", json={"input": "+ create it"}).json()

    assert body["graph"]["specs"][node_id(body, "Rate Limiter")].startswith("the rate limiter")


def test_empty_slot_asks_which_document(started, scripted):
    """A relation the model half-filled asks for the other end, not silence."""
    add(started, scripted, "Auth Service")
    add(started, scripted, "API Gateway")
    scripted.append(Intent(action="link_modules", label="API Gateway", relation="uses"))

    body = started.post("/turn", json={"input": "the gateway uses it"}).json()

    assert body["workflow_step"]["id"] == "disambiguate"
    assert "Auth Service" in body["workflow_step"]["choices"]
    assert main.CREATE_IT not in body["workflow_step"]["choices"]


def test_empty_slot_is_settled_by_picking_one(started, scripted):
    """Answering it completes the relation the turn set out to make."""
    add(started, scripted, "Auth Service")
    add(started, scripted, "API Gateway")
    scripted.append(Intent(action="link_modules", label="API Gateway", relation="uses"))
    started.post("/turn", json={"input": "the gateway uses it"})

    body = started.post("/turn", json={"input": "Auth Service"}).json()

    assert next(iter(body["graph"]["edges"].values()))["target"] == node_id(body, "Auth Service")


def test_settling_takes_two_tries_when_both_ends_are_wrong(started, scripted):
    """Each unknown name is asked about in turn, never guessed at together."""
    add(started, scripted, "Auth Service")
    add(started, scripted, "API Gateway")
    scripted.append(Intent(action="link_modules", label="gatewy", target_label="auth servise"))
    started.post("/turn", json={"input": "gatewy uses auth servise"})

    body = started.post("/turn", json={"input": "API Gateway"}).json()
    assert body["workflow_step"]["id"] == "disambiguate"

    body = started.post("/turn", json={"input": "Auth Service"}).json()
    assert len(body["graph"]["edges"]) == 1


def test_settled_question_returns_to_the_loop(started, scripted):
    """Once resolved, the conversation picks the domain back up."""
    add(started, scripted, "Auth Service")
    add(started, scripted, "API Gateway")
    scripted.append(Intent(action="link_modules", label="API Gateway",
                           target_label="auth servise"))
    started.post("/turn", json={"input": "gateway uses auth servise"})

    body = started.post("/turn", json={"input": "Auth Service"}).json()

    assert body["workflow_step"]["id"] != "disambiguate"


def test_history_reports_status(started, scripted):
    """History exposes each step's action and outcome for the action log."""
    body = add(started, scripted, "Auth Service")

    assert body["history"][-1]["status"] == "applied"
    assert body["history"][-1]["action"] == "add_module"
