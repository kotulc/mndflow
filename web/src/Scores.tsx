/** Template scoring, shown as it happens.
 *
 *  Matching is the part of this app most in need of tuning, and tuning what
 *  you cannot see is guesswork. Every domain is listed with its score against
 *  whatever is being typed, so a bad route is visible as a near miss rather
 *  than as an inexplicable result. */

import { useMemo } from "react";

import { scoreTemplates } from "./core/router";
import { chipFor } from "./core/workflows";
import { useEmbeddings } from "./useEmbeddings";

type Props = {
  /** What is being scored — the live draft, or the last thing answered. */
  text: string;
  /** The domain actually in force, once one has been chosen. */
  active: string;
};

export function Scores({ text, active }: Props) {
  // Vectors arrive after the text is typed, so the revision has to be a
  // dependency — otherwise the first, empty scoring is the one that sticks.
  const { revision, ready } = useEmbeddings();
  const scores = useMemo(() => scoreTemplates(text), [text, revision]);
  const top = scores[0]?.score ?? 0;

  return (
    <section className="scores">
      <div className="log-bar">
        <span>Matching</span>
        <span className="subject">
          {!ready ? "loading model…" : text ? `"${text}"` : "nothing typed"}
        </span>
      </div>

      <div className="log-lines">
        {scores.map((hit) => (
          <div
            key={hit.id}
            className={`score ${hit.id === active ? "active" : ""} ${
              hit.id === scores[0]?.id && hit.score > 0 ? "lead" : ""
            }`}
          >
            <span className="name">{chipFor(hit.id)}</span>
            <span className="bar">
              <i style={{ width: `${top ? (hit.score / top) * 100 : 0}%` }} />
            </span>
            <span className="value">{hit.score.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
