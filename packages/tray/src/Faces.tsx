/** A card as every surface draws it: the large face over the small one, each at its own size,
 *  scaled down only where the column is narrower than the card — or, asked for one, the large
 *  where its look draws one, else the small. What each face shows is views' `face_props`. */

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ports_on, type Graph, type Id } from "@mnd/core";
import { CardFace } from "@mnd/theme";
import { face_props, known_face, type Face } from "@mnd/views";

export type FacesProps = { graph: Graph; id: Id;
                            /** One face: the large where its look draws one, else the small. */
                            one?: boolean;
                            /** A member lit from a list beside it. */
                            lit?: string };

export function Faces({ graph, id, one = false, lit }: FacesProps) {
  return (
    <div className="faces">
      {one ? <One graph={graph} id={id} face={known_face(graph, id)} {...(lit ? { lit } : {})} />
        : <><One graph={graph} id={id} face="large" /><One graph={graph} id={id} face="small" /></>}
    </div>
  );
}

/** **One face, the width of its column**: laid wider where the column has room, its text at its
 *  own size; scaled down only where the column is narrower than the card. */
function One({ graph, id, face, lit }: { graph: Graph; id: Id; face: Face; lit?: string }) {
  const { w, h, sample, ...drawn } = face_props(graph, id, face);
  const [held, scale, room] = useFit(w);
  return (
    <div className="face-room" ref={held} style={{ height: h * scale }}>
      <div className={`face ${face}${sample ? " sample" : ""}`}
           style={{ width: Math.max(w, room), height: h,
                    transform: scale < 1 ? `scale(${scale})` : undefined }}>
        <CardFace {...drawn} {...(lit ? { lit } : {})}>
          <Seats graph={graph} id={id} {...(lit ? { lit } : {})} />
        </CardFace>
      </div>
    </div>
  );
}

/** **Its ports as seats** on its sides, as the canvas seats them: in on the left, out and both
 *  ways on the right, spread evenly down each; one lit from a list beside the card. Their names
 *  are the list's: on the card they would cover its rows. */
function Seats({ graph, id, lit }: { graph: Graph; id: Id; lit?: string }) {
  const ports = (graph.blocks[id] ? ports_on(graph, id) : [])
    .map((p) => ({ name: p.name ?? "", flow: p.flow ?? "both" }));
  const side = (left: boolean) => ports.filter((p) => (p.flow === "in") === left);
  return (
    <>
      {[true, false].flatMap((left) => side(left).map((p, i, all) => (
        <span key={`${p.name}${i}`} title={p.name}
              className={["seat", left ? "in" : "out", p.flow, p.name === lit ? "lit" : ""]
                .filter(Boolean).join(" ")}
              style={{ "--y": `${(100 * (i + 1)) / (all.length + 1)}%` } as CSSProperties} />
      )))}
    </>
  );
}

/** How far a card this wide is scaled to fit the room it is given, never past its own size; and
 *  the room. */
function useFit(w: number): [React.RefObject<HTMLDivElement>, number, number] {
  const held = useRef<HTMLDivElement>(null);
  const [room, set_room] = useState(w);
  useEffect(() => {
    const el = held.current;
    if (!el) return;
    const watch = new ResizeObserver(([entry]) => set_room(entry?.contentRect.width ?? w));
    watch.observe(el);
    return () => watch.disconnect();
  }, [w]);
  return [held, room > 0 ? Math.min(1, room / w) : 1, room];
}
