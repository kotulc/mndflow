/** The overview's picture: what helps most at a glance, by what is picked. A block or a room of
 *  the model, what it connects to — the lines coming in on the left, those going out on the
 *  right, each named. A definition, its registry; a library folder or a package, what it files;
 *  a note, its words. Fitted whole to the tray, never cropped. */

import { is_folder, is_note, is_tie, on_side, owner_of, path, shown_name,
         type Graph, type Id } from "@mnd/core";
import { filed_map, registry_map, type MapTile } from "@mnd/views";

/** The picture's own units: fitted to the tray by its view box. */
const W = 400;
const H = 210;

/** The most neighbours a side lists before it counts the rest. */
const MOST = 5;

export function Picture({ graph, id }: { graph: Graph; id: Id }) {
  const b = graph.blocks[id];
  if (!b) return null;
  if (is_note(graph, id)) return <p className="pic-words">{b.body?.trim() || shown_name(graph, id)}</p>;
  if (b.def) return <Registry graph={graph} id={id} />;
  if (b.parent === null || (is_folder(graph, id) && on_side(graph, id, "domain"))) {
    return <Map tiles={filed_map(graph, id, W, H)} w={W} h={H} empty="nothing filed yet" />;
  }
  return <Ego graph={graph} id={id} />;
}

/** A definition's registry: its uses in the rooms they live in. */
function Registry({ graph, id }: { graph: Graph; id: Id }) {
  return <Map tiles={registry_map(graph, id, W, H)} w={W} h={H} empty="no uses yet" />;
}

/** Tiles fitted whole: boxes under their names, tiles named where the name fits. */
function Map({ tiles, w, h, empty }: { tiles: readonly MapTile[]; w: number; h: number;
                                       empty: string }) {
  if (!tiles.length) return <p className="faint pic-none">{empty}</p>;
  return (
    <svg className="pic" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet">
      {tiles.map((t) => (
        <g key={t.id} className={`pic-${t.kind}`}>
          <title>{t.label}</title>
          <rect x={t.x} y={t.y} width={t.w} height={t.h} rx={2} />
          {t.label.length * 5.6 + 6 <= t.w && t.h >= 13
            ? <text x={t.x + 4} y={t.y + 11}>{t.label}</text> : null}
        </g>
      ))}
    </svg>
  );
}

/** One neighbour: what lies at the far end, and the names of the lines to it. */
type Peer = { id: Id; n: number; names: string[] };

/** **What it connects to**: what feeds it on the left, what it reaches on the right, each line
 *  named. A room's lines are those crossing its walls; a note's ties are left out. */
function Ego({ graph, id }: { graph: Graph; id: Id }) {
  const inside = (x: Id) => path(graph, x).some((p) => p.id === id);
  const ins = new globalThis.Map<Id, Peer>(), outs = new globalThis.Map<Id, Peer>();
  for (const e of Object.values(graph.edges)) {
    if (is_tie(graph, e.id) || !graph.blocks[e.from] || !graph.blocks[e.to]) continue;
    const [a, z] = [inside(e.from), inside(e.to)];
    if (a === z) continue;
    const side = a ? outs : ins;
    const far = owner_of(graph, a ? e.to : e.from);
    const p = side.get(far) ?? { id: far, n: 0, names: [] };
    p.n++;
    if (e.name) p.names.push(e.name);
    side.set(far, p);
  }
  const me = { w: 124, h: 44 };
  const at = { x: W / 2 - me.w / 2, y: H / 2 - me.h / 2 };
  const column = (list: readonly Peer[], x: number, left: boolean) => {
    const shown = list.slice(0, MOST);
    const gap = Math.min(40, (H - 10) / Math.max(shown.length, 1));
    return shown.map((p, i) => {
      const y = H / 2 + (i - (shown.length - 1) / 2) * gap;
      const [x1, x2] = left ? [x + 100, at.x] : [at.x + me.w, x];
      const mid = (x1 + x2) / 2;
      const tag = p.names.length ? p.names.join(", ") : p.n > 1 ? `${p.n} lines` : "";
      return (
        <g key={p.id}>
          <title>{`${shown_name(graph, p.id)}${tag ? ` · ${tag}` : ""}`}</title>
          <path className="pic-wire" d={`M${x1},${y} C${mid},${y} ${mid},${H / 2} ${x2},${H / 2}`}
                markerEnd="url(#mnd-head-arrow)" />
          <rect className="pic-peer" x={x} y={y - 14} width={100} height={28} rx={3} />
          <text className="pic-peer-name" x={x + 8} y={y + 4}>{cut(shown_name(graph, p.id), 13)}</text>
          {tag ? <text className="pic-tag" x={mid} y={(y + H / 2) / 2 - 3}
                       textAnchor="middle">{cut(tag, 14)}</text> : null}
        </g>
      );
    });
  };
  const [left, right] = [[...ins.values()], [...outs.values()]];
  return (
    <svg className="pic ego" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
      {column(left, 6, true)}
      {column(right, W - 106, false)}
      <rect className="pic-me" x={at.x} y={at.y} width={me.w} height={me.h} rx={4} />
      <text className="pic-me-name" x={W / 2} y={H / 2 + 4} textAnchor="middle">
        {cut(shown_name(graph, id), 15)}
      </text>
      {left.length > MOST
        ? <text className="pic-more" x={6} y={H - 4}>+{left.length - MOST}</text> : null}
      {right.length > MOST
        ? <text className="pic-more" x={W - 6} y={H - 4} textAnchor="end">+{right.length - MOST}</text>
        : null}
      {!left.length && !right.length
        ? <text className="pic-more" x={W / 2} y={at.y + me.h + 24} textAnchor="middle">
            no lines in or out</text> : null}
    </svg>
  );
}

/** A name cut to `chars`, an ellipsis saying so; the whole name is the tooltip's. */
function cut(s: string, chars: number): string {
  return s.length <= chars ? s : `${s.slice(0, chars - 1)}…`;
}
