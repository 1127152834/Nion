import "katex/dist/katex.min.css";
import "../../../frontend/src/styles/globals.css";

import React from "react";
import ReactDOM from "react-dom/client";

import { DesktopRendererApp } from "./renderer-app";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <DesktopRendererApp />
  </React.StrictMode>,
);
