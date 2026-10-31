/** **A chip, drawn anywhere**: on the map as a node and in the tray as an element's picture —
 *  its card at map scale. Its name's line, the name then quieter its kind, its kind's icon in the
 *  top-right corner; its facts under it; then its body, the first thing it has: a diagram's tiles
 *  laid by its structure, a definition's uses in boxes of their places, else a preview of its
 *  attributes, records, body or description, a definition's places each with its uses, over a bar
 *  of its uses by place. A tile is a small card the same way. Worked out before it is drawn
 *  (views `map.ts`); a chip only draws it, naming no graph. */

import type { CSSProperties } from "react";
import { Facts, type FactsData } from "./facts";
import { Icon, role_icon } from "./icons";

/** A colour alone, as the card table reads it. */
type Tint = { "data-family"?: string; style?: Record<string, string> };

/** One tile in a chip's body: a share of the body from 0 to 1, and what it stands for. */
export type ChipTile = { id: string; label: string; x: number; y: number; w: number; h: number;
                         role?: string; as?: string; odd?: boolean; down?: boolean; mark?: string;
                         texture?: string; tint?: Tint;
                         /** The tile it is nested in, and whether it holds tiles of its own. */
                         in?: string; holds?: boolean;
                         /** What it says under its name as it grows: a facts line, then rows. */
                         facts?: string; rows?: readonly string[] };

/** What a chip draws. */
export type ChipData = {
  label: string; kind?: string; role?: string; tint?: Tint;
  /** Its head's height under the name, or its width beside it where it is upright. */
  head?: number; upright?: boolean; diagram?: boolean;
  facts?: FactsData; tiles?: readonly ChipTile[];
  preview?: { rows?: readonly (readonly string[])[]; lines?: readonly string[];
              places?: readonly { id: string; label: string; n: number; tint: Tint }[] };
  bar?: readonly { n: number; tint: Tint }[];
};

export type ChipFaceProps = { data: ChipData; w: number; h: number; level: number;
                              picked?: boolean;
                              /** Screen pixels per layout unit, as a step of `chip_steps`; unsaid,
                               *  the chip is drawn at its laid size. */
                              scale?: number;
                              /** Tiles lit, as the tray's picture lights the element in its room. */
                              lit?: readonly string[] };

/** **A chip, drawn anywhere**: on the map as a node, and in the tray as its picture. */
export function ChipFace({ data, w: width, h: height, level, picked: selected = false,
                           scale = 1, lit = [] }: ChipFaceProps) {
  const tint = data.tint ?? null;
  const pad = 6;
  const head = data.head ?? 0;
  const body = body_of(data, width, height);
  /** **Each tile shows from its own size on screen**: a nested one where its mark reads and the
   *  tile holding it shows; a name where it fits whole and reads. */
  const seen = new Set<string>();
  const tiles = (data.tiles ?? []).filter((t) => {
    const ok = !t.in || (seen.has(t.in) && scale >= mark_at(t, body));
    if (ok) seen.add(t.id);
    return ok;
  });
  /** A chip too narrow for its name shows its icon alone, but one turned upright. */
  const narrow = !data.upright && (width ?? 0) < NARROW;
  /** Its text's room: above its body where the body shows, else the whole chip. */
  const bodied = level >= 3 && (!!data.tiles?.length || !!data.preview || !!data.bar);
  const band = Math.max(0, (bodied ? head - TEXT.gap : (height ?? 0) - pad) - TEXT.top);
  const name = <span className="mnd-chip-name">{data.label}</span>;
  const kind = data.kind ? <span className="mnd-chip-kind">{data.kind}</span> : null;
  return (
    <div className={["mnd-chip", data.diagram ? "diagram" : "",
                     narrow ? "narrow" : "", data.upright ? "upright" : "",
                     selected ? "picked" : ""].filter(Boolean).join(" ")}
         data-level={level}
         {...(tint ? { "data-family": tint["data-family"] } : {})}
         style={{ ...(tint?.style ?? {}), "--cap": `${Math.max(0, (width ?? 0) - 8)}px`,
                  "--head": `${head}px`, "--band": band } as CSSProperties}>
      {data.upright ? <span className="mnd-chip-head">{name}{kind}</span> : (
        <span className="mnd-chip-text">
          {name}{kind}
          {data.facts ? <><i className="mnd-chip-break" /><Facts facts={data.facts} /></> : null}
        </span>
      )}
      <Icon name={role_icon(data.role)} size={14} className="mnd-chip-icon" />
      {tiles.length ? (
        <span className="mnd-chip-body">
          {tiles.map((t) => {
            /** A plain block wears its kind's icon; a mark its glyph instead; a header strip
             *  its header block's name; what only shapes the chip — a lifeline, a rule — none. */
            const plain = !t.as && !t.mark;
            const heads = t.as === "head" && !!t.label;
            const named = ((!t.as || t.as === "group") && t.mark !== "start" && t.mark !== "end")
              || heads;
            /** What stands for a block is picked as it: a click on it picks its block. */
            const block = !t.as || t.as === "group" || t.as === "band" || heads;
            const [w, h] = [t.w * body.w, t.h * body.h];
            /** Whether it may carry a name; whether the name fits is the tile's own to say. */
            const shown = named && Math.min(w, h) >= NAMED;
            /** As large as an icon may grow in this tile: beside its name, its height less a
             *  margin and a third of its width; alone, never past the tile. */
            const cap = shown ? Math.min(h - 4, w / 3) : Math.min(w, h) - 4;
            const icon = plain && cap >= 5;
            return (
              <span key={t.id} {...(block ? { "data-tile": t.id } : {})}
                    {...(t.tint?.["data-family"] ? { "data-family": t.tint["data-family"] } : {})}
                    className={["mnd-chip-tile", t.as ?? "", plain ? "card" : "",
                                icon ? "iconed" : "", icon && !shown ? "bare" : "",
                                t.odd ? "odd" : "", t.down ? "down" : "",
                                t.as === "head" && h > w ? "tall" : "",
                                heads ? "labeled" : "",
                                t.mark ? `mark ${t.mark}` : "",
                                lit.includes(t.id) ? "lit" : "",
                                t.holds ? "holds" : "", t.in ? "nested" : "",
                                t.texture ?? ""].filter(Boolean).join(" ")}
                    style={{ left: `${t.x * 100}%`, top: `${t.y * 100}%`,
                             width: `${t.w * 100}%`, height: `${t.h * 100}%`,
                             ...(t.tint?.style ?? {}),
                             ...(icon ? { "--cap": `${cap}px` } : {}) } as CSSProperties}>
                {shown
                  ? <span className="mnd-chip-tile-name">{t.label}</span> : null}
                {t.texture ? <span className="mnd-chip-tile-texture" /> : null}
                {shown && (t.facts || t.rows?.length) ? (
                  <span className="mnd-chip-tile-more">
                    {t.facts ? <span className="facts">{t.facts}</span> : null}
                    {t.rows?.map((r, i) => <span key={i}>{r}</span>)}
                  </span>
                ) : null}
                {icon ? <Icon name={role_icon(t.role)} size={9} className="mnd-chip-tile-icon" />
                  : null}
              </span>
            );
          })}
        </span>
      ) : null}
      {!data.tiles?.length && (data.preview || data.bar) && !narrow ? (
        <Profile preview={data.preview} bar={data.bar} room={body.h} />
      ) : null}
    </div>
  );
}

/** **A chip's profile**: as many whole rows as its body holds — its attributes or records, else
 *  its lines, a few where its places follow — then a definition's places, a row each, and under
 *  them, never over them, the bar of its uses by place. */
function Profile({ preview, bar, room }: { preview: ChipData["preview"]; bar: ChipData["bar"];
                                          room: number }) {
  const fits = Math.max(0, Math.floor((room - (bar ? BAR : 0)) / LINE));
  const rows = (preview?.rows ?? []).slice(0, fits);
  const placed = preview?.places ?? [];
  const lines = preview?.lines?.length
    ? Math.max(0, placed.length ? Math.min(LINES, fits - rows.length) : fits - rows.length) : 0;
  const places = placed.slice(0, Math.max(0, fits - rows.length - lines));
  return (
    <>
      <span className="mnd-chip-body mnd-chip-profile" style={{ bottom: bar ? 4 + BAR : 4 }}>
        {rows.length ? (
          <span className="mnd-chip-rows"
                style={{ "--cols": rows[0]?.length ?? 1 } as CSSProperties}>
            {rows.flatMap((row, r) => row.map((c, i) => (
              <span key={`${r}.${i}`} className={i ? "" : "key"}>{c}</span>)))}
          </span>
        ) : null}
        {lines ? (
          <span className="mnd-chip-lines" style={{ WebkitLineClamp: lines }}>
            {preview!.lines!.join("\n")}
          </span>
        ) : null}
        {places.length ? (
          <span className="mnd-chip-places">
            {places.map((p) => (
              <span key={p.id} data-family={p.tint["data-family"]}
                    style={(p.tint.style ?? {}) as CSSProperties}>
                <span>{p.label}</span><b>{p.n}</b>
              </span>
            ))}
          </span>
        ) : null}
      </span>
      {bar ? (
        <span className="mnd-chip-bar">
          {bar.map((b, i) => (
            <i key={i} data-family={b.tint["data-family"]}
               style={{ ...(b.tint.style ?? {}), flexGrow: b.n } as CSSProperties} />
          ))}
        </span>
      ) : null}
    </>
  );
}

/** A profile's line, as `flow.css` draws a row, a line or a place; the bar and the air over it;
 *  and how many lines of prose a definition shows above its places. */
const LINE = 15;
const BAR = 9;
const LINES = 3;

/** How deep a tile is laid before it may carry a name: a line; shallower, its icon alone. Its
 *  name is held at a readable size on screen, so whether it fits there — four letters at least,
 *  cut short after — is the tile's own to say (`flow.css`, a container query). */
const NAMED = 12;

/** How many screen pixels a nested tile's shorter side needs before it shows: its colour edge
 *  and a glimpse of its ground. */
const MARK = 8;

/** A chip's body less its head: under it, or beside it where the chip is upright. */
function body_of(data: ChipData, width: number, height: number): { w: number; h: number } {
  const [pad, head] = [6, data.head ?? 0];
  return { w: (width ?? 0) - (data.upright ? head : pad) - pad,
           h: (height ?? 0) - (data.upright ? pad : head) - pad };
}

/** The scale at which a nested tile's mark reads. */
function mark_at(t: ChipTile, body: { w: number; h: number }): number {
  return MARK / Math.max(1e-6, Math.min(t.w * body.w, t.h * body.h));
}

/** **The scales at which a chip's drawing changes**, smallest first: where each nested tile's
 *  mark reads. A host redraws the chip only as zoom crosses one. */
export function chip_steps(data: ChipData, width: number, height: number): number[] {
  const body = body_of(data, width, height);
  const marks = (data.tiles ?? []).filter((t) => t.in).map((t) => mark_at(t, body));
  return [...new Set(marks)].sort((a, b) => a - b);
}

/** How narrow a chip is before its name gives way to its icon alone. */
const NARROW = 64;

/** **A chip's text**, as `flow.css` lays it (views `ROW`): the air over it, and the gap between
 *  it and the body under it. */
const TEXT = { top: 4, gap: 6 };
