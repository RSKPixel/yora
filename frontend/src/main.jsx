import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { applyRootFontSize, readStoredRootFontSize } from "./config/rootFontSize";
import "bootstrap-icons/font/bootstrap-icons.css";

applyRootFontSize(readStoredRootFontSize());

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
