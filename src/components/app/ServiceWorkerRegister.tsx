"use client";

import { useEffect } from "react";

/**
 * Register the service worker once, on the client, after the app mounts.
 *
 * Skipped in development: the SW serves `/_next/static/` cache-first, and dev
 * rebuilds change chunk names constantly, so a cached chunk quickly stops
 * matching the HTML and hydration dies with a confusing module error. Any
 * previously installed worker is actively unregistered for the same reason.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations?.().then((regs) => {
        for (const reg of regs) void reg.unregister();
      });
      caches?.keys?.().then((keys) => {
        for (const key of keys) if (key.startsWith("uruz-")) void caches.delete(key);
      });
      return;
    }

    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // Registration failing (e.g. in an unsupported context) must never
        // break the app — offline is an enhancement, not a requirement.
      });
    };
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });
    return () => window.removeEventListener("load", onLoad);
  }, []);
  return null;
}
