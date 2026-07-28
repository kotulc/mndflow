/** Re-render as embeddings arrive.
 *
 *  Scoring reads a synchronous cache that fills asynchronously, so components
 *  need to be told when it has grown. Subscribing here is what turns "0 until
 *  the model is ready" into results that appear the moment they exist. */

import { useSyncExternalStore } from "react";

import { problem, ready, revision, subscribe } from "./core/embed";

export function useEmbeddings(): { ready: boolean; problem: string; revision: number } {
  const stamp = useSyncExternalStore(subscribe, revision, revision);

  return { ready: ready(), problem: problem(), revision: stamp };
}
