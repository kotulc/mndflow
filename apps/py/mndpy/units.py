"""**units**: the containment tree — packages, modules, classes, functions — to a depth."""

import ast

from .source import Module, Project, anchor, doc_of


def units(project: Project, unit: str | None, depth: int) -> list[dict]:
    """The tree under `unit` (else every top-level unit), `depth` levels below it."""
    names = {m.name for m in project.under(unit)}
    if unit:
        tops = [unit.strip("/").replace("/", ".").removesuffix(".py")]
    else:
        tops = sorted({n.split(".")[0] for n in names})
    found = [node_of(project, t, names, depth + 1) for t in tops if t in names or any(
        n.startswith(t + ".") for n in names)]
    if unit and not found:
        # A class or function is listed as a part of its module, never as a target
        held = max((n for n in project.modules if tops[0].startswith(n + ".")), key=len, default="")
        raise ValueError(f"no package or module {tops[0]}" + (
            f"; it is a part of {held}: --unit {held} --depth {len(tops[0].split('.'))
            - len(held.split('.')) + 1}" if held else ""))
    return found


def node_of(project: Project, name: str, names: set[str], depth: int) -> dict:
    """A package or a module, and what it holds while depth is left."""
    m = project.modules.get(name)
    kids = sorted(n for n in names if n.rsplit(".", 1)[0] == name and n != name)
    lines = sum(project.modules[n].lines for n in names if n == name or n.startswith(name + "."))
    if m and not m.is_package:
        out = {"unit": name, "name": name.rsplit(".", 1)[-1], "kind": "module", "lines": lines,
               **described(m.tree), "source": anchor(m)}
        if depth > 1:
            out["parts"] = [part_of(m, d, f"{name}.{d.name}", depth - 1) for d in defs_of(m.tree)]
        return out
    # A package holding models or app config is one of its framework's components
    component = f"{name}.apps" in names or f"{name}.models" in names
    out = {"unit": name, "name": name.rsplit(".", 1)[-1],
           "kind": "component" if component else "package", "lines": lines,
           **(described(m.tree) if m else {}),
           "source": anchor(m) if m else {"file": name.replace(".", "/")}}
    if depth > 1 and kids:
        out["parts"] = [node_of(project, k, names, depth - 1) for k in kids]
    return out


def part_of(m: Module, d: ast.AST, unit: str, depth: int) -> dict:
    """A class (with its methods while depth is left) or a function."""
    lines = d.end_lineno - d.lineno + 1  # type: ignore[attr-defined]
    if isinstance(d, ast.ClassDef):
        out = {"unit": unit, "name": d.name, "kind": "class", "lines": lines,
               "bases": [ast.unparse(b) for b in d.bases], **described(d),
               "source": anchor(m, d, d.name)}
        if depth > 1:
            out["parts"] = [part_of(m, x, f"{unit}.{x.name}", depth - 1) for x in defs_of(d)]
        return out
    return {"unit": unit, "name": d.name, "kind": "function", "lines": lines,  # type: ignore
            "signature": signature_of(d), **described(d),
            "source": anchor(m, d, d.name)}  # type: ignore[attr-defined]


def defs_of(node: ast.AST) -> list[ast.AST]:
    """The public classes and functions a module or class declares, in source order."""
    kinds = (ast.ClassDef, ast.FunctionDef, ast.AsyncFunctionDef)
    return [d for d in node.body if isinstance(d, kinds)  # type: ignore[attr-defined]
            and not d.name.startswith("_")]


def described(node: ast.AST) -> dict:
    """A node's docstring as its description, where it has one."""
    doc = doc_of(node)
    return {"description": doc} if doc else {}


def signature_of(d: ast.FunctionDef | ast.AsyncFunctionDef) -> str:
    """A function as it is called: its name, arguments and what it returns."""
    returns = f" -> {ast.unparse(d.returns)}" if d.returns else ""
    return f"{d.name}({ast.unparse(d.args)}){returns}"
