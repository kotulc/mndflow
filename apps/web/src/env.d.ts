/** What the app imports that only Vite resolves. */

/** libavoid's wasm, as the url Vite serves it at. */
declare module "libavoid-wasm?url" {
  const url: string;
  export default url;
}
