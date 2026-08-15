/** Asking: where a gesture puts a question before anything is made.
 *
 *  One strip for names, notes, relation kinds and whatever the app has to say.
 *  Every view module that can create needs it; it is not page chrome, since it
 *  sits over the stage. */

import { relationNames, typeName } from "../../../graph/fold";
import { LEAF } from "../../../geometry/layout";
import type { EdgeForm, End, Graph } from "../../../graph/types";

/** What the floating input is asking for. One prompt, several errands. */
export type Prompt =
  | { kind: "node"; x: number; y: number }
  | { kind: "note"; x: number; y: number; w: number; h: number }
  | { kind: "sprout"; x: number; y: number; end: End }
  | { kind: "relation"; id: string }
  | { kind: "rename"; id: string };

/** One thing the strip can do about what it said — unlock, fork, discard. */
export type Act = { label: string; run: () => void };

export type Said = { text: string; act?: Act; acts?: Act[] };

export type AskProps = {
  graph: Graph;
  view: string | null;
  prompt: Prompt | null;
  clash: boolean;
  said: Said | null;
  form: EdgeForm;
  onHeard: () => void;
  setPrompt: (prompt: Prompt | null) => void;
  setClash: (clash: boolean) => void;
  onNameTaken: (parent: string | null, label: string, except: string | null) => boolean;
  onRename: (id: string, label: string) => void;
  onRelation: (id: string, relation: string) => void;
  onUnlink: (id: string) => void;
  onSprout: (a: End, label: string, x: number, y: number, form: EdgeForm) => void;
  onNote: (text: string, x: number, y: number, w: number, h: number) => void;
  onCreateAt: (label: string, x: number, y: number, groups: string[]) => void;
  /** Which boundaries a point falls inside — same test a drop uses. */
  enclosing: (mover: string, mid: { x: number; y: number }, moving: Set<string>) => string[];
};

/** Acts to show: an explicit list, or the single `act` still used for discard. */
function actsOf(said: Said): Act[] {
  return said.acts ?? (said.act ? [said.act] : []);
}

/** The floating strip: a message, or a name being asked for. */
export function Ask({
  graph, view, prompt, clash, said, form,
  onHeard, setPrompt, setClash, onNameTaken, onRename, onRelation, onUnlink,
  onSprout, onNote, onCreateAt, enclosing,
}: AskProps) {
  return (
    <>
      {/* Whatever the app has to say, in the same place it asks for a name.
          One strip for everything means never wondering where a message went. */}
      {said && (
        <div className="floating saying">
          <span className="caret">!</span>
          <span className="what">{said.text}</span>
          {actsOf(said).map((act) => (
            <button
              key={act.label}
              className="act"
              onClick={() => (act.run(), onHeard())}
            >
              {act.label}
            </button>
          ))}
          <button onClick={onHeard} title="Dismiss">✕</button>
        </div>
      )}

      {prompt?.kind === "relation" && (
        <div className="floating">
          <span className="caret">&gt;</span>
          <input
            autoFocus
            defaultValue={typeName(graph, graph.edges[prompt.id]?.type ?? "")}
            placeholder="what is this relation?"
            list="relation-kinds"
            onKeyDown={(event) => {
              if (event.key === "Enter") onRelation(prompt.id, event.currentTarget.value);
              if (event.key === "Enter" || event.key === "Escape") setPrompt(null);
            }}
          />
          <datalist id="relation-kinds">
            {relationNames(graph).map((name) => <option key={name} value={name} />)}
          </datalist>
          <button onClick={() => (onUnlink(prompt.id), setPrompt(null))} title="Remove it">
            ✕
          </button>
        </div>
      )}

      {prompt?.kind === "rename" && (
        <div className="floating">
          <span className="caret">✎</span>
          <input
            autoFocus
            className={clash ? "clash" : undefined}
            defaultValue={graph.elements[prompt.id]?.label ?? ""}
            placeholder="rename it"
            onBlur={() => (setPrompt(null), setClash(false))}
            onChange={(event) => setClash(onNameTaken(
              graph.elements[prompt.id]?.parent ?? null, event.target.value, prompt.id))}
            onKeyDown={(event) => {
              const taken = onNameTaken(graph.elements[prompt.id]?.parent ?? null,
                                        event.currentTarget.value, prompt.id);
              if (event.key === "Enter" && taken) return setClash(true);
              if (event.key === "Enter") onRename(prompt.id, event.currentTarget.value);
              if (event.key === "Enter" || event.key === "Escape") {
                setPrompt(null);
                setClash(false);
              }
            }}
          />
          {clash && <span className="clash-why">name already here</span>}
        </div>
      )}

      {(prompt?.kind === "node" || prompt?.kind === "sprout" || prompt?.kind === "note") && (
        <div className="floating">
          <span className="caret">+</span>
          <input
            autoFocus
            className={clash ? "clash" : undefined}
            placeholder={prompt.kind === "sprout" ? "name the thing it connects to"
              : prompt.kind === "note" ? "what does it say?"
              : "name it"}
            onBlur={() => (setPrompt(null), setClash(false))}
            // A note is its text and shares nothing with its neighbours; only
            // the two that make a block have a name to keep clear of.
            onChange={(event) => setClash(prompt.kind !== "note" &&
              onNameTaken(view, event.target.value, null))}
            onKeyDown={(event) => {
              const text = event.currentTarget.value.trim();
              if (event.key === "Enter" && text && prompt.kind !== "note" &&
                  onNameTaken(view, text, null)) {
                return setClash(true);
              }
              if (event.key === "Enter" && text) {
                if (prompt.kind === "sprout") {
                  onSprout(prompt.end, text, prompt.x, prompt.y, form);
                } else if (prompt.kind === "note") {
                  onNote(text, prompt.x, prompt.y, prompt.w, prompt.h);
                } else {
                  // Made in the clear space inside a boundary, it joins that
                  // group — the same test a card dropped there passes.
                  const mid = { x: prompt.x + LEAF.w / 2, y: prompt.y + LEAF.h / 2 };
                  onCreateAt(text, prompt.x, prompt.y, enclosing("", mid, new Set()));
                }
              }
              if (event.key === "Enter" || event.key === "Escape") setPrompt(null);
            }}
          />
        </div>
      )}
    </>
  );
}
