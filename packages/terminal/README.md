# @mnd/terminal

**One collapsible strip. Not a chat, and not a command palette.** It reflects context and action as you use the app — you act on the canvas, the terminal says what happened — so it is a mirror as much as an input.

| | |
|---|---|
| **Entry** | `src/index.ts` |
| **Depends on** | `core`, `theme` |
| **Proven by** | its own dev server over a static offered list — driven, naming actions and mutating nothing |

## Where it sits

```
web
└─ terminal   ◀
   └─ core · theme
```

## Running it

```sh
npm run dev -w @mnd/terminal         # its harness, over a static offered list
npm run typecheck -w @mnd/terminal
```

**No suite of its own yet.** The harness is the verification: type a verb or a sigil, and read the action names it logs.

## What is in here

| | Is |
|---|---|
| `Terminal.tsx` | the strip: the prompt, what was said, and the offered list as chips |
| `commands.ts` | the four commands, the verbs and sigils each is reached by, and the match |
| `terminal.css` | the look, collapsed and expanded |

## The detail

`docs/terminal.md` — the four commands, what each asks for, and what is still ahead.
