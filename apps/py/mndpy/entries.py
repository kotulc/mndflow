"""**entries**: how the system is started and entered — scripts, commands, URL routes, servers."""

import ast
import tomllib

from .classes import resolved
from .source import Module, Project, anchor, doc_of


def entries(project: Project, unit: str | None) -> list[dict]:
    """Every declared way in, under `unit` where one is given."""
    mods = project.under(unit)
    return scripts(project) + mains(mods) + commands(mods) + servers(mods) + routes(project, unit)


def scripts(project: Project) -> list[dict]:
    """Console scripts a `pyproject.toml` declares."""
    file = project.root / "pyproject.toml"
    if not file.exists():
        return []
    said = tomllib.loads(file.read_text(encoding="utf-8")).get("project", {}).get("scripts", {})
    return [{"name": name, "kind": "script", "by": "a person", "runs": target,
             "source": {"file": "pyproject.toml"}} for name, target in said.items()]


def mains(mods: list[Module]) -> list[dict]:
    """Modules run as programs: those with an `if __name__ == "__main__"` block."""
    out = []
    for m in mods:
        for node in m.tree.body:
            if isinstance(node, ast.If) and "__main__" in ast.unparse(node.test):
                out.append({"name": f"python {m.path}", "kind": "main", "by": "a person",
                            "module": m.name, "source": anchor(m, node)})
    return out


def commands(mods: list[Module]) -> list[dict]:
    """Django management commands: `manage.py <name>`, said by their `help`."""
    out = []
    for m in mods:
        if ".management.commands." not in m.name:
            continue
        cls = next((c for c in m.tree.body if isinstance(c, ast.ClassDef)
                    and c.name == "Command"), None)
        if not cls:
            continue
        help_ = next((ast.literal_eval(s.value) for s in cls.body if isinstance(s, ast.Assign)
                      and ast.unparse(s.targets[0]) == "help"
                      and isinstance(s.value, ast.Constant)), None)
        out.append({"name": f"manage.py {m.name.rsplit('.', 1)[-1]}", "kind": "command",
                    "by": "a person or a scheduler", "module": m.name,
                    **({"description": said.strip().splitlines()[0]}
                       if (said := help_ or doc_of(cls)) else {}),
                    "source": anchor(m, cls, "Command")})
    return out


def servers(mods: list[Module]) -> list[dict]:
    """WSGI and ASGI applications: where a web server enters."""
    out = []
    for m in mods:
        for node in m.tree.body:
            if isinstance(node, ast.Assign) and ast.unparse(node.targets[0]) == "application":
                kind = "asgi" if "asgi" in ast.unparse(node.value).lower() else "wsgi"
                out.append({"name": f"{kind.upper()} {m.name}.application", "kind": kind,
                            "by": "a web server", "module": m.name, "source": anchor(m, node)})
    return out


def routes(project: Project, unit: str | None) -> list[dict]:
    """URL routes, each path to the view it calls, followed from the root URL module through
    its includes; only views under `unit` where one is given."""
    root = root_urls(project)
    if not root:
        return []
    out: list[dict] = []
    walk_urls(project, root, "/", out, set())
    target = unit.strip("/").replace("/", ".") if unit else ""
    return [r for r in out if not target or r["view"].startswith(target)]


def root_urls(project: Project) -> str | None:
    """The root URL module a settings module names (`ROOT_URLCONF`)."""
    for m in project.modules.values():
        for node in m.tree.body:
            if isinstance(node, ast.Assign) and ast.unparse(node.targets[0]) == "ROOT_URLCONF" \
                    and isinstance(node.value, ast.Constant):
                return str(node.value.value)
    return None


def walk_urls(project: Project, name: str, prefix: str, out: list, seen: set) -> None:
    """One URL module's `urlpatterns`: routes said, includes followed with their prefix."""
    m = project.modules.get(name)
    if not m or name in seen:
        return
    seen.add(name)
    walk_list(project, m, listed(m, "urlpatterns"), prefix, out, seen)


def listed(m: Module, name: str) -> list[ast.expr]:
    """The items a module-level list of that name holds, `+=` additions included."""
    out: list[ast.expr] = []
    for node in m.tree.body:
        target = node.targets[0] if isinstance(node, ast.Assign) else \
            node.target if isinstance(node, (ast.AugAssign, ast.AnnAssign)) else None
        if target is not None and ast.unparse(target) == name \
                and isinstance(node.value, (ast.List, ast.Tuple)):
            out.extend(node.value.elts)
    return out


def walk_list(project: Project, m: Module, items: list[ast.expr], prefix: str, out: list,
              seen: set) -> None:
    """URL patterns in order: a route said, an include followed — a module by its name, a list
    of this module's by its variable — under the route's prefix."""
    for node in items:
        if not (isinstance(node, ast.Call) and ast.unparse(node.func) in ("path", "re_path")
                and len(node.args) >= 2):
            continue
        at = prefix + route_text(node.args[0])
        view = node.args[1]
        if isinstance(view, ast.Call) and ast.unparse(view.func) == "include":
            inner = view.args[0] if view.args else None
            if isinstance(inner, ast.Constant):
                walk_urls(project, str(inner.value), at, out, seen)
            elif isinstance(inner, ast.Name):
                walk_list(project, m, listed(m, inner.id), at, out, seen)
            continue
        named = next((ast.literal_eval(k.value) for k in node.keywords if k.arg == "name"
                      and isinstance(k.value, ast.Constant)), None)
        out.append({"name": at, "kind": "route", "by": "a browser or a client",
                    "view": resolved(m, ast.unparse(view).split("(")[0].removesuffix(".as_view")),
                    **({"route": named} if named else {}), "source": anchor(m, node)})


def route_text(arg: ast.expr) -> str:
    """A route's path as written: its literal parts, a prefix held in a variable left out."""
    if isinstance(arg, ast.Constant):
        return str(arg.value)
    if isinstance(arg, ast.JoinedStr):
        return "".join(str(v.value) for v in arg.values if isinstance(v, ast.Constant))
    return ""
