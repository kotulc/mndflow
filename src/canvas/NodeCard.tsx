/** One card on the diagram — the canvas host's copy.
 *
 *  Same drawing as the block view module's card, but names read through
 *  `shownName` so a reference into another open project shows what it
 *  stands for. The module's own card stays single-fold; this is where
 *  `workspace.resolve` is handed down (C.7). */

import { memo, type CSSProperties } from "react";
import type { NodeProps } from "@xyflow/react";

import { blocksOf, fieldsOf, isContainer, isReference, portsOf, typeName } from "../graph/fold";
import { CHIP_CAP, GRID, LEAF, pack, sizeOf } from "../geometry/layout";
import { similarity } from "../embed/match";
import type { Graph, Element, Side } from "../graph/types";
import { useEmbeddings } from "../embed/useEmbeddings";
import { cardOf, outline, type Outline } from "../modules/card";
import { lookOf, ramp } from "../modules/style";
import {
  fitTag, Berth, LIFTED, Name, Perch, Port,
  type CardData, type Grazed,
} from "../modules/view/diagram/pieces";
import { shownName } from "./named";
import { useOpen } from "./open";

import { affinity } from "../modules/view/diagram/NodeCard";

export { affinity };

type ContentsProps = {
  graph: Graph;
  id: string;
  grazed: Grazed;
  onPick: (id: string) => void;
  onOpen: (id: string) => void;
};

function Contents({ graph, id, grazed, onPick, onOpen }: ContentsProps) {
  const open = useOpen();
  const kids = blocksOf(graph, id);
  if (!kids.length) return <span className="hollow">empty</span>;

  const overflow = kids.length >= 10;
  const shown = kids.slice(0, overflow ? CHIP_CAP - 1 : CHIP_CAP);
  const rest = kids.length - shown.length;
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
    <div className="treemap" style={{ height: band.h }}>
      {shown.map((kid, at) => {
        const seat = tiles[at];
        const label = shownName(graph, open, kid);
        const fit = fitTag(seat.w - 2, seat.h - 2, label);

        return (
          <div
            key={kid.id}
            className={[
              "cell", "nodrag", isContainer(graph, kid.id) ? "group" : "object",
              grazed?.kind === "cell" && grazed.id === kid.id ? "grazed" : "",
            ].join(" ")}
            style={cellStyle(seat, `color-mix(in oklch, var(--accent) ${
              Math.round((0.08 + affinity(graph, kid) * 0.5) * 100)}%, transparent)`)}
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

const SHAPE: CSSProperties = {
  position: "absolute", inset: 0, width: "100%", height: "100%",
  pointerEvents: "none", overflow: "visible",
};

function Stroke({ drawn, color }: { drawn: Outline; color: string }) {
  if (drawn.kind === "rect") return null;

  if (drawn.kind === "ellipse") {
    return (
      <svg style={SHAPE} aria-hidden>
        <ellipse
          cx={drawn.cx} cy={drawn.cy} rx={drawn.rx} ry={drawn.ry}
          fill="var(--card-fill)" stroke={color} strokeWidth={1}
        />
      </svg>
    );
  }

  const points = drawn.points.map((p) => `${p.x},${p.y}`).join(" ");
  return (
    <svg style={SHAPE} aria-hidden>
      <polygon points={points} fill="var(--card-fill)" stroke={color} strokeWidth={1} />
    </svg>
  );
}

export const NodeCard = memo(({ data, selected, positionAbsoluteX = 0,
                                positionAbsoluteY = 0 }: NodeProps) => {
  const open = useOpen();
  const { node, graph, dropping, picked, grazed, showPorts, litSeats, pickedPort, unit } =
    data as unknown as CardData;
  const { onNameTaken, onSay } = data as unknown as CardData;
  const { onPick, onOpen, onSlidePort, onSlideAnchor, onRename } = data as unknown as CardData;
  const { seats, litEdges, onPromote } = data as unknown as CardData;
  useEmbeddings();

  const holds = isContainer(graph, node.id);
  const size = sizeOf(graph, node);
  const host = { x: positionAbsoluteX, y: positionAbsoluteY, w: size.w, h: size.h };
  const held = cardOf(graph, node);
  const look = lookOf(graph, node);
  const drawn = outline(held.shape, { w: size.w, h: size.h });
  const ink = look.typed ? ramp(look, "line") : "var(--border)";
  const shaped = held.shape !== "rect";
  const titled = held.label !== "none";
  const chipped = held.layout === "type";
  const shown = held.shows.length
    ? held.shows.map((name) => {
        const field = fieldsOf(graph, node.id).find((f) => f.name === name);
        return { name, value: field?.value ?? "" };
      })
    : [];

  const classes = ["card", holds ? "group" : "object",
                   isReference(node) ? "reference" : "",
                   selected || picked ? "picked" : "",
                   selected ? "chosen" : "",
                   grazed?.kind === "card" && grazed.id === node.id ? "grazed" : "",
                   dropping ? "dropping" : ""].join(" ");

  const boxStyle: CSSProperties = {
    borderColor: shaped ? "transparent" : ink,
    ...(look.typed ? { "--card-weight": `var(--weight-${look.weight})` } : {}),
    ...(shaped ? { background: "transparent" } : {}),
    ...(held.label === "below" ? { flexDirection: "column-reverse" } : {}),
    ...(drawn.kind === "rect" && drawn.round
      ? { borderRadius: drawn.round } : {}),
  };

  const title = titled && (
    <div className={`card-head voice-${look.typed ? look.voice : "normal"}${
      grazed?.kind === "title" && grazed.id === node.id ? "grazed" : ""}`}>
      <Name
        text={shownName(graph, open, node)}
        onRename={(label) => onRename(node.id, label)}
        taken={(name) => onNameTaken(node.parent ?? null, name, node.id)}
        onSay={onSay}
      />
      {chipped && (
        <span className={`kind${node.type ? "" : " plain"}`}>
          {typeName(graph, node.type) || (isContainer(graph, node.id) ? `${unit} group` : unit)}
        </span>
      )}
      {look.icon && held.layout === "icon" && (
        <span className="card-icon" aria-hidden>{look.icon}</span>
      )}
    </div>
  );

  return (
    <div className={classes} style={boxStyle}>
      <Stroke drawn={drawn} color={ink} />

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

      {seats.map((s) => (
        <Perch
          key={`${s.edge}-${s.end}`}
          seated={s.edge}
          end={s.end}
          side={s.side}
          at={s.at}
          port={s.port}
          placed={s.placed}
          show={s.show}
          lit={litEdges.has(s.edge) || selected || picked}
          graph={graph}
          owner={node.id}
          host={host}
          onSlide={onSlideAnchor}
          onPromote={onPromote}
        />
      ))}

      {held.label === "inside" && title}

      {shown.length > 0 && (
        <div style={{
          display: "flex", flexDirection: "column", gap: 2, fontSize: 10,
          color: "var(--muted)", minHeight: 0, overflow: "hidden",
          ...(held.layout === "compartments"
            ? { borderTop: "1px solid var(--border)", marginTop: 2, paddingTop: 2 }
            : {}),
        }}>
          {shown.map((row) => (
            <div key={row.name} style={{ display: "flex", gap: 6, minWidth: 0 }}>
              <span style={{ flex: "none", opacity: 0.7 }}>{row.name}</span>
              {row.value && (
                <span style={{
                  minWidth: 0, overflow: "hidden", textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}>{row.value}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {holds && held.layout !== "shape" && (
        <Contents graph={graph} id={node.id} grazed={grazed} onPick={onPick} onOpen={onOpen} />
      )}

      {held.label === "below" && title}
    </div>
  );
});
