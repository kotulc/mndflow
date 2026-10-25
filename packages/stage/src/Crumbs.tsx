/** Breadcrumb trail over the stage / viewer: the way up, then where the layer is, outermost
 *  first. **The trail never wraps or squeezes**: where it runs wider than the canvas, the steps
 *  after the first fold into one `…`, outermost first, so the layer and what holds it stay
 *  readable. */

import { useLayoutEffect, useRef, useState } from "react";
import { Icon } from "@mnd/theme";
import type { Act } from "@mnd/core";
import type { Scene } from "@mnd/views";

export type CrumbsProps = {
  trail: Scene["trail"];
  /** What the trail starts from, ahead of it: a host's section, drawn whole on a click. */
  head?: { label: string; onOpen: () => void } | null;
  /** `open` with an id goes to that layer; `open` alone goes up one. */
  onAct: Act;
};

/** One step as drawn: its words and where a click goes. */
type Step = { id: string; label: string; go: () => void };

export function Crumbs({ trail, head, onAct }: CrumbsProps) {
  const steps: Step[] = [
    ...(head ? [{ id: "@head", label: head.label, go: head.onOpen }] : []),
    ...trail.map((t) => ({ id: t.id, label: t.label, go: () => onAct("open", { id: t.id }) })),
  ];
  const bar = useRef<HTMLElement>(null);
  const key = steps.map((s) => s.id).join("|");
  /** How many steps after the first are folded into the `…`, for the trail it was fitted to: a
   *  new trail starts whole. */
  const [fit, set_fit] = useState({ key, n: 0 });
  const folded = fit.key === key ? fit.n : 0;
  const most = Math.max(0, steps.length - 2);

  // A new width starts whole and folds again.
  useLayoutEffect(() => {
    const el = bar.current;
    if (!el) return;
    const watch = new ResizeObserver(() => set_fit((f) => ({ ...f, n: 0 })));
    watch.observe(el);
    return () => watch.disconnect();
  }, []);
  // One more step folds each pass, before paint, until the trail fits.
  useLayoutEffect(() => {
    const el = bar.current;
    if (el && folded < most && el.scrollWidth > el.clientWidth) set_fit({ key, n: folded + 1 });
  });

  const hidden = steps.slice(1, 1 + folded);
  const shown = folded ? [steps[0]!, null, ...steps.slice(1 + folded)] : steps;

  return (
    <nav ref={bar} className={["crumbs", folded === most && most ? "tight" : ""]
      .filter(Boolean).join(" ")}>
      {trail.length ? <button className="up" title="up one layer"
                              onClick={() => onAct("open")}><Icon name="up" /></button> : null}
      {shown.map((s, i) => (
        <span key={s?.id ?? "@fold"}>
          {i > 0 ? <b> / </b> : null}
          {s ? <button title={s.label} onClick={s.go}>{s.label}</button> : (
            /** The folded steps, named in its tip; a click goes to the innermost of them. */
            <button className="fold" title={hidden.map((h) => h.label).join(" / ")}
                    onClick={hidden.at(-1)?.go}>…</button>
          )}
        </span>
      ))}
    </nav>
  );
}
