/** What the app imports that only Vite resolves. */
/// <reference types="vite/client" />

/** libavoid's wasm, as the url Vite serves it at. */
declare module "libavoid-wasm?url" {
  const url: string;
  export default url;
}

/** ELK's worker script, as the url Vite serves it at. */
declare module "elkjs/lib/elk-worker.min.js?url" {
  const url: string;
  export default url;
}
