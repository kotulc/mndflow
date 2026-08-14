import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { publish } from "./modules";
import { base } from "./modules/base";
import { App } from "./page/App";
import "./styles.css";

// Before anything reads a log. A component publishing later would leave what is
// already in the graph unvalidated, which is the same position as not being in
// the build at all.
publish(base);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
