import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const root = document.getElementById("root");
if (!root) throw new Error("Page is missing its root element");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Only the production build has a service worker. In development it would serve stale files.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((error: unknown) => {
      console.error("Offline support could not start", error);
    });
  });
}
