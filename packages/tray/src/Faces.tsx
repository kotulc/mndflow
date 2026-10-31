/** A card as every surface draws it: the large face over the small one, each at its own size,
 *  scaled down only where the column is narrower than the card — or, asked for one, the large
 *  where its look draws one, else the small. What each face shows is views' `face_props`. */

import { useEffect, useRef, useState } from "react";
import type { Graph, Id } from "@mnd/core";
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

/** One face, scaled to the room it is given. */
function One({ graph, id, face, lit }: { graph: Graph; id: Id; face: Face; lit?: string }) {
  const { w, h, sample, ...drawn } = face_props(graph, id, face);
  const [held, scale] = useFit(w);
  return (
    <div className="face-room" ref={held} style={{ height: h * scale }}>
      <div className={`face ${face}${sample ? " sample" : ""}`}
           style={{ width: w, height: h, transform: scale < 1 ? `scale(${scale})` : undefined }}>
        <CardFace {...drawn} {...(lit ? { lit } : {})} />
      </div>
    </div>
  );
}

/** How far a card this wide is scaled to fit the room it is given: never past its own size. */
function useFit(w: number): [React.RefObject<HTMLDivElement>, number] {
  const held = useRef<HTMLDivElement>(null);
  const [room, set_room] = useState(w);
  useEffect(() => {
    const el = held.current;
    if (!el) return;
    const watch = new ResizeObserver(([entry]) => set_room(entry?.contentRect.width ?? w));
    watch.observe(el);
    return () => watch.disconnect();
  }, [w]);
  return [held, room > 0 ? Math.min(1, room / w) : 1];
}
