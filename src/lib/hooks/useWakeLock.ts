"use client";

import { useEffect, useRef } from "react";

/**
 * Keep the screen awake for as long as the component is mounted.
 *
 * A workout has long gaps: ninety seconds of rest, a set, another rest. The
 * phone locks in the middle of every one of them, and unlocking with chalky
 * hands to log two numbers is the single most annoying thing about using a
 * phone in a gym. The wake lock lasts exactly as long as the logging screen is
 * open, and is released the moment you leave it.
 *
 * The lock is dropped by the browser whenever the tab is hidden — switching
 * apps, or the screen locking anyway — so it has to be re-acquired when the
 * page becomes visible again, or it silently stops working after the first
 * interruption.
 *
 * Unsupported browsers do nothing. This is a comfort, never a requirement, so
 * a failure is not worth telling anyone about.
 */
export function useWakeLock(enabled = true): void {
  const sentinel = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!enabled || typeof navigator === "undefined" || !("wakeLock" in navigator)) return;

    let cancelled = false;

    async function acquire() {
      // Requesting while hidden throws; the visibility handler retries.
      if (cancelled || document.visibilityState !== "visible") return;
      try {
        sentinel.current = await navigator.wakeLock.request("screen");
      } catch {
        // Denied, or the browser decided not to — nothing to do about it.
      }
    }

    function onVisibilityChange() {
      if (document.visibilityState === "visible" && !sentinel.current) void acquire();
    }

    void acquire();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      void sentinel.current?.release().catch(() => {});
      sentinel.current = null;
    };
  }, [enabled]);
}
