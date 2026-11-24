"""**entries**: how the system is started and entered, read the same way for any project
(2026-11-23: no framework readers). Five generic rules:

- *script*: console scripts a `pyproject.toml` declares
- *main*: modules run as programs (`if __name__ == "__main__"`)
- *process*: command lines in process files (shell scripts, Dockerfiles, Procfiles, compose
  files) naming an own module, or an own script's subcommand that an own module is named for
- *registered*: an own function or class passed to an outside call at module level
  (`path("ping/", views.ping)`, `app.add_url_rule(...)`); a literal beside it names it, and an
  own module mounted by string (`include("hc.api.urls")`) takes the mount's literal as prefix
- *decorated*: an own function decorated by an outside package (`@app.route`, `@shared_task`)

Each entry says what it runs (`runs`, a dotted function or class) where one is found, how many
ways in run it (`ways`), how many own functions its calls reach (`reach`) and the own classes
they touch (`touches`): what ranks the main paths."""

import ast
import shlex
import sys
import tomllib
from pathlib import Path

from .calls import calls, located
from .classes import resolved
from .source import SKIPPED, Module, Project, anchor


# Files whose lines start processes, by name or suffix
PROCESS_NAMES = ("Procfile", "Dockerfile", "Makefile")
PROCESS_ENDS = (".sh", ".service", ".ini")
PROCESS_GLOBS = ("docker-compose*.yml", "docker-compose*.yaml", "compose*.yml", "Dockerfile*")
# Decorators that never mark a way in (the language's own, or typing's)
PLAIN = {"property", "staticmethod", "classmethod", "abstractmethod", "override", "overload",
         "cached_property", "dataclass", "wraps", "lru_cache", "cache", "contextmanager",
         "total_ordering", "final", "unique"}


def entries(project: Project, unit: str | None) -> list[dict]:
    """Every way in, one per thing it runs, under `unit` where one is given."""
    found = scripts(project) + mains(project) + processes(project) + registered(project) \
        + decorated(project)
    target = unit.strip("/").replace("/", ".").removesuffix(".py") if unit else ""
    # How many ways in run each function: the one most lead into is central (a decorator on it
    # is no way in of its own, review)
    ways: dict[str, int] = {}
    for e in found:
        if e.get("runs") and e["kind"] != "decorated":
            ways[e["runs"]] = ways.get(e["runs"], 0) + 1
    out: list[dict] = []
    seen: set[str] = set()
    for e in found:
        key = e.get("runs") or e["name"]
        runs = str(e.get("runs", ""))
        if key in seen or (target and runs != target and not runs.startswith(target + ".")):
            continue
        seen.add(key)
        out.append({**e, "ways": ways.get(e["runs"], 1), **sized(project, e["runs"])}
                   if e.get("runs") else e)
    return out


def sized(project: Project, runs: str) -> dict:
    """How far a way in reaches: the own functions its calls reach, and the own classes they
    make or call into (what a path is about)."""
    try:
        tree = calls(project, runs, 4)
    except ValueError:
        return {}
    names: list[str] = []

    def walk(n: dict) -> None:
        for c in n.get("calls", []):
            names.append(c["function"])
            walk(c)
    walk(tree)
    classes = sorted({c for n in names if (c := class_of(project, n))})
    return {"reach": len(names), **({"touches": classes} if classes else {})}


def class_of(project: Project, dotted: str) -> str | None:
    """The own class a dotted function or class name lies in, by its name."""
    hit = located(project, dotted)
    if hit and isinstance(hit[1], ast.ClassDef):
        return dotted.rsplit(".", 1)[-1]
    holder = dotted.rsplit(".", 1)[0]
    hit = located(project, holder) if "." in holder else None
    return holder.rsplit(".", 1)[-1] if hit and isinstance(hit[1], ast.ClassDef) else None


def scripts(project: Project) -> list[dict]:
    """Console scripts a `pyproject.toml` declares."""
    file = project.root / "pyproject.toml"
    if not file.exists():
        return []
    said = tomllib.loads(file.read_text(encoding="utf-8")).get("project", {}).get("scripts", {})
    return [{"name": name, "kind": "script", "by": "a person",
             "runs": target.replace(":", "."), "source": {"file": "pyproject.toml"}}
            for name, target in said.items()]


def mains(project: Project) -> list[dict]:
    """Modules run as programs, each running the first own function its main block calls
    (`raise SystemExit(main())` runs `main`, never `SystemExit`)."""
    out = []
    for m in project.modules.values():
        for node in m.tree.body:
            if isinstance(node, ast.If) and "__main__" in ast.unparse(node.test):
                said = sorted((c for c in ast.walk(node) if isinstance(c, ast.Call)
                               and isinstance(c.func, ast.Name)),
                              key=lambda c: (c.lineno, c.col_offset))
                runs = next((r for c in said if (r := resolved(m, c.func.id))  # type: ignore
                             and is_own(project, r) and located(project, r)), None)
                out.append({"name": f"python {m.path}", "kind": "main", "by": "a person",
                            **({"runs": runs} if runs else {}), "source": anchor(m, node)})
    return out


def processes(project: Project) -> list[dict]:
    """Command lines in process files that start an own module."""
    out = []
    for file in process_files(project.root):
        rel = file.relative_to(project.root).as_posix()
        for no, line in enumerate(file.read_text(encoding="utf-8", errors="replace").splitlines(), 1):
            for name, module in started(project, line):
                runs = runner_of(project, module)
                out.append({"name": name, "kind": "process", "by": "an operator",
                            "module": module, **({"runs": runs} if runs else {}),
                            "source": {"file": rel, "line": no}})
    return out


def process_files(root: Path) -> list[Path]:
    """Process files at the root or one folder below it, skipped folders left out."""
    found: set[Path] = set()
    for at in [root, *(d for d in root.iterdir() if d.is_dir() and d.name not in SKIPPED
                       and not d.name.startswith("."))]:
        for f in at.iterdir():
            if f.is_file() and (f.name in PROCESS_NAMES or f.suffix in PROCESS_ENDS
                                or any(f.match(g) for g in PROCESS_GLOBS)):
                found.add(f)
    return sorted(found)


def started(project: Project, line: str) -> list[tuple[str, str]]:
    """What one command line starts: an own module named dotted (`hc.wsgi:application`,
    `-m hc.worker`), or an own script's subcommand an own module is named for
    (`manage.py sendalerts`); each with the words that start it."""
    try:
        words = shlex.split(line.split("#")[0], posix=True)
    except ValueError:
        words = line.split()
    # An exec form (`CMD ["python", "-m", "hc.worker"]`) read as the words it holds
    words = [x for w in words if (x := w.strip("[],\"'"))]
    out = []
    for i, w in enumerate(words):
        # A module said as `module:attr` (a server's app) or after `-m` (run as a program)
        dotted = w.split(":")[0]
        said = ":" in w or (i > 0 and words[i - 1] == "-m")
        if said and dotted in project.modules:
            out.append((" ".join(words[max(0, i - 1): i + 1]), dotted))
        elif w.endswith(".py") and i + 1 < len(words):
            sub = words[i + 1]
            named = [n for n in project.modules if n.rsplit(".", 1)[-1] == sub]
            if len(named) == 1:
                out.append((f"{Path(w).name} {sub}", named[0]))
    return out


def runner_of(project: Project, module: str) -> str | None:
    """What a module started as a process runs: its function or method reaching most."""
    m = project.modules[module]
    named = [f"{module}.{d.name}" for d in m.tree.body
             if isinstance(d, (ast.FunctionDef, ast.AsyncFunctionDef)) and not d.name.startswith("_")]
    named += [f"{module}.{c.name}.{d.name}" for c in m.tree.body if isinstance(c, ast.ClassDef)
              for d in c.body if isinstance(d, (ast.FunctionDef, ast.AsyncFunctionDef))
              and not d.name.startswith("_")]
    sized = [(reach(calls(project, n, 3)), n) for n in named]
    return max(sized)[1] if sized and max(sized)[0] else None


def reach(tree: dict) -> int:
    """How many own functions a call tree reaches."""
    return sum(1 + reach(c) for c in tree.get("calls", []))


def registered(project: Project) -> list[dict]:
    """Own functions and classes passed to outside calls at module level, mounts followed."""
    mounted = {t for m in project.modules.values() for c in top_calls(m)
               for _, t in mounts(project, m, c)}
    out: list[dict] = []
    for m in project.modules.values():
        if m.name not in mounted:
            walk(project, m, top_calls(m), "", out, set())
    return out


def walk(project: Project, m: Module, said: list[ast.Call], prefix: str, out: list,
         seen: set) -> None:
    """One module's outside calls in order: each own callable passed is registered under the
    call's literal; each own module or list mounted is walked under it."""
    seen.add(m.name)
    for c in said:
        via = outside(project, m, c.func)
        if not via:
            continue
        at = prefix + literal_of(c)
        for arg in [*c.args, *(k.value for k in c.keywords)]:
            # An outside call inside: a mount (a module by name, or a list of this module's),
            # else a wrapper (`csrf_exempt(views.ping)`) round the callable it registers
            wrapped = isinstance(arg, ast.Call) and bool(outside(project, m, arg.func))
            if wrapped and mount(project, m, arg, at, out, seen):  # type: ignore[arg-type]
                continue
            held = [*arg.args] if wrapped else [arg]  # type: ignore[attr-defined]
            runs = next((r for a in held if (r := own_callable(project, m, a))), None)
            if runs:
                out.append({"name": at or runs.rsplit(".", 1)[-1], "kind": "registered",
                            "by": "a caller", "via": via, "runs": runs, "source": anchor(m, c)})


def mount(project: Project, m: Module, x: ast.Call, at: str, out: list, seen: set) -> bool:
    """An outside call mounting own modules by name or this module's lists, each walked under
    `at`; whether it mounted any."""
    hit = False
    for s in x.args:
        if isinstance(s, ast.Constant) and s.value in project.modules:
            hit = True
            if s.value not in seen:
                walk(project, project.modules[s.value], top_calls(project.modules[s.value]),
                     at, out, seen)
        elif isinstance(s, ast.Name) and (listed := listed_calls(m, s.id)):
            hit = True
            walk(project, m, listed, at, out, seen)
    return hit


def mounts(project: Project, m: Module, c: ast.Call) -> list[tuple[ast.Call, str]]:
    """Own modules an outside call mounts by string, inside one of its arguments."""
    out = []
    for arg in c.args:
        if isinstance(arg, ast.Call):
            for s in arg.args:
                if isinstance(s, ast.Constant) and isinstance(s.value, str) \
                        and s.value in project.modules:
                    out.append((arg, s.value))
    return out


def top_calls(m: Module) -> list[ast.Call]:
    """The calls a module makes at its top level, a list's or tuple's items included."""
    out: list[ast.Call] = []
    for node in m.tree.body:
        value = node.value if isinstance(node, (ast.Assign, ast.AugAssign, ast.AnnAssign,
                                                ast.Expr)) else None
        out.extend(calls_in(value))
    return out


def listed_calls(m: Module, name: str) -> list[ast.Call]:
    """The calls a module-level list of that name holds."""
    out: list[ast.Call] = []
    for node in m.tree.body:
        target = node.targets[0] if isinstance(node, ast.Assign) else \
            node.target if isinstance(node, (ast.AugAssign, ast.AnnAssign)) else None
        if target is not None and ast.unparse(target) == name:
            out.extend(calls_in(node.value))
    return out


def calls_in(value: ast.expr | None) -> list[ast.Call]:
    """A value's outermost calls: itself, or the items of a list, tuple or joined lists."""
    if isinstance(value, ast.Call):
        return [value]
    if isinstance(value, (ast.List, ast.Tuple)):
        return [c for e in value.elts for c in calls_in(e)]
    if isinstance(value, ast.BinOp):
        return calls_in(value.left) + calls_in(value.right)
    return []


def literal_of(c: ast.Call) -> str:
    """A call's first literal text: a route's path, a command's name; f-strings' fixed parts."""
    for a in c.args:
        if isinstance(a, ast.Constant) and isinstance(a.value, str):
            return a.value
        if isinstance(a, ast.JoinedStr):
            return "".join(str(v.value) for v in a.values if isinstance(v, ast.Constant))
    return ""


def own_callable(project: Project, m: Module, arg: ast.expr) -> str | None:
    """The own function or class an argument names; a call on one (`View.as_view()`) its own."""
    if isinstance(arg, ast.Call):
        arg = arg.func.value if isinstance(arg.func, ast.Attribute) else arg.func
    if not isinstance(arg, (ast.Name, ast.Attribute)):
        return None
    text = ast.unparse(arg)
    if not all(p.isidentifier() for p in text.split(".")):
        return None
    dotted = resolved(m, text)
    return dotted if is_own(project, dotted) and located(project, dotted) else None


def decorated(project: Project) -> list[dict]:
    """Own module-level functions an outside package's decorator wraps (a method's decorator
    is a hook of its class: a validator, a display, never a way in)."""
    out = []
    for m in project.modules.values():
        for d in [d for d in m.tree.body if isinstance(d, (ast.FunctionDef, ast.AsyncFunctionDef))]:
            for dec in d.decorator_list:
                via = outside(project, m, dec.func if isinstance(dec, ast.Call) else dec)
                if not via or via.rsplit(".", 1)[-1] in PLAIN:
                    continue
                runs = f"{m.name}.{d.name}"
                text = literal_of(dec) if isinstance(dec, ast.Call) else ""
                out.append({"name": text or d.name, "kind": "decorated", "by": "a caller",
                            "via": via, "runs": runs, "source": anchor(m, d, d.name)})
                break
    return out


def outside(project: Project, m: Module, func: ast.expr) -> str | None:
    """The outside package's dotted name a callee reaches: imported from outside, or a method of
    a module-level name made by an outside call (`app = Flask(...)`); never the language's own."""
    text = ast.unparse(func)
    head = text.split(".")[0]
    if not head.isidentifier():
        return None
    made = next((n.value for n in m.tree.body if isinstance(n, ast.Assign)
                 and isinstance(n.value, ast.Call) and len(n.targets) == 1
                 and ast.unparse(n.targets[0]) == head), None)
    if made is not None and head not in m.imported:
        maker = outside(project, m, made.func)
        return f"{maker}{text[len(head):]}" if maker else None
    dotted = resolved(m, text)
    top = dotted.split(".")[0]
    if head not in m.imported or is_own(project, dotted) or top in sys.stdlib_module_names \
            or top in ("typing", "typing_extensions", "abc"):
        return None
    return dotted


def is_own(project: Project, dotted: str) -> bool:
    """Whether a dotted name lies in the project."""
    tops = {n.split(".")[0] for n in project.modules}
    return dotted.split(".")[0] in tops

