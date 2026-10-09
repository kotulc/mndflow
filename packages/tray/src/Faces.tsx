/** A card as every surface draws it: the large face over the small one, each at its own size,
 *  scaled down only where the column is narrower than the card. A large face that shows nothing
 *  yet previews what it could — its attributes and body, else sample content — at the size that
 *  fits, so its look can be judged. */

import { useEffect, useRef, useState } from "react";
import { alias_name, alias_of, base_of, def_at, next_alias, type Graph, type Id } from "@mnd/core";
import { CardFace } from "@mnd/theme";
import { carried, face_attrs, face_text, fitted, size_of, PLAIN, type Face,
         type Look } from "@mnd/views";

export type FacesProps = { graph: Graph; id: Id };

/** What a large face previews where it shows nothing yet: its attributes, then its body. */
const PARTS: Look["shows"] = ["attributes", "body"];

/** What a large face says where its card says nothing yet. */
const SAMPLE = "Sample content: what a card **says**, rendered as markdown.\n\n"
  + "- a point\n- another point";

export function Faces({ graph, id }: FacesProps) {
  return (
    <div className="faces">
      <One graph={graph} id={id} face="large" />
      <One graph={graph} id={id} face="small" />
    </div>
  );
}

/** One face, as the canvas draws it, but for its handle and a large face's preview. */
function One({ graph, id, face }: FacesProps & { face: Face }) {
  const data = carried(graph, id, face);
  const look = data.look ?? PLAIN;
  /** A large face showing nothing previews what it could, at the size that fits it. */
  const bare = face === "large" && !look.size && !look.shows.length;
  const text = bare ? face_text(graph, id, { ...look, shows: PARTS }) || SAMPLE : data.text;
  const alias = look.alias === false ? "" : handle(graph, id);
  const { w, h } = bare ? fitted(data.label, text ?? "", !!alias) : size_of(graph, id, face);
  const [held, scale] = useFit(w);
  return (
    <div className="face-room" ref={held} style={{ height: h * scale }}>
      <div className={`face ${face}${bare ? " sample" : ""}`}
           style={{ width: w, height: h, transform: scale < 1 ? `scale(${scale})` : undefined }}>
        <CardFace label={data.label} {...(alias ? { alias } : {})}
                  kind={look.kind} kinded={look.label} {...(data.role ? { role: data.role } : {})}
                  {...(look.icon ? { icon: look.icon } : {})}
                  holds={data.marks.includes("container")}
                  {...(data.stamps ? { stamps: data.stamps } : {})}
                  classes={data.marks} dress={face_attrs(look)}
                  {...(text !== undefined ? { text } : {})}
                  head={look.head !== false} />
      </div>
    </div>
  );
}

/** The handle a card wears top left: a usage's own, or the one a definition's next usage takes. */
function handle(graph: Graph, id: Id): string {
  if (!def_at(graph, id)) return alias_of(graph, id, true);
  const kind = base_of(graph, id);
  return alias_name(kind, next_alias(graph, kind));
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
