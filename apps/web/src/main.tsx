import { createRoot } from "react-dom/client";
import { App } from "./App";
import { browser_storage } from "./ports";
import "@mnd/theme/ramp.css";
import "@mnd/theme/base.css";
import "@mnd/theme/icons.css";
import "@mnd/theme/card.css";
import "@mnd/stage/src/flow.css";
import "@mnd/stage/src/routes.css";
import "@mnd/stage/src/groups.css";
import "@mnd/explorer/src/explorer.css";
import "@mnd/stage/src/stage.css";
import "@mnd/options/src/options.css";
import "@mnd/tray/src/tray.css";
import "@mnd/tray/src/fields.css";
import "@mnd/tray/src/preview.css";
import "@mnd/terminal/src/terminal.css";

/** The workspace is loaded before the app mounts, so the session reads it at once. */
void browser_storage().then((storage) =>
  createRoot(document.getElementById("root")!).render(<App storage={storage} />));
