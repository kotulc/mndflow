import { createRoot } from "react-dom/client";
import { App } from "./App";
import "@mnd/theme/ramp.css";
import "@mnd/theme/base.css";
import "@mnd/render/src/scene.css";
import "@mnd/explorer/src/explorer.css";
import "@mnd/stage/src/stage.css";

createRoot(document.getElementById("root")!).render(<App />);
