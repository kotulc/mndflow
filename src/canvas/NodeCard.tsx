/** One card on the canvas.
 *
 *  A container shows its child blocks as a grid of chips — only the immediate
 *  children, so nesting past that stays for opening the container itself.
 *  Each chip's fill follows how closely its name relates to the container's,
 *  which makes one that has drifted off topic look ragged rather than reading
 *  as tidy.
 *
 *  Interfaces sit on the frame edge instead, and never in the treemap. The two
 *  are independent: a block with ports is still a block. */

import { memo, useState } from "react";
import { useReactFlow, type NodeProps } from "@xyflow/react";

import { blocksOf, isContainer, isLinked, isProxy, nameOf, portsOf, typeName } from "../graph/fold";
import { CHIP_CAP, GRID, LEAF, pack, sizeOf } from "../geometry/layout";
import { similarity } from "../embed/match";
import type { Graph, Element, Side } from "../graph/types";
import { useEmbeddings } from "../embed/useEmbeddings";
import {
  along, fitTag, seat, Anchor, Berth, LIFTED, Name, Perch, Port, SIDES,
  type CardData, type Grazed, type Seated,
} from "./card";

/** How closely a child's name relates to what holds it.
 *
 *  Lives here rather than with the geometry because it decides a *shade* and
 *  nothing else — a chip that has drifted off topic looks ragged. Keeping it
 *  beside the drawing is what leaves the layout engine free of the embedding
 *  model, and so free of anything slow or asynchronous. */
export function affinity(graph: Graph, child: Element): number {
  const parent = child.parent ? graph.elements[child.parent] : null;
  if (!parent) return 0;

  const own = similarity(child.label, parent.label);
  const bodied = parent.body ? similarity(child.label, parent.body) : 0;

  return Math.max(own, bodied);
}

type ContentsProps = {
  graph: Graph;
  id: string;
  grazed: Grazed;
  onPick: (id: string) => void;
  onOpen: (id: string) => void;
};

/** The contents of a container: one cell per immediate child block, up to
 *  {@link CHIP_CAP}.
 *
 *  The unit is 1|2 (large left, two horizontal on the right), or two wide rows
 *  when there are only two. One group fills the band; two sit as columns; three
 *  tile as left | top-right / bottom-right. At ten or more the bottom-right
 *  cell reads "..." for the rest — click still opens the container.
 *
 *  Names wrap on spaces and shrink to fit; a single long word stays on one
 *  line and ellipsizes rather than vanishing.
 *
 *  Interfaces are never in here; they live on the frame. */
function Contents({ graph, id, grazed, onPick, onOpen }: ContentsProps) {
  const kids = blocksOf(graph, id);
  if (!kids.length) return <span className="hollow">empty</span>;

  // Ten or more: eight named chips and a final "…" in the bottom-right slot.
  const overflow = kids.length >= 10;
  const shown = kids.slice(0, overflow ? CHIP_CAP - 1 : CHIP_CAP);
  const rest = kids.length - shown.length;
  // Worked out in the band's own proportions and then expressed as
  // percentages of it, so the cells follow the card without measuring it. The
  // whole band, which is exactly how much taller a container is than a block —
  // the head takes the rest, which comes to a block's worth.
  const band = { w: LEAF.w, h: GRID };
  const tiles = pack(overflow ? CHIP_CAP : shown.length, band);

  function cellStyle(seat: { x: number; y: number; w: number; h: number }, fill?: string) {
    return {
      left: `calc(${(seat.x / band.w) * 100}% + 1px)`,
      top: `calc(${(seat.y / band.h) * 100}% + 1px)`,
      width: `calc(${(seat.w / band.w) * 100}% - 2px)`,
      height: `calc(${(seat.h / band.h) * 100}% - 2px)`,
      background: fill,
    };
  }

  return (
    // A definite height, not a share of the card's: cells placed absolutely
    // are no content at all, so nothing else would give the band a size. No
    // margin above it — the name is centred in the room it has, which leaves
    // the separation without spending height on it.
    <div className="treemap" style={{ height: band.h }}>
      {shown.map((kid, at) => {
        const seat = tiles[at];
        const label = nameOf(graph, kid);
        const fit = fitTag(seat.w - 2, seat.h - 2, label);

        return (
          <div
            key={kid.id}
            className={[
              "cell", "nodrag", isContainer(graph, kid.id) ? "group" : "object",
              grazed?.kind === "cell" && grazed.id === kid.id ? "grazed" : "",
            ].join(" ")}
            style={cellStyle(seat, `rgba(74, 222, 128, ${0.08 + affinity(graph, kid) * 0.5})`)}
            title={`${label} — drag onto the canvas to lift it out`}
            data-cell={kid.id}
            draggable
            onDragStart={(event) => {
              event.stopPropagation();
              event.dataTransfer.setData(LIFTED, kid.id);
              event.dataTransfer.effectAllowed = "move";
            }}
            onClick={(event) => (event.stopPropagation(), onPick(kid.id))}
            onDoubleClick={(event) => (event.stopPropagation(), onOpen(kid.id))}
          >
            {fit && (
              <span className={`tag${fit.wrap ? "" : " clip"}`} style={{ fontSize: fit.size }}>
                {label}
              </span>
            )}
          </div>
        );
      })}
      {overflow && (() => {
        const seat = tiles[CHIP_CAP - 1];
        const fit = fitTag(seat.w - 2, seat.h - 2, "...");

        return (
          <div
            className={`cell nodrag more ${grazed?.kind === "cell" && grazed.id === id
                                           ? "grazed" : ""}`}
            style={cellStyle(seat)}
            title={`${rest} more — open to see them`}
            data-cell={id}
            onClick={(event) => (event.stopPropagation(), onOpen(id))}
            onDoubleClick={(event) => (event.stopPropagation(), onOpen(id))}
          >
            {fit && (
              <span className={`tag${fit.wrap ? "" : " clip"}`} style={{ fontSize: fit.size }}>
                ...
              </span>
            )}
          </div>
        );
      })()}
    </div>
  );
}

export const NodeCard = memo(({ data, selected, positionAbsoluteX = 0,
                                positionAbsoluteY = 0 }: NodeProps) => {
  const { node, graph, dropping, picked, grazed, showPorts, litSeats, pickedPort, unit } =
    data as unknown as CardData;
  const { onNameTaken, onSay } = data as unknown as CardData;
  const { onPick, onOpen, onSlidePort, onRename } = data as unknown as CardData;
  const { seats, litEdges, onPromote } = data as unknown as CardData;
  // Shading follows affinity, which is only known once vectors exist.
  useEmbeddings();

  const holds = isContainer(graph, node.id);
  const size = sizeOf(graph, node);
  const host = { x: positionAbsoluteX, y: positionAbsoluteY, w: size.w, h: size.h };
  const classes = ["card", holds ? "group" : "object",
                   isProxy(node) ? "reference" : "",
                   selected || picked ? "picked" : "",
                   selected ? "chosen" : "",
                   grazed?.kind === "card" && grazed.id === node.id ? "grazed" : "",
                   dropping ? "dropping" : ""].join(" ");

  return (
    <div className={classes}>
      {/* One anchor per side for relations with no interface of their own —
          derived from the relation itself, so nothing is stored and nothing is
          left behind when it goes. */}
      {(Object.keys(SIDES) as Side[]).map((side) => (
        <Anchor key={side} name={`auto-${side}`} side={side} />
      ))}

      {/* Hidden, an interface still leaves its seat behind, so the relations
          attached to it meet the border where it sits rather than sliding to
          the middle of a side — and the seat shows itself while this card or
          the relationship tied to it is selected. */}
      {portsOf(graph, node.id).map((port) => (showPorts ? (
        <Port
          key={port.id}
          port={port}
          graph={graph}
          host={host}
          picked={pickedPort === port.id}
          grazed={grazed?.kind === "port" && grazed.id === port.id}
          onPick={onPick}
          onOpen={onOpen}
          onSlide={onSlidePort}
        />
      ) : (
        <Berth
          key={port.id}
          port={port}
          graph={graph}
          host={host}
          shown={picked || selected || litSeats.has(port.id)}
        />
      )))}

      {/* And the seats this layer worked out for relationships with no
          interface of their own — most of them. */}
      {seats.map((s) => (
        <Perch
          key={s.edge}
          seated={s.edge}
          side={s.side}
          at={s.at}
          port={s.port}
          lit={litEdges.has(s.edge) || selected || picked}
          onPromote={onPromote}
        />
      ))}

      {/* Edited where it is written, once the card is selected — the second
          click of a rename. A double-click still descends. */}
      <div className={`card-head${
        grazed?.kind === "title" && grazed.id === node.id ? " grazed" : ""}`}>
        <Name
          text={nameOf(graph, node)}
          onRename={(label) => onRename(node.id, label)}
          taken={(name) => onNameTaken(node.parent ?? null, name, node.id)}
          onSay={onSay}
        />
        {/* A subtype where one was set, otherwise what this module calls a
            plain one. Container-ness can ride along here where it cannot ride
            on the name: a chip describes what a card is right now, while a
            name has to stay put when a child is added. */}
        <span className={`kind${node.type ? "" : " plain"}`}>
          {typeName(graph, node.type) || (isContainer(graph, node.id) ? `${unit} group` : unit)}
        </span>
      </div>

      {holds && (
        <Contents graph={graph} id={node.id} grazed={grazed} onPick={onPick} onOpen={onOpen} />
      )}
    </div>
  );
});
