"""The command: `python -m mndpy fact <name> <project> [--unit u] [--depth n] [--from f]
[--of name] [--run "<script> [args]"]`, printing the answer as JSON."""

import argparse
import json
import sys

from .calls import calls
from .classes import classes
from .entries import entries
from .imports import imports
from .source import read_project
from .trace import trace
from .units import units


FACTS = ("units", "imports", "classes", "entries", "calls", "trace")


def answer(name: str, a: argparse.Namespace):
    """One fact tool's answer for the project."""
    project = read_project(a.project)
    if name == "units":
        return units(project, a.unit, a.depth or 1)
    if name == "imports":
        return imports(project, a.unit, a.depth or 1)
    if name == "classes":
        return classes(project, a.unit, a.of)
    if name == "entries":
        return entries(project, a.unit)
    if name == "calls":
        if not a.start:
            raise ValueError("asks --from <module.function>")
        return calls(project, a.start, a.depth or 3)
    return trace(project, a.run or "", a.unit, a.depth)


def main() -> None:
    """Parses the command and prints the answer, or why there is none."""
    p = argparse.ArgumentParser(prog="mndpy")
    p.add_argument("verb", choices=["fact"])
    p.add_argument("name", choices=FACTS)
    p.add_argument("project")
    p.add_argument("--unit")
    p.add_argument("--depth", type=int)
    p.add_argument("--from", dest="start")
    p.add_argument("--of")
    p.add_argument("--run")
    a = p.parse_args()
    try:
        print(json.dumps(answer(a.name, a), indent=2))
    except (ValueError, RuntimeError) as e:
        print(f"  {e}", file=sys.stderr)
        sys.exit(1)


main()
