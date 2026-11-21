# apps/py

**Fact tools over a Python project, answered as JSON for `mnd fact`** (docs/tools/). It lists; the calling agent picks; `mnd define` writes the library (design.md *Translation*). Lean on purpose: the standard library's `ast`, `grimp` for the import graph, and a profile hook for real runs.

## Running it

```sh
python -m pip install grimp                    # once, in the Python mnd uses (MND_PYTHON, else python)
npm run start -s -w @mnd/cli -- fact units ../healthchecks --unit hc.api --depth 2
```

`mnd fact` runs it for any project marked by `pyproject.toml`, `setup.py`, `manage.py` or `requirements.txt` without a `package.json`. Every fact names its `source`: file, line, symbol.

## Modules

| Module | Does |
|---|---|
| `source.py` | the project's modules by dotted name (packages only, tests and migrations skipped), parsed once; anchors; docstrings |
| `units.py` | **units**: packages, components (a package holding `apps.py` or `models.py`), modules, public classes and functions, to `--depth` |
| `imports.py` | **imports**: gathered to `--depth` under `--unit`, with the outside packages |
| `classes.py` | **classes**: bases resolved, fields and keys, choices, methods |
| `entries.py` | **entries**: console scripts, `__main__` modules, Django commands, WSGI/ASGI, URL routes followed from `ROOT_URLCONF` |
| `calls.py` | **calls**: static calls from `--from`, resolved through imports; method calls on objects are counted `unresolved`, never guessed — `trace` sees them |
| `trace.py`, `runner.py` | **trace**: `--run "<script> args"` in the project's own interpreter (its `.venv`), each call between project functions in first order, `--depth` gathering the ends |
| `__main__.py` | the command |
