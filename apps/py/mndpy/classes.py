"""**classes**: each class — what it extends, its fields (a framework model's columns and keys
included), its choices where it is an enumeration, and its methods."""

import ast
import builtins

from .source import Module, Project, anchor, doc_of
from .units import signature_of


# A call making a column, read by its name's ending (Django's, SQLAlchemy's, Pydantic's)
FIELD_ENDS = ("Field", "ForeignKey", "Column", "relationship")
# Keyword options worth saying of a column
OPTIONS = ("null", "blank", "default", "unique", "primary_key", "on_delete", "related_name",
           "max_length", "choices")


def classes(project: Project, unit: str | None, of: str | None) -> list[dict]:
    """Every class under `unit`, or only those named `of`."""
    out = []
    for m in project.under(unit):
        for node in ast.walk(m.tree):
            if isinstance(node, ast.ClassDef) and (not of or node.name == of) \
                    and not node.name.startswith("_") and node.name != "Meta":
                out.append(class_of(m, node))
    return out


def class_of(m: Module, c: ast.ClassDef) -> dict:
    """One class: its anchor, bases resolved through the module's imports, fields, methods."""
    bases = [resolved(m, ast.unparse(b)) for b in c.bases]
    fields = [f for s in c.body if (f := field_of(s))]
    choices = [t.id for s in c.body if isinstance(s, ast.Assign) for t in s.targets
               if isinstance(t, ast.Name) and t.id.isupper()] \
        if any(b.rsplit(".", 1)[-1] in ("Enum", "TextChoices", "IntegerChoices", "StrEnum")
               for b in bases) else []
    methods = [signature_of(s) for s in c.body
               if isinstance(s, (ast.FunctionDef, ast.AsyncFunctionDef))
               and not (s.name.startswith("_") and not s.name.startswith("__"))]
    return {"name": c.name, "unit": f"{m.name}.{c.name}", "extends": bases,
            **({"description": d} if (d := doc_of(c)) else {}),
            **({"fields": fields} if fields else {}), **({"choices": choices} if choices else {}),
            **({"methods": methods} if methods else {}), "source": anchor(m, c, c.name)}


def field_of(s: ast.stmt) -> dict | None:
    """A class-level field: annotated, or assigned a column-making call."""
    if isinstance(s, ast.AnnAssign) and isinstance(s.target, ast.Name):
        return {"name": s.target.id, "type": ast.unparse(s.annotation), "line": s.lineno}
    if not (isinstance(s, ast.Assign) and len(s.targets) == 1
            and isinstance(s.targets[0], ast.Name) and isinstance(s.value, ast.Call)):
        return None
    call = s.value
    kind = ast.unparse(call.func).rsplit(".", 1)[-1]
    if not kind.endswith(FIELD_ENDS):
        return None
    out: dict = {"name": s.targets[0].id, "type": kind, "line": s.lineno}
    # A key's target is its first argument
    if call.args and kind in ("ForeignKey", "OneToOneField", "ManyToManyField", "relationship"):
        out["to"] = ast.literal_eval(call.args[0]) if isinstance(call.args[0], ast.Constant) \
            else ast.unparse(call.args[0])
    said = {k.arg: ast.unparse(k.value) for k in call.keywords if k.arg in OPTIONS}
    return {**out, **({"options": said} if said else {})}


def resolved(m: Module, name: str) -> str:
    """A name as written in `m`, as the dotted name its imports say it is."""
    head, _, rest = name.partition(".")
    full = m.imported.get(head)
    if full:
        return f"{full}.{rest}" if rest else full
    if not name.isidentifier() or hasattr(builtins, name):
        return name
    return f"{m.name}.{name}"
