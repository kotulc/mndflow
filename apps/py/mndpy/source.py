"""A Python project read as modules: where each lives, its syntax tree, and anchors to source."""

import ast
from dataclasses import dataclass, field
from functools import cached_property
from pathlib import Path


# Folders never read: tooling, assets, generated code and tests (tests drive `trace` instead)
SKIPPED = {".venv", "venv", "env", ".git", "node_modules", "static", "templates", "migrations",
           "tests", "__pycache__", "build", "dist"}


@dataclass
class Module:
    """One source file: its dotted name, its path from the project root, and its tree."""

    name: str
    path: str
    file: Path
    is_package: bool = False

    @cached_property
    def tree(self) -> ast.Module:
        return ast.parse(self.file.read_text(encoding="utf-8", errors="replace"))

    @cached_property
    def lines(self) -> int:
        return len(self.file.read_text(encoding="utf-8", errors="replace").splitlines())

    @cached_property
    def imported(self) -> dict[str, str]:
        """Each name bound by an import here, to the dotted name it stands for."""
        out: dict[str, str] = {}
        for node in ast.walk(self.tree):
            if isinstance(node, ast.Import):
                for a in node.names:
                    out[a.asname or a.name.split(".")[0]] = a.name if a.asname else a.name.split(".")[0]
            elif isinstance(node, ast.ImportFrom):
                base = resolved_from(self, node)
                for a in node.names:
                    out[a.asname or a.name] = f"{base}.{a.name}" if base else a.name
        return out


@dataclass
class Project:
    """A project's modules by dotted name, read under its root."""

    root: Path
    modules: dict[str, Module] = field(default_factory=dict)

    def under(self, unit: str | None) -> list[Module]:
        """The modules inside `unit` (a dotted name or a folder), else all of them."""
        if not unit:
            return list(self.modules.values())
        dotted = unit.strip("/").replace("/", ".").removesuffix(".py")
        return [m for m in self.modules.values()
                if m.name == dotted or m.name.startswith(dotted + ".")]


def anchor(m: Module, node: ast.AST | None = None, symbol: str | None = None) -> dict:
    """Where a fact comes from: a file, the line, and the symbol where there is one."""
    out: dict = {"file": m.path}
    if node is not None and hasattr(node, "lineno"):
        out["line"] = node.lineno
    if symbol:
        out["symbol"] = symbol
    return out


def doc_of(node: ast.AST) -> str | None:
    """A node's docstring, its first line only."""
    try:
        text = ast.get_docstring(node)  # type: ignore[arg-type]
    except TypeError:
        return None
    return text.strip().splitlines()[0] if text else None


def read_project(root: str) -> Project:
    """Every importable module under `root`: top-level packages and loose top-level modules."""
    base = Path(root).resolve()
    project = Project(base)
    for file in sorted(base.rglob("*.py")):
        rel = file.relative_to(base)
        if any(p in SKIPPED or p.startswith(".") for p in rel.parts[:-1]):
            continue
        if file.name.startswith("test_") or file.name in ("setup.py", "conftest.py"):
            continue
        # A module counts only where every folder above it is a package
        if not all((base.joinpath(*rel.parts[:i]) / "__init__.py").exists()
                   for i in range(1, len(rel.parts))):
            continue
        parts = list(rel.with_suffix("").parts)
        is_package = parts[-1] == "__init__"
        if is_package:
            parts = parts[:-1]
        name = ".".join(parts)
        project.modules[name] = Module(name, rel.as_posix(), file, is_package)
    return project


def resolved_from(m: Module, node: ast.ImportFrom) -> str:
    """The module a `from … import` reads, relative dots resolved against `m`."""
    if not node.level:
        return node.module or ""
    here = m.name.split(".") if m.is_package else m.name.split(".")[:-1]
    up = here[: len(here) - (node.level - 1)] if node.level > 1 else here
    return ".".join(up + ([node.module] if node.module else []))
