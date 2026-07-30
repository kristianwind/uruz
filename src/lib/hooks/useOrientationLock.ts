"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Keep the screen in portrait, where the browser allows it.
 *
 * What is actually possible here is narrower than it looks, and worth writing
 * down so nobody re-implements it hopefully:
 *
 * - The **manifest** already asks for `"orientation": "portrait"`. Android
 *   honours that for an installed app. iOS does not.
 * - **`screen.orientation.lock()`** exists in Chromium but rejects with
 *   `NotSupportedError` on a desktop, and generally needs an installed or
 *   fullscreen context. Measured, not assumed.
 * - **iOS Safari has no orientation lock at all** — not from the manifest, not
 *   from JavaScript. On an iPhone the only real switch is the one in Control
 *   Centre, and no amount of code changes that.
 *
 * So this tries, and reports honestly what happened. A toggle that silently
 * does nothing is worse than no toggle: it teaches you to distrust the app.
 */

export type LockState = "locked" | "unlocked" | "unsupported";

const STORAGE_KEY = "uruz-orientation-lock";

interface OrientationLockApi {
  lock?: (orientation: string) => Promise<void>;
  unlock?: () => void;
}

function api(): OrientationLockApi | null {
  if (typeof window === "undefined") return null;
  const o = window.screen?.orientation as unknown as OrientationLockApi | undefined;
  return o && typeof o.lock === "function" ? o : null;
}

export function useOrientationLock(): {
  state: LockState;
  supported: boolean;
  toggle: () => void;
} {
  // Starts "unlocked" so the server and the first client paint agree; the real
  // state is settled after mount.
  const [state, setState] = useState<LockState>("unlocked");
  const [supported, setSupported] = useState(false);

  const apply = useCallback(async (wanted: boolean) => {
    const o = api();
    if (!o?.lock) {
      setState("unsupported");
      return;
    }
    if (!wanted) {
      o.unlock?.();
      setState("unlocked");
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    try {
      await o.lock("portrait");
      setState("locked");
      localStorage.setItem(STORAGE_KEY, "portrait");
    } catch {
      // The API is there but the platform will not do it — an iPhone, or a
      // browser tab that is not installed. Say so rather than pretend.
      setState("unsupported");
      setSupported(false);
    }
  }, []);

  useEffect(() => {
    const o = api();
    if (!o?.lock) {
      setState("unsupported");
      return;
    }
    setSupported(true);
    // Re-apply a previous choice: a lock does not survive a page load.
    if (localStorage.getItem(STORAGE_KEY) === "portrait") void apply(true);
  }, [apply]);

  const toggle = useCallback(() => void apply(state !== "locked"), [apply, state]);

  return { state, supported, toggle };
}
