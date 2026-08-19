/** The one sliver of the question loop Z.9 kept: per-domain vocabulary.
 *
 *  `workflows.ts` merges `packages/terms/<name>.yaml` into each domain, and
 *  the explorer needs those words (`Layer` / `Module` / `Dependency`, not the
 *  generic fallback) wherever a project names a domain. Riding the same
 *  `looping` seam the old loop used is the smallest way to reach it without
 *  `project.ts` depending on `terminal/` directly — no question, no turn. */

import { stemOf } from "../graph/types";
import { looping, type LoopCore, type LoopSurface } from "../project";
import { getDomain } from "./workflows";

function useTerms(core: LoopCore): LoopSurface {
  return {
    question: null,
    terms: getDomain(stemOf(core.graph.vocabulary)).terms,
    turn: async () => {},
  };
}

looping(useTerms);
