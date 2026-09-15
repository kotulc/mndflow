/** The `score` port, bound to sentence embeddings computed in the browser. */

import type { Score } from "@mnd/core";

const MODEL = "Xenova/all-MiniLM-L6-v2";
/** Texts embedded per batch — enough to be worth a call, small enough to return between frames. */
const BATCH = 24;

/** Below this two things are unrelated rather than faintly related. */
const FLOOR = 0.24;

const cache = new Map<string, Float32Array>();
const queue = new Set<string>();
const listeners = new Set<() => void>();

let pipe: Promise<Extract> | null = null;
let draining = false;
let failed = false;

type Extract = (text: string, how: { pooling: "mean"; normalize: boolean })
  => Promise<{ data: ArrayLike<number> }>;

const key = (text: string) => text.trim().toLowerCase();

function announce(): void {
  for (const listen of listeners) listen();
}

/** Load the library and the weights once, on the first text anybody asks about. */
function model(): Promise<Extract> {
  pipe ??= (async () => {
    const { env, pipeline } = await import("@xenova/transformers");
    env.localModelPath = "/models";
    env.allowRemoteModels = false;
    env.allowLocalModels = true;
    /** The runtime's wasm is served locally, not from a CDN. */
    env.backends.onnx.wasm.wasmPaths = "/ort/";
    return await pipeline("feature-extraction", MODEL) as unknown as Extract;
  })();
  return pipe;
}

/** Embed everything waiting, a batch at a time, then tell the listeners. */
async function drain(): Promise<void> {
  if (draining || !queue.size) return;
  draining = true;
  try {
    const extract = await model();
    while (queue.size) {
      const batch = [...queue].slice(0, BATCH);
      for (const text of batch) queue.delete(text);
      for (const text of batch) {
        if (cache.has(text)) continue;
        const out = await extract(text, { pooling: "mean", normalize: true });
        cache.set(text, Float32Array.from(out.data));
      }
      announce();
    }
  } catch (why) {
    /** Without a scorer, ranking falls back to substring. */
    if (!failed) console.warn("mnd: no scorer, ranking falls back to substring —", why);
    failed = true;
    queue.clear();
  } finally {
    draining = false;
  }
}

/** The vector for a text, or null when it is not embedded yet. */
function vector(text: string): Float32Array | null {
  const want = key(text);
  if (!want) return null;
  const hit = cache.get(want);
  if (hit) return hit;
  if (!queue.has(want)) {
    queue.add(want);
    void drain();
  }
  return null;
}

/** Vectors arrive normalised, so cosine is a dot product. */
function cosine(a: Float32Array, b: Float32Array): number {
  let total = 0;
  for (let i = 0; i < a.length && i < b.length; i++) total += a[i]! * b[i]!;
  return total;
}

function similarity(left: string, right: string): number {
  const a = vector(left);
  const b = vector(right);
  return a && b ? Math.max(0, cosine(a, b)) : 0;
}

export function browser_score(): Score {
  return {
    rank: (text, against) => against.map((option) => similarity(text, option)),

    nearest(text, against) {
      let best = -1;
      let top = -1;
      against.forEach((option, at) => {
        const got = similarity(text, option);
        if (got > top) { top = got; best = at; }
      });
      return top >= FLOOR ? best : null;
    },

    warm(texts) {
      let added = false;
      for (const text of texts) {
        const want = key(text);
        if (!want || cache.has(want) || queue.has(want)) continue;
        queue.add(want);
        added = true;
      }
      if (added) void drain();
    },

    watch(fn) {
      listeners.add(fn);
      return () => { listeners.delete(fn); };
    },
  };
}
