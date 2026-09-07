/** Every open project's graph — handed down from the page so a reference can
 *  read what it stands for without the fold reaching into the workspace. */

import { createContext, useContext, type ReactNode } from "react";

import type { Graph } from "../graph/types";

const Open = createContext<Record<string, Graph>>({});

export function OpenProvider(
  { open, children }: { open: Record<string, Graph>; children: ReactNode },
) {
  return <Open.Provider value={open}>{children}</Open.Provider>;
}

export function useOpen(): Record<string, Graph> {
  return useContext(Open);
}
