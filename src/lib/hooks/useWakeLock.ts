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
        const lock = await navigator.wakeLock.request("screen");
        if (cancelled) {
          void lock.release().catch(() => {});
          return;
        }
        lock.addEventListener("release", onRelease);
        sentinel.current = lock;
      } catch {
        // Denied, or the browser decided not to — nothing to do about it.
        // Low Power Mode on iOS refuses outright, and that is its right.
      }
    }

    function onVisibilityChange() {
      if (document.visibilityState === "visible" && !sentinel.current) void acquire();
    }

    /**
     * Try again on the first touch.
     *
     * Some browsers only grant a wake lock during a user gesture. Arriving here
     * by tapping a workout does count, but the effect runs a moment later and
     * that permission window is short — so if the first attempt came back
     * empty-handed, the next tap on the screen is a free second chance. Logging
     * a set is a tap, so in practice this costs the user nothing.
     */
    function onInteraction() {
      if (!sentinel.current) void acquire();
    }

    // A lock is released by the browser on its own terms — a phone call, a
    // notification, the system deciding otherwise. Without this, it never
    // comes back, and the screen starts sleeping again halfway through.
    function onRelease() {
      sentinel.current = null;
    }

    void acquire();
    document.addEventListener("visibilitychange", onVisibilityChange);
    document.addEventListener("pointerdown", onInteraction);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      document.removeEventListener("pointerdown", onInteraction);
      sentinel.current?.removeEventListener("release", onRelease);
      void sentinel.current?.release().catch(() => {});
      sentinel.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
}
