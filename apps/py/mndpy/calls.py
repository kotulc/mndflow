"""**calls**: what a function calls, in source order, read statically and followed to a depth.
Calls are resolved through each module's imports; what cannot be resolved is counted, never
guessed, and what lies outside the project is listed by name."""

import ast

from .source import Module, Project, anchor


def calls(project: Project, start: str, depth: int) -> dict:
    """The call tree from `start` (`module.function` or `module.Class.method`)."""
    found = located(project, start)
    if not found:
        raise ValueError(f"no function {start} in the project")
    return step(project, *found, start, depth, set())


def located(project: Project, dotted: str) -> tuple[Module, ast.AST] | None:
    """The module and the definition a dotted name stands for: the longest module prefix, then
    classes and functions inside it."""
    parts = dotted.split(".")
    for cut in range(len(parts) - 1, 0, -1):
        m = project.modules.get(".".join(parts[:cut]))
        if not m:
            continue
        node: ast.AST = m.tree
        for name in parts[cut:]:
            node = next((d for d in getattr(node, "body", []) if isinstance(
                d, (ast.ClassDef, ast.FunctionDef, ast.AsyncFunctionDef)) and d.name == name),
                None)  # type: ignore[assignment]
            if node is None:
                return None
        return m, node
    return None


def step(project: Project, m: Module, fn: ast.AST, name: str, left: int, seen: set) -> dict:
    """One function and, while depth is left, each project function it calls in turn."""
    seen.add(name)
    out: dict = {"function": name, "source": anchor(m, fn, name.rsplit(".", 1)[-1])}
    if isinstance(fn, ast.ClassDef):
        return out
    owner = name.rsplit(".", 2)[-2] if name.count(".") >= 2 else ""
    said = sorted((c for c in ast.walk(fn) if isinstance(c, ast.Call)),
                  key=lambda c: (c.lineno, c.col_offset))
    inner, outside, unresolved = [], [], 0
    for c in said:
        target = callee(m, c.func, owner)
        if not target:
            unresolved += 1
            continue
        hit = located(project, target) or located(project, target.rsplit(".", 1)[0])
        if not hit:
            if target.split(".")[0] not in {n.split(".")[0] for n in project.modules} \
                    and target not in outside:
                outside.append(target)
            continue
        at = target if located(project, target) else target.rsplit(".", 1)[0]
        if at in seen or any(s["function"] == at for s in inner):
            continue
        inner.append(step(project, *hit, at, left - 1, seen) if left > 1
                     else {"function": at, "source": anchor(hit[0], hit[1], at.rsplit(".", 1)[-1])})
    return {**out, **({"calls": inner} if inner else {}),
            **({"outside": outside} if outside else {}),
            **({"unresolved": unresolved} if unresolved else {})}


def callee(m: Module, func: ast.expr, owner: str) -> str | None:
    """The dotted name a call reaches: a local definition, an imported name, or `self`'s."""
    text = ast.unparse(func)
    head, _, rest = text.partition(".")
    if not head.isidentifier() or "(" in text or "[" in text:
        return None
    if head in ("self", "cls") and owner:
        return f"{m.name}.{owner}.{rest}" if rest else None
    if head in m.imported:
        return f"{m.imported[head]}.{rest}" if rest else m.imported[head]
    local = any(isinstance(d, (ast.ClassDef, ast.FunctionDef, ast.AsyncFunctionDef))
                and d.name == head for d in m.tree.body)
    return f"{m.name}.{text}" if local else None
