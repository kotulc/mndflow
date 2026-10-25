import { createRoot } from "react-dom/client";
import { boot_of, type Boot } from "@mnd/core";
import { App } from "./App";
import ELK from "elkjs/lib/elk-api.js";
import elk_worker from "elkjs/lib/elk-worker.min.js?url";
import { load_avoid, set_elk } from "@mnd/views";
import wasm from "libavoid-wasm?url";
import { browser_storage } from "./ports";
import "@mnd/theme/ramp.css";
import "@mnd/theme/base.css";
import "@mnd/theme/icons.css";
import "@mnd/theme/card.css";
import "@mnd/theme/face.css";
import "@mnd/stage/src/flow.css";
import "@mnd/stage/src/routes.css";
import "@mnd/stage/src/groups.css";
import "@mnd/explorer/src/explorer.css";
import "@mnd/stage/src/stage.css";
import "@mnd/options/src/options.css";
import "@mnd/tray/src/tray.css";
import "@mnd/tray/src/fields.css";
import "@mnd/tray/src/preview.css";

/** Placement runs in its own worker, so a large model never stalls the page. */
set_elk(new ELK({ workerUrl: elk_worker }));

/** The workspace and the router are loaded before the app mounts, so the session reads it at once
 *  and lines route round cards from the first draw. Storage empty opens the bootstrap's workspace. */
void Promise.all([browser_storage(), load_avoid(wasm), fetch("/mndflow.yaml")
  .then((r) => r.ok ? r.text() : "")]).then(async ([storage, , yaml]) => {
  const boot: Boot = boot_of(yaml);
  const opening = storage.read() || !boot.workspace ? undefined : await fetch(boot.workspace)
    .then((r) => r.ok ? r.text() : undefined);
  createRoot(document.getElementById("root")!).render(
    <App storage={storage} boot={boot} opening={opening} />);
});
