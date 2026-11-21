"""Runs a Python program with a profile hook, recording each call between the project's own
functions — caller to callee, how often, in the order first made — then writes them as JSON.
Run by `trace` in the project's own interpreter: `runner.py <root> <out.json> <script> [args]`.
Standard library only, since it runs where the project's packages are, not mndpy's."""

import json
import os
import runpy
import sys
import threading


root, out, script, *args = sys.argv[1:]
root = os.path.normcase(os.path.abspath(root))
skipped = (os.sep + ".venv" + os.sep, os.sep + "site-packages" + os.sep)
edges: dict[tuple[str, str], list[int]] = {}
names: dict[object, str | None] = {}


def name_of(code) -> str | None:
    """A code object's dotted name, where it is the project's own; else None."""
    if code in names:
        return names[code]
    file = os.path.normcase(os.path.abspath(code.co_filename))
    name = None
    if file.startswith(root) and not any(s in file for s in skipped):
        rel = os.path.relpath(file, root)[:-3].replace(os.sep, ".").removesuffix(".__init__")
        name = f"{rel}.{getattr(code, 'co_qualname', code.co_name)}"
    names[code] = name
    return name


def hook(frame, event, _arg):
    """On a call into the project, an edge from the nearest project frame below it."""
    if event != "call":
        return
    to = name_of(frame.f_code)
    if not to or "<" in to:
        return
    back = frame.f_back
    while back and not name_of(back.f_code):
        back = back.f_back
    by = name_of(back.f_code) if back else None
    if not by or "<" in by or by == to:
        return
    # Only a function calls: a class body runs once as its module loads (CO_OPTIMIZED unset)
    if not back.f_code.co_flags & 1:
        return
    # A nested class's body runs once as its holder is made: no call anyone wrote
    if not frame.f_code.co_flags & 1:
        return
    seen = edges.setdefault((by, to), [0, len(edges)])
    seen[0] += 1


sys.argv = [script, *args]
sys.path.insert(0, os.path.dirname(os.path.abspath(script)))
threading.setprofile(hook)
sys.setprofile(hook)
code = 0
try:
    runpy.run_path(script, run_name="__main__")
except SystemExit as e:
    # The run's own exit code is kept, so a run that failed is said
    code = e.code if isinstance(e.code, int) else (0 if e.code is None else 1)
finally:
    sys.setprofile(None)
    with open(out, "w", encoding="utf-8") as f:
        json.dump({"exit": code, "calls": [{"from": a, "to": b, "n": n, "order": i}
                   for (a, b), (n, i) in sorted(edges.items(), key=lambda e: e[1][1])]}, f)
