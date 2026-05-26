import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import "@/lib/i18n";
import App from "@/App";

// Suppress CRA overlay for benign third-party object rejections (PostHog, emergent-main.js, etc.)
// We DO still log them so real bugs surface.
if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (e) => {
    const r = e.reason;
    const isThirdParty =
      (r && typeof r === "object" && !r.message && !r.stack) ||
      (r?.stack && /emergent-main|posthog|chrome-extension/i.test(r.stack));
    if (isThirdParty) {
      // eslint-disable-next-line no-console
      console.warn("[suppressed third-party rejection]", r);
      e.preventDefault();
    }
  });

  window.addEventListener("error", (e) => {
    const src = e?.filename || "";
    if (/emergent-main|posthog|chrome-extension|leaflet-marker-icon/.test(src)) {
      // eslint-disable-next-line no-console
      console.warn("[suppressed third-party error]", e.message);
      e.preventDefault();
    }
  });
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
