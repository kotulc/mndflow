/** **A chip, drawn anywhere** (docs/design/chip.md): on the tree view as a node, and in the tray as
 *  an element's picture. **A card's header over a well**: the header cards share (`header.tsx`),
 *  its name grown with its cell; under it, what it holds as a quiet treemap one level deep, each
 *  child named where it has room. **Three kinds of cell by fill and border** — holds parts,
 *  diagram, leaf — and actors round, externals a thin plain border. Worked out before it is drawn
 *  (views `map.ts`); a chip only draws it, naming no graph. */

import type { CSSProperties } from "react";
import type { FactsData } from "./facts";
import { Header } from "./header";
import { Icon, known, role_icon } from "./icons";
import { Swatch, type SwatchAttrs } from "./swatch";

/** A colour alone, as the card table reads it. */
type Tint = { "data-family"?: string; style?: Record<string, string> };

/** **What kind of cell a chip or a well's child is**, by what it holds and what it is. */
export type ChipCell = "holds" | "diagram" | "leaf" | "actor" | "external" | "folder";

/** One child in a chip's well: a share of the well from 0 to 1, and what it stands for. */
export type ChipTile = { id: string; label: string; x: number; y: number; w: number; h: number;
                         cell?: ChipCell; tint?: Tint; grade?: number; size?: number;
                         /** The *+N more* cell, standing for no block. */
                         more?: boolean;
                         /** What sort of thing it is: the icon right of its name, or, a relation
                          *  definition, its swatch. */
                         role?: string; swatch?: SwatchAttrs;
                         /** The icon its definition names, worn over its role's. */
                         icon?: string };

/** What a chip draws. */
export type ChipData = {
  label: string; kind?: string; role?: string; tint?: Tint;
  /** A relation definition's swatch, worn in place of its icon. */
  swatch?: SwatchAttrs;
  /** Its kind of cell, and its name's size in pixels, grown with its cell. */
  cell?: ChipCell; size?: number;
  facts?: FactsData;
  /** Its well: how far down the chip it starts, in pixels, and what it holds. */
  well?: number; tiles?: readonly ChipTile[];
  /** A box of a model's overview, closed here: a click on its toggle opens it. */
  toggle?: "open" | "closed";
  /** Its links in words, at its foot, and the rows they take. */
  links?: string; links_rows?: number;
};

export type ChipFaceProps = { data: ChipData; w: number; h: number;
                              picked?: boolean;
                              /** Children picked, or lit as the element in its room: one look. */
                              lit?: readonly string[] };

/** **A chip**: its header, then its well. **One look at every zoom**: what it shows is decided by
 *  the shape it is laid in, never its size on screen. */
export function ChipFace({ data, w, h, picked = false, lit = [] }: ChipFaceProps) {
  const cell = data.cell ?? "leaf";
  const tint = data.tint ?? null;
  return (
    <div className={["mnd-chip", cell, picked ? "picked" : "", data.links ? "linked" : ""]
           .filter(Boolean).join(" ")}
         {...(tint ? { "data-family": tint["data-family"] } : {})}
         style={{ ...(tint?.style ?? {}), "--name-size": `${data.size ?? 13}px`,
                  "--w": `${w}px`, "--h": `${h}px`,
                  ...(data.links ? { "--links-rows": data.links_rows ?? 1 } : {}) } as CSSProperties}>
      <Header name={<span className="mnd-chip-name">{data.label}</span>}
              {...(data.kind && cell !== "actor" && cell !== "external" ? { kind: data.kind } : {})}
              hued={cell === "diagram"} {...(data.facts ? { facts: data.facts } : {})}
              {...(data.role ? { role: data.role } : {})} holds={cell === "holds"}
              {...(data.swatch ? { swatch: data.swatch } : {})} />
      {data.toggle ? <Toggle open={false} /> : null}
      {data.well !== undefined && data.tiles?.length ? (
        <Well top={data.well} cell={cell} tiles={data.tiles} lit={lit} />
      ) : null}
      {data.links ? <span className="mnd-chip-links" title={data.links}>{data.links}</span>
        : null}
    </div>
  );
}

/** **A chip's well**: a plain recess of its parts, or a diagram's framed in its hue under a
 *  *diagram* tab; each child a quiet cell, named at the size that fits it; what is left out one
 *  plain *+N more* cell that picks the chip itself; each cell wears its role's icon right of its
 *  name, as a header does. */
function Well({ top, cell, tiles, lit }: { top: number; cell: ChipCell;
                                          tiles: readonly ChipTile[]; lit: readonly string[] }) {
  return (
    <span className={`mnd-well ${cell === "diagram" ? "framed" : "recess"}`} style={{ top }}>
      {cell === "diagram" ? <span className="mnd-well-tab">diagram</span> : null}
      <span className="mnd-well-cells">
        {tiles.map((t) => (
          <span key={t.id} {...(t.more ? {} : { "data-tile": t.id })} data-grade={t.grade ?? 0}
                {...(t.tint?.["data-family"] ? { "data-family": t.tint["data-family"] } : {})}
                className={["mnd-well-cell", t.more ? "more" : t.cell ?? "leaf",
                            lit.includes(t.id) ? "picked" : ""]
                  .filter(Boolean).join(" ")}
                style={{ left: `${t.x * 100}%`, top: `${t.y * 100}%`, width: `${t.w * 100}%`,
                         height: `${t.h * 100}%`,
                         ...(t.size ? { "--well-name": `${t.size}px` } : {}),
                         ...(t.tint?.style ?? {}) } as CSSProperties}>
            {t.label ? <span className="mnd-well-name">{t.label}</span> : null}
            {t.label && t.swatch ? <Swatch {...t.swatch} className="mnd-well-icon" />
              : t.label && (t.icon || t.role) ? <Icon className="mnd-well-icon"
                  name={t.icon && known(t.icon) ? t.icon : role_icon(t.role)} />
              : null}
          </span>
        ))}
      </span>
    </span>
  );
}

/** **A map's box**, drawn anywhere: on the map as a node and in the tray as a box's picture — a
 *  hairline rim, **the shared header** over what it holds. A group's is a panel over its members,
 *  rimless, its name alone. */
export function BoxFace({ label, role, icon, facts, panel = false, rank, picked = false,
                          toggle }: {
  label: string; role?: string; icon?: string; facts?: FactsData;
  panel?: boolean; rank?: "major" | "minor"; picked?: boolean; toggle?: "open" | "closed" }) {
  return (
    <div className={["mnd-box", panel ? "panel" : "", rank ?? "", picked ? "picked" : ""]
      .filter(Boolean).join(" ")}>
      <div className="mnd-box-title">
        {toggle ? <Toggle open /> : null}
        {panel ? <span className="mnd-box-name">{label}</span> : (
          <Header name={<span className="mnd-box-name">{label}</span>}
                  {...(facts ? { facts } : {})} {...(role ? { role } : {})}
                  {...(icon ? { icon } : {})} />
        )}
      </div>
    </div>
  );
}

/** **Opening and closing a box** of a model's overview (docs/diagrams/tree.md): a small control
 *  the host answers by the node it sits in (stage `Stage.tsx`, `data-toggle`). */
function Toggle({ open }: { open: boolean }) {
  return (
    <button type="button" className="mnd-toggle" data-toggle={open ? "close" : "open"}
            title={open ? "close this box" : "open this box"}>{open ? "−" : "+"}</button>
  );
}
