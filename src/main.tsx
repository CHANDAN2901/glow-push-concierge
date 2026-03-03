import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Global safety net: prevent unhandled promise rejections from crashing the app
window.addEventListener("unhandledrejection", (event) => {
  console.error("[Global] Unhandled promise rejection:", event.reason);
  event.preventDefault();
});

createRoot(document.getElementById("root")!).render(<App />);
