/** **What is lit as picked**: the host's own pick, and only it. Every node and line reads this for
 *  its picked look, never React Flow's `selected`, which is the canvas's copy for dragging and
 *  resizing and may run a write behind (`sync.ts`). One truth, so the canvas never disagrees with
 *  the tray. What stands for a picked block — a place's box among a definition's uses — is lit
 *  with it. */

import { createContext, useContext } from "react";

/** Whether an id is picked, or stands for what is. */
export const PickedContext = createContext<(id: string) => boolean>(() => false);

/** Whether `id` is picked. */
export function usePicked(id: string): boolean {
  return useContext(PickedContext)(id);
}

/** Which of some ids are picked: a chip's tiles. */
export function usePicks(ids: readonly string[]): string[] {
  const picked = useContext(PickedContext);
  return ids.filter(picked);
}

/** The matcher for a pick: an id picked, or one standing for a picked block. */
export function picked_by(picked: readonly string[],
                          stands_for?: (id: string) => string | null): (id: string) => boolean {
  const set = new Set(picked);
  return (id) => set.has(id) || (!!stands_for && set.has(stands_for(id) ?? ""));
}
