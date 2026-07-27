/** A brief "working" state whenever a value changes.
 *
 *  Scoring is synchronous, so there is nothing to wait for — but options
 *  appearing and vanishing under the cursor is disorienting without a beat to
 *  mark it. This reports that the set just changed, which is a real signal
 *  rather than a decorative spinner. */

import { useEffect, useRef, useState } from "react";

const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const TICK = 70;

export function useSettling(key: string, ms = 380): { settling: boolean; frame: string } {
  const [settling, setSettling] = useState(false);
  const [tick, setTick] = useState(0);
  const first = useRef(true);

  useEffect(() => {
    // The opening render is not a change; nothing has moved yet.
    if (first.current) {
      first.current = false;

      return;
    }

    setSettling(true);
    const done = setTimeout(() => setSettling(false), ms);

    return () => clearTimeout(done);
  }, [key, ms]);

  useEffect(() => {
    if (!settling) return;

    const spin = setInterval(() => setTick((n) => n + 1), TICK);

    return () => clearInterval(spin);
  }, [settling]);

  return { settling, frame: FRAMES[tick % FRAMES.length] };
}
