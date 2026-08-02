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

  /**
   * Queue a write and send it.
   *
   * The send is awaited, not fired and forgotten: a caller that asks the server
   * about what it just wrote has to be able to rely on it having arrived. The
   * PR check did exactly that and lost the race every time — the set was still
   * sitting in IndexedDB when the server was asked whether it beat a record, so
   * only the sets logged while an earlier flush happened to be in flight ever
   * got their celebration.
   *
   * This costs nothing on screen: the optimistic update has already painted the
   * set, and offline `flushQueue` returns immediately without a request.
   */
  const push = useCallback(
    async (op: QueuedOp) => {
      await enqueue(op);
      await refresh();
      await flush();
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
