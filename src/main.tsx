import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Global safety net: prevent unhandled promise rejections from crashing the app
window.addEventListener("unhandledrejection", (event) => {
  console.error("[Global] Unhandled promise rejection:", event.reason);
  event.preventDefault();
});

// Register the push + installability service worker on startup (idempotent with
// the registration inside the push opt-in flow). Doing it here — for every route,
// not just when a client opts into push — is what makes the app installable as a
// real PWA on first visit and lets navigator.serviceWorker.ready resolve.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/push-sw.js", { scope: "/" })
      .catch((err) => console.warn("[SW] registration failed:", err));
  });
}

createRoot(document.getElementById("root")!).render(<App />);
