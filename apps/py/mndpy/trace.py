"""**trace**: the calls a real run makes between the project's functions, caller to callee, in
the order first made — a test or a command run in the project's own interpreter."""

import json
import shlex
import subprocess
import sys
import tempfile
from pathlib import Path

from .source import Project


def trace(project: Project, run: str, unit: str | None, depth: int | None) -> dict:
    """Runs `run` (a script and its arguments, as `manage.py test hc.api`) and lists the calls
    with an end under `unit`, none to or from a test (the run's driver, not the system); with
    `depth`, each end gathered to that many levels below `unit` (else below its top package)."""
    if not run:
        raise ValueError('asks --run "<script> [args]", as: --run "manage.py test hc.api"')
    python = interpreter(project.root)
    runner = Path(__file__).with_name("runner.py")
    with tempfile.TemporaryDirectory() as tmp:
        out = Path(tmp) / "calls.json"
        done = subprocess.run([python, str(runner), str(project.root), str(out), *shlex.split(run)],
                              cwd=project.root, capture_output=True, text=True)
        if not out.exists():
            raise RuntimeError(f"the run wrote nothing: {done.stderr.strip()[-400:]}")
        ran = json.loads(out.read_text(encoding="utf-8"))
    said, code = ran["calls"], ran["exit"]
    # A run that failed or called nothing of the project is said, never an empty answer
    if code or not said:
        tail = (done.stderr or done.stdout).strip()[-600:]
        raise RuntimeError(f"the run {'exited ' + str(code) if code else 'called nothing'}: "
                           f"{tail or 'it printed nothing; check the test label or script'}")
    target = unit.strip("/").replace("/", ".") if unit else ""
    inside = [c for c in said if not (is_test(c["from"]) or is_test(c["to"]))
              and (not target or c["from"].startswith(target) or c["to"].startswith(target))]
    if depth:
        inside = gathered(inside, (len(target.split(".")) if target else 1) + depth)
    # `depth` says the ends are units, not functions (draw reads it)
    return {"run": run, "exit": code, **({"depth": depth} if depth else {}),
            "calls": inside}


def gathered(calls: list[dict], depth: int) -> list[dict]:
    """Each end cut to `depth` dotted levels, merged per pair, kept in first order; `what`
    names the functions called across it, as the unit reached holds them, in first order."""
    merged: dict[tuple[str, str], dict] = {}
    for c in sorted(calls, key=lambda c: c["order"]):
        a, b = (".".join(c[k].split(".")[:depth]) for k in ("from", "to"))
        if a == b:
            continue
        hit = merged.setdefault((a, b), {"from": a, "to": b, "what": [], "n": 0,
                                         "order": c["order"]})
        hit["n"] += c["n"]
        what = c["to"][len(b) + 1:]
        if what and what not in hit["what"]:
            hit["what"].append(what)
    return sorted(merged.values(), key=lambda c: c["order"])


def is_test(name: str) -> bool:
    """Whether a dotted name lies in a test module or a tests package."""
    return any(p == "tests" or p.startswith("test_") or p == "conftest" for p in name.split("."))


def interpreter(root: Path) -> str:
    """The project's own Python: its virtual environment's, else this one."""
    for rel in (".venv/Scripts/python.exe", ".venv/bin/python", "venv/Scripts/python.exe",
                "venv/bin/python"):
        if (root / rel).exists():
            return str(root / rel)
    return sys.executable
