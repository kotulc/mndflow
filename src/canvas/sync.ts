/** Carrying React Flow's own state across a rebuild.
 *
 *  The node list is rebuilt from the graph whenever anything it draws from
 *  changes — including what the pointer is over, which is a display concern
 *  that touches every card. Rebuilding hands React Flow a fresh object per
 *  node, and anything the *library* had recorded on the old one is lost unless
 *  it is carried over deliberately.
 *
 *  `measured` is the one that matters and the one that bites, because losing
 *  it fails silently. The library records where a node's handles are at the
 *  moment it measures it, and an edge whose handles it cannot find is not
 *  drawn — no error, no warning, just a missing relationship. It re-measures
 *  from a ResizeObserver, so a node whose element did not actually change size
 *  may never be measured again, and the lines stay gone until something forces
 *  a full remount. */

/** The parts of a React Flow node this is allowed to know about. */
type Held = {
  id: string;
  width?: number;
  height?: number;
  selected?: boolean;
  measured?: { width?: number; height?: number };
  position: { x: number; y: number };
};

/** Rebuild the node list, keeping what belongs to React Flow rather than to
 *  the graph.
 *
 *  `moving` names the nodes a drag is in charge of: React Flow owns their
 *  positions until it lets go, or hovering a drop target would snap them back
 *  to where they started. */
export function restated<T extends Held>(current: T[], built: T[],
                                         moving: Set<string> | null): T[] {
  const held = new Map(current.map((node) => [node.id, node]));

  return built.map((node) => {
    const was = held.get(node.id);
    const at = moving?.has(node.id) ? was?.position : null;

    return {
      ...node,
      selected: was?.selected ?? false,
      // Kept only while the node is still the size it was measured at. A card
      // that has actually resized has to be measured again, or its handles
      // would be remembered where they used to be.
      measured: sized(was, node) ? was?.measured : undefined,
      ...(at ? { position: at } : {}),
    };
  });
}

/** Whether a node is still the size it was, so an old measurement still holds. */
function sized(was: Held | undefined, now: Held): boolean {
  return !!was && was.width === now.width && was.height === now.height;
}
