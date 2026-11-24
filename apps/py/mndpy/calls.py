"""**calls**: what a function calls, in source order, read statically and followed to a depth.
Calls are resolved through each module's imports; an own function handed to a call by name
(`submit(notify, flip)`) counts as called; a method called on a value (`check.ping()`) is read
by its name where exactly one own class defines it (never a builtin's method name: `d.get`), or
where the value is named after one that does, or for one alone (`channel.notify()`,
`ch.notify()`; 2026-11-23). What cannot be resolved is counted, never guessed, and what lies
outside the project is listed by name."""

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
    # Each call's target, then each own function it is handed to run (`submit(notify, flip)`)
    targets = [t for c in said for t in [callee(m, c.func, owner) or by_method(project, c.func),
                                         *handed(project, m, c, owner)]]
    for target in targets:
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


def handed(project: Project, m: Module, c: ast.Call, owner: str) -> list[str]:
    """The own functions a call is handed by name to run later: a callback, a task, a worker."""
    out = []
    for a in [*c.args, *(k.value for k in c.keywords)]:
        if not isinstance(a, (ast.Name, ast.Attribute)):
            continue
        target = callee(m, a, owner)
        hit = located(project, target) if target else None
        if hit and isinstance(hit[1], (ast.FunctionDef, ast.AsyncFunctionDef)):
            out.append(target)
    return out


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


# Method names the language's own values have: a call by one of them is read by its value's name
BUILTIN = {n for t in (dict, list, set, str, bytes, tuple, int, float, object) for n in dir(t)}


def by_method(project: Project, func: ast.expr) -> str | None:
    """A method called on a value, by its name: where exactly one own class defines it, or
    where the value is named after one of those classes (`channel.notify()`), or starts only
    one's name (`ch.notify()`)."""
    if not isinstance(func, ast.Attribute) or func.attr.startswith("__"):
        return None
    owners = methods_of(project).get(func.attr, [])
    # A unique name alone is never enough where a builtin value has it too (`d.get`, review)
    if len(owners) == 1 and func.attr not in BUILTIN:
        return owners[0]
    named = ast.unparse(func.value).rsplit(".", 1)[-1].replace("_", "").lower()
    hits = [o for o in owners if o.rsplit(".", 2)[-2].lower() == named]
    # A short name for one of them (`ch` for `Channel`), where only one starts so
    if not hits and len(named) >= 2:
        hits = [o for o in owners if o.rsplit(".", 2)[-2].lower().startswith(named)]
    return hits[0] if len(hits) == 1 else None


def methods_of(project: Project) -> dict[str, list[str]]:
    """Every own class's methods by name, each to the dotted names defining it; read once."""
    if not hasattr(project, "_methods"):
        out: dict[str, list[str]] = {}
        for m in project.modules.values():
            for c in m.tree.body:
                if isinstance(c, ast.ClassDef):
                    for d in c.body:
                        if isinstance(d, (ast.FunctionDef, ast.AsyncFunctionDef)):
                            out.setdefault(d.name, []).append(f"{m.name}.{c.name}.{d.name}")
        setattr(project, "_methods", out)
    return getattr(project, "_methods")
