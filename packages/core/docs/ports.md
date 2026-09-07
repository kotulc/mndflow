# Ports

**The entire host contract.** Declared in core, bound by an app, implemented nowhere else.

| Port | Is | web | cli |
|---|---|---|---|
| `storage` | where the log and the session live between runs | session storage | a file |
| `files` | anything leaving or entering — export, import, a rendered drawing | download / picker | `fs` |
| `net` | fetching something from outside the workspace | `fetch` | `fetch` |
| `score` | text similarity, for ranking | the scorer, lazily | **absent** |

- **Nothing but a port may assume where a project lives.** A direct reach for a browser API from anywhere else is the coupling this package exists to prevent.
- **An unbound port is a capability the app does without**, never a feature reimplemented. With no `score`, ranking falls back to substring and everything else still works.
- **A port is an interface, not a service.** Core declares the shape and calls it; it never constructs one.
- **A new capability is a port or it is a package**, never a direct reach for a browser API from somewhere that is not an app.
- **Ports stay four.** The set is the host contract, and a fifth is a claim that a host has to answer something new — which is nearly always a package instead. **`storage` and `files` are declared and bound; `net` and `score` are neither.**

**Not in v1**: `net`. `score` is bound only if the scorer ships with v1.
