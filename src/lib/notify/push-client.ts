"use client";

/**
 * Client side of Web Push: permission, subscription and unsubscription.
 *
 * On iOS this only works once the app has been added to the home screen, so
 * `pushSupport()` reports that case distinctly — telling a user "not supported"
 * when they simply need to install the PWA would be misleading.
 */

export type PushSupport = "ready" | "needs-install" | "unsupported" | "blocked";

export function pushSupport(): PushSupport {
  if (typeof window === "undefined") return "unsupported";
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    // iOS Safari exposes PushManager only in an installed (standalone) PWA.
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;
    return isIos && !standalone ? "needs-install" : "unsupported";
  }
  if (Notification.permission === "denied") return "blocked";
  return "ready";
}

/**
 * URL-safe base64 (VAPID) to the bytes the Push API expects.
 *
 * Backed by an explicit ArrayBuffer: TypeScript's `Uint8Array` may be backed by
 * a SharedArrayBuffer, which `applicationServerKey` does not accept.
 */
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalised = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalised);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

export async function isSubscribed(): Promise<boolean> {
  if (pushSupport() !== "ready") return false;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return false;
  return !!(await reg.pushManager.getSubscription());
}

/** Ask for permission and register this device. Returns true on success. */
export async function subscribeToPush(vapidPublicKey: string): Promise<boolean> {
  if (pushSupport() !== "ready" || !vapidPublicKey) return false;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;

  // In development the app deliberately does not register a service worker,
  // so register one here on demand rather than failing silently.
  const reg =
    (await navigator.serviceWorker.getRegistration()) ??
    (await navigator.serviceWorker.register("/sw.js", { scope: "/" }));
  await navigator.serviceWorker.ready;

  const existing = await reg.pushManager.getSubscription();
  const sub =
    existing ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    }));

  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(sub.toJSON()),
  });
  return res.ok;
}

export async function unsubscribeFromPush(): Promise<boolean> {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return true;

  await fetch("/api/push/subscribe", {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ endpoint: sub.endpoint }),
  });
  return sub.unsubscribe();
}
