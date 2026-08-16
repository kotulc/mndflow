/** The question loop, attached to the project seam.
 *
 *  Project holds state and dispatch and knows nothing about a question. This
 *  module registers the loop so the rail can ride the same hook the page
 *  already calls — and so a build without the rail leaves project alone. */

import { useCallback, useEffect, useMemo, useState } from "react";

import * as embed from "../embed/model";
import { step as makeStep } from "../graph/types";
import { looping, type LoopCore, type LoopSurface } from "../project";
import * as router from "./router";
import { answer, pendingQuestion, type Pending } from "./turn";
import { getDomain } from "./workflows";

/** Consecutive turns on one operation before the loop moves on. */
const RHYTHM = 2;

function useQuestionLoop(core: LoopCore): LoopSurface {
  const { graph, scope, applied, last, commit, bound, cleared } = core;
  const [pending, setPending] = useState<Pending | null>(null);

  // Project switch, undo, redo, reset and import all bump `cleared` (or change
  // `bound`) so a half-built relation does not survive across those moments.
  useEffect(() => {
    setPending(null);
  }, [bound, cleared]);

  // Warm the catalogue once, so the first thing typed is not also the first
  // thing that waits on the model.
  useEffect(() => {
    embed.warm(router.templatePhrases());
  }, []);

  const terms = getDomain(graph.vocabulary).terms;

  /** Questions the last few turns answered — what gives the loop its rhythm. */
  const recent = useMemo(
    () => applied.filter((s) => s.question).slice(-RHYTHM).map((s) => s.question).reverse(),
    [applied],
  );

  const question = useMemo(() => {
    if (pending) return pendingQuestion(graph, pending);

    const next = router.question(graph, scope, recent);
    // Say so when a turn changed nothing; re-asking unaltered reads as though
    // the answer never arrived.
    if (next && last?.question && !last.mutations.length) {
      return { ...next, hint: `Nothing came of that. ${next.hint}`.trim() };
    }

    return next;
  }, [graph, scope, recent, pending, last]);

  const turn = useCallback(
    async (said: string) => {
      // Routing the opening answer needs its vector now, not on a later
      // render — it decides the domain the whole project runs under.
      if (question?.id === router.ENTRY) await embed.ensure([said]);

      const outcome = answer(graph, question, said, scope, pending, terms);
      setPending(outcome.pending);
      commit(makeStep(said.trim(), outcome.action, outcome.mutations,
                      question?.id ?? "", question?.prompt ?? ""));
    },
    [graph, question, scope, pending, terms, commit],
  );

  return { question, terms, turn };
}

looping(useQuestionLoop);
