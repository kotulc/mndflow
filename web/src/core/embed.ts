/** Sentence embeddings, computed in the browser.
 *
 *  MiniLM runs locally over ONNX — the same vendored weights and the same
 *  mean-pooled, normalised vectors the mdsite project uses. Nothing is
 *  requested from a network at run time.
 *
 *  Embedding is asynchronous but scoring happens during render, so this keeps
 *  a cache: `vector()` answers instantly for anything already embedded and
 *  quietly queues anything that is not. Callers subscribe and re-render as
 *  vectors arrive, which lets the interface fill in rather than block.
 */

import { env, pipeline } from "@xenova/transformers";

const MODEL = "Xenova/all-MiniLM-L6-v2";
/** Texts embedded per batch — enough to be worth a call, small enough to
 *  return between frames. */
const BATCH = 24;

/** Node runs this too, for verification; only the paths differ. */
const SERVER = Boolean((import.meta as any).env?.SSR);

env.localModelPath = SERVER ? "./public/models" : "/models";
env.allowRemoteModels = false;
env.allowLocalModels = true;

// Left alone, the ONNX runtime fetches its wasm from a CDN — which would make
// the offline claim untrue and a flaky network a broken app. Both the weights
// and the runtime are vendored under public/.
if (!SERVER) env.backends.onnx.wasm.wasmPaths = "/ort/";

const cache = new Map<string, Float32Array>();
const queue = new Set<string>();
const listeners = new Set<() => void>();

let extractor: Promise<any> | null = null;
let loaded = false;
let failure = "";
let draining = false;
let stamp = 0;

/** Bumped whenever vectors land, so React can re-read a synchronous cache. */
export function revision(): number {
  return stamp;
}

/** True once the model is usable. */
export function ready(): boolean {
  return loaded;
}

/** Why embedding is unavailable, or "" if all is well. */
export function problem(): string {
  return failure;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  return () => listeners.delete(listener);
}

function announce(): void {
  stamp += 1;
  for (const listener of listeners) listener();
}

function key(text: string): string {
  return text.trim().toLowerCase();
}

/** Why the model would not start.
 *
 *  The weights are stored in Git LFS, so a clone made without it has a short
 *  text pointer where the model should be. That produces a baffling parser
 *  error otherwise, and it is the one setup mistake anybody is likely to make. */
async function diagnose(error: unknown): Promise<string> {
  if (SERVER) return String(error);

  try {
    const url = `/models/${MODEL}/onnx/model_quantized.onnx`;
    const head = await (await fetch(url, { headers: { Range: "bytes=0-63" } })).text();
    if (head.startsWith("version https://git-lfs")) {
      return "model not fetched — run `git lfs pull`";
    }
  } catch {
    // Fall through to the original error, which is more use than this one.
  }

  return String(error);
}

/** Load the model once, on the first text anybody asks about. */
function model(): Promise<any> {
  if (!extractor) {
    extractor = pipeline("feature-extraction", MODEL)
      .then((pipe) => {
        loaded = true;
        announce();

        return pipe;
      })
      .catch(async (error) => {
        failure = await diagnose(error);
        announce();
        throw error;
      });
  }

  return extractor;
}

/** Embed everything waiting, a batch at a time, then tell the listeners. */
async function drain(): Promise<void> {
  if (draining || !queue.size) return;

  draining = true;
  try {
    const pipe = await model();

    while (queue.size) {
      const batch = [...queue].slice(0, BATCH);
      for (const text of batch) queue.delete(text);

      for (const text of batch) {
        if (cache.has(text)) continue;
        const tensor = await pipe(text, { pooling: "mean", normalize: true });
        cache.set(text, Float32Array.from(tensor.data as ArrayLike<number>));
      }

      announce();
    }
  } catch {
    // `failure` is already set; leave the queue drained so we do not spin.
    queue.clear();
  } finally {
    draining = false;
  }
}

/** The vector for a text, or null if it is not embedded yet. Asking is what
 *  schedules it, so a caller need only ask again once notified. */
export function vector(text: string): Float32Array | null {
  const wanted = key(text);
  if (!wanted) return null;

  const hit = cache.get(wanted);
  if (hit) return hit;

  if (!queue.has(wanted)) {
    queue.add(wanted);
    void drain();
  }

  return null;
}

/** Ask for a batch up front — the templates at startup, node labels as the
 *  graph grows — so the first thing the user does is not also the first thing
 *  that waits. */
export function warm(texts: string[]): void {
  let added = false;

  for (const text of texts) {
    const wanted = key(text);
    if (!wanted || cache.has(wanted) || queue.has(wanted)) continue;

    queue.add(wanted);
    added = true;
  }

  if (added) void drain();
}

/** Embed now and resolve when done — for the one place that cannot wait for a
 *  re-render, namely acting on what the user just submitted. */
export async function ensure(texts: string[]): Promise<void> {
  warm(texts);

  const pipe = await model();
  for (const text of texts) {
    const wanted = key(text);
    if (!wanted || cache.has(wanted)) continue;

    const tensor = await pipe(wanted, { pooling: "mean", normalize: true });
    cache.set(wanted, Float32Array.from(tensor.data as ArrayLike<number>));
    queue.delete(wanted);
  }

  announce();
}

/** Cosine similarity. Vectors arrive normalised, so this is a dot product. */
export function cosine(a: Float32Array, b: Float32Array): number {
  let total = 0;
  for (let i = 0; i < a.length && i < b.length; i += 1) total += a[i] * b[i];

  return total;
}
