import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import "@/lib/i18n";
import App from "@/App";

// ─────────────────────────────────────────────────────────────────────────
// Global error suppression — registered in CAPTURE phase so we run BEFORE
// the webpack-dev-server overlay listener and can stopImmediatePropagation.
// We swallow ONLY non-Error / 3rd-party rejections so real bugs still log.
// ─────────────────────────────────────────────────────────────────────────
if (typeof window !== "undefined") {
  const isObjectError = (r) =>
    r && typeof r === "object" && !r.message && !r.stack && Object.keys(r).length === 0;

  const isThirdPartySource = (src) =>
    !!src && /(emergent|visual-edits|posthog|chrome-extension|gtag|google-analytics)/i.test(src);

  window.addEventListener(
    "unhandledrejection",
    (e) => {
      const r = e.reason;
      if (
        isObjectError(r) ||
        (r && typeof r === "object" && isThirdPartySource(r.stack || r.source || r.filename))
      ) {
        // eslint-disable-next-line no-console
        console.warn("[suppressed rejection]", r);
        e.preventDefault();
        e.stopImmediatePropagation?.();
      }
    },
    true /* capture */
  );

  window.addEventListener(
    "error",
    (e) => {
      const src = e?.filename || e?.error?.stack || "";
      const isObj = e?.error && typeof e.error === "object" && !e.error.message;
      if (isObj || isThirdPartySource(src)) {
        // eslint-disable-next-line no-console
        console.warn("[suppressed window error]", e.message, src);
        e.preventDefault();
        e.stopImmediatePropagation?.();
      }
    },
    true /* capture */
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
