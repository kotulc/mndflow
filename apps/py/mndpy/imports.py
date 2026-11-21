"""**imports**: which units import which, gathered to a level, and what outside each reaches."""

import sys
from collections import defaultdict

import grimp

from .source import Project


def imports(project: Project, unit: str | None, depth: int) -> dict:
    """Imports out of `unit`'s modules, each end gathered to `depth` levels below the target
    (else below each top package), with one anchor each; packages from outside listed apart,
    the standard library by name only."""
    sys.path.insert(0, str(project.root))
    tops = sorted(n for n, m in project.modules.items() if m.is_package and "." not in n)
    graph = grimp.build_graph(*tops, include_external_packages=True, cache_dir=None)
    target = unit.strip("/").replace("/", ".").removesuffix(".py") if unit else ""
    level = (len(target.split(".")) if target else 1) + depth

    def gathered(name: str) -> str:
        return ".".join(name.split(".")[:level])

    edges: dict[tuple[str, str], dict] = {}
    outside: dict[str, set[str]] = defaultdict(set)
    for m in project.under(unit):
        if m.name not in graph.modules:
            continue
        for to in graph.find_modules_directly_imported_by(m.name):
            if to.split(".")[0] not in tops:
                outside[to.split(".")[0]].add(gathered(m.name))
                continue
            a, b = gathered(m.name), gathered(to)
            if a == b or b.startswith(a + ".") or a.startswith(b + "."):
                continue
            edge = edges.setdefault((a, b), {"from": a, "to": b, "n": 0})
            edge["n"] += 1
            if "source" not in edge:
                said = graph.get_import_details(importer=m.name, imported=to)
                edge["source"] = {"file": m.path, **({"line": said[0]["line_number"]}
                                                       if said else {})}
    # The standard library is named apart from the packages the project depends on
    std = sys.stdlib_module_names | {"__future__"}
    return {"imports": sorted(edges.values(), key=lambda e: (-e["n"], e["from"], e["to"])),
            "outside": [{"package": p, "by": sorted(by)} for p, by in sorted(outside.items())
                        if p not in std],
            "stdlib": sorted(p for p in outside if p in std)}
