"use client";

import { useCallback, useEffect, useState } from "react";
import { flushQueue, queueSize, enqueue, type QueuedOp } from "./queue";
import { useOnline } from "./useOnline";

/**
 * Drives the offline queue: flushes on mount, whenever the device comes back
 * online, and after each enqueued write. Exposes the pending count so the UI can
 * show "synkroniserer …" honestly rather than pretending everything is saved.
 */
export function useSync() {
  const online = useOnline();
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setPending(await queueSize());
    } catch {
      /* IndexedDB unavailable (private mode) — pending stays 0 */
    }
  }, []);

  const flush = useCallback(async () => {
    setSyncing(true);
    try {
      const result = await flushQueue();
      setPending(result.remaining);
    } catch {
      /* keep whatever we had; the next trigger retries */
    } finally {
      setSyncing(false);
    }
  }, []);

  /** Queue a write and immediately attempt to send it. */
  const push = useCallback(
    async (op: QueuedOp) => {
      await enqueue(op);
      await refresh();
      void flush();
    },
    [flush, refresh],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Flush as soon as connectivity returns.
  useEffect(() => {
    if (online) void flush();
  }, [online, flush]);

  return { online, pending, syncing, push, flush };
}
