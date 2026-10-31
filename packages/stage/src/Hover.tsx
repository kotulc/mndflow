/** **The hover card**, one for every form: held over a chip, a box or a tile in a chip on a map,
 *  or a card or a line in a diagram, what it is in full —
 *  where it sits, its name and kind, its description and facts, its card's face, and where it is
 *  used or what it holds (views `hover_of`). It waits a moment before it first shows, then follows
 *  the pointer from one thing to the next at once, until the pointer has been away a while. */

import { useEffect, useMemo, useState, type CSSProperties, type RefObject } from "react";
import type { Graph, Id } from "@mnd/core";
import { CardFace, Facts } from "@mnd/theme";
import { hover_of, type FaceProps } from "@mnd/views";

/** How long the pointer rests before the first card shows, and how long it may be away before the
 *  next one waits again, in milliseconds. */
const WAIT = 350;
const WARM = 400;

/** How wide the card is, the most it is likely to stand, and its gap from the pointer and the
 *  window's edge, in pixels. */
const WIDE = 300;
const TALL = 360;
const GAP = 16;

/** What the pointer rests on, innermost first — a tile, then the chip round it — and where. */
type At = { ids: Id[]; x: number; y: number };

export function Hover({ graph, library, host }: { graph: Graph; library: boolean;
                                                  host: RefObject<HTMLElement> }) {
  const at = useResting(host);
  const key = at?.ids.join("|");
  /** The innermost it can say something of. */
  const read = useMemo(() => {
    for (const id of at?.ids ?? []) {
      const said = hover_of(graph, id, library);
      if (said) return said;
    }
    return null;
  }, [graph, key, library]);
  if (!at || !read) return null;
  /** Beside the pointer, turned back inside the window where it would leave it. */
  const left = Math.max(GAP, Math.min(at.x + GAP, window.innerWidth - WIDE - GAP));
  const top = Math.max(GAP, Math.min(at.y + GAP, window.innerHeight - TALL));
  const face = read.face;
  const scale = face ? Math.min(1, (WIDE - 24) / face.w) : 1;
  return (
    <div className="mnd-hover" style={{ left, top, width: WIDE }} role="tooltip">
      <div className="mnd-hover-head">
        {read.path ? <span className="mnd-hover-path">{read.path}</span> : null}
        <span className="mnd-hover-title">
          <b>{read.label}</b>
          {read.kind ? <span>{read.kind}</span> : null}
          {read.extends ? <span>extends {read.extends}</span> : null}
        </span>
      </div>
      <div className="mnd-hover-body">
        {read.description ? <p className="mnd-hover-about">{read.description}</p> : null}
        <Facts facts={read.facts} named />
        {face ? (
          <div className="mnd-hover-face" style={{ height: face.h * scale }}>
            <div style={{ width: face.w, height: face.h, transform: `scale(${scale})` }}>
              <CardFace {...drawn(face)} />
            </div>
          </div>
        ) : null}
        {read.used ? (
          <section>
            <h4>used in · {read.used.length} {read.used.length === 1 ? "place" : "places"}</h4>
            {read.used.map((p) => (
              <div key={p.id} className="mnd-hover-place" data-family={p.tint["data-family"]}
                   style={(p.tint.style ?? {}) as CSSProperties}>
                <span>{p.label}</span>
                <span className="mnd-hover-names">
                  {p.names.map((n, i) => <span key={`${n}${i}`}>{n}</span>)}
                </span>
              </div>
            ))}
          </section>
        ) : null}
        {read.holds ? (
          <section>
            <h4>holds</h4>
            <span className="mnd-hover-names">
              {read.holds.map((n, i) => <span key={`${n}${i}`}>{n}</span>)}
            </span>
          </section>
        ) : null}
      </div>
    </div>
  );
}

/** A face's props as the theme's card takes them: its size and sampling are the host's. */
function drawn({ w: _w, h: _h, sample: _sample, ...face }: FaceProps) {
  return face;
}

/** **What the pointer rests on in `host`**: a tile in a chip, else a chip or a box — after
 *  `WAIT`, or at once while a card has shown within `WARM`. Crossing what a chip draws inside it
 *  is resting on the chip still; a press or a wheel is work, and the card gives way until the
 *  pointer rests again. */
function useResting(host: RefObject<HTMLElement>): At | null {
  const [at, set_at] = useState<At | null>(null);
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let wait: ReturnType<typeof setTimeout> | undefined;
    let cool: ReturnType<typeof setTimeout> | undefined;
    let warm = false;
    /** What the pointer is over now, shown or waited for. */
    let on: string | null = null;
    const ids_of = (t: EventTarget | null): Id[] => {
      const e = t instanceof Element ? t : null;
      const tile = e?.closest<HTMLElement>("[data-tile]")?.dataset["tile"];
      const node = e?.closest<HTMLElement>(".react-flow__node")?.dataset["id"];
      /** A line, by its stroke or by its name beside it. */
      const line = e?.closest<HTMLElement>("[data-edge]")?.dataset["edge"]
        ?? e?.closest(".react-flow__edge")?.getAttribute("data-id") ?? undefined;
      return [tile, node, line].filter((x): x is Id => !!x);
    };
    const id_of = (t: EventTarget | null) => ids_of(t).join("|") || null;
    const over = (ev: PointerEvent) => {
      const id = id_of(ev.target);
      if (id === on) return;
      clearTimeout(wait);
      on = id;
      if (!id) return;
      clearTimeout(cool);
      const ids = ids_of(ev.target);
      const show = () => { warm = true; set_at({ ids, x: ev.clientX, y: ev.clientY }); };
      if (warm) show(); else wait = setTimeout(show, WAIT);
    };
    const out = (ev: PointerEvent) => {
      if (id_of(ev.relatedTarget) === on) return;
      clearTimeout(wait);
      on = null;
      set_at(null);
      cool = setTimeout(() => { warm = false; }, WARM);
    };
    const away = () => {
      clearTimeout(wait);
      clearTimeout(cool);
      warm = false;
      on = null;
      set_at(null);
    };
    el.addEventListener("pointerover", over);
    el.addEventListener("pointerout", out);
    el.addEventListener("pointerdown", away);
    el.addEventListener("wheel", away, { passive: true });
    return () => {
      clearTimeout(wait);
      clearTimeout(cool);
      el.removeEventListener("pointerover", over);
      el.removeEventListener("pointerout", out);
      el.removeEventListener("pointerdown", away);
      el.removeEventListener("wheel", away);
    };
  }, [host]);
  return at;
}
