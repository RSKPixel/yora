import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { applyRootFontSize, ROOT_FONT_SIZE_DEFAULT } from "./config/rootFontSize";
import "bootstrap-icons/font/bootstrap-icons.css";

applyRootFontSize(ROOT_FONT_SIZE_DEFAULT);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
