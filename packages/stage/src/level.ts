/** **A form's level, from its size on screen** (views `level_at`): re-read only when the level
 *  itself changes, and held while the camera is in flight so rows never churn mid-flight. */

import { createContext, useCallback, useContext, useRef } from "react";
import { useStore } from "@xyflow/react";
import { level_at, type Level } from "@mnd/views";

/** Whether the camera is flying between foci: levels hold until it lands. */
export const FlightContext = createContext(false);

/** **A mark too small to read**: under `least` pixels on screen at the current zoom. Seats and
 *  anchors hide then; a line still meets the wall where they sit. */
export function useTiny(size: number, least = 6): boolean {
  return useStore(useCallback((st) => size * st.transform[2] < least, [size, least]));
}

/** The level a form `w` by `h` in layout units shows at the current zoom. `laid` where its preview
 *  is rows laid at layout size (a large face's table and body), which read whole only inside the
 *  text band; a chip's tiles scale with the drawing instead. */
export function useLevel(w: number, h: number, laid = true): Level {
  const flying = useContext(FlightContext);
  const was = useRef<Level | null>(null);
  const level = useStore(useCallback((st) => {
    const k = st.transform[2];
    return flying && was.current !== null ? was.current : level_at(w * k, h * k, laid ? k : 1, was.current);
  }, [w, h, laid, flying]));
  was.current = level;
  return level;
}
