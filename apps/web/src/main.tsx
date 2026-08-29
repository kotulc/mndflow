import { createRoot } from "react-dom/client";
import { App } from "./App";
import "@mnd/theme/ramp.css";
import "@mnd/theme/base.css";
import "@mnd/theme/icons.css";
import "@mnd/render/src/scene.css";
import "@mnd/explorer/src/explorer.css";
import "@mnd/stage/src/stage.css";
import "@mnd/options/src/options.css";
import "@mnd/tray/src/tray.css";
import "@mnd/terminal/src/terminal.css";

createRoot(document.getElementById("root")!).render(<App />);
