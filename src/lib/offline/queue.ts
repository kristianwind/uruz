"use client";

/**
 * Offline write queue backed by IndexedDB.
 *
 * Every mutation made during a workout (log set, edit set, finish session) is
 * written here FIRST and applied to the UI optimistically, then flushed to the
 * server. If the network is down — the gym basement case — the queue survives
 * reloads and app restarts, and drains as soon as connectivity returns.
 *
 * iOS Safari has no Background Sync, so flushing is driven by the app: on
 * mount, on `online`, and after each successful write. Every queued operation
 * carries a client-generated id, so replaying is idempotent server-side.
 */

const DB_NAME = "uruz-offline";
const DB_VERSION = 1;
const STORE = "queue";

export type QueuedOp =
  | { kind: "log_set"; payload: LogSetPayload }
  | { kind: "update_set"; payload: UpdateSetPayload }
  | { kind: "delete_set"; payload: { setId: string } }
  | { kind: "finish_session"; payload: FinishSessionPayload };

export interface LogSetPayload {
  id: string; // client-generated set id — makes replay idempotent
  sessionId: string;
  exerciseId: string;
  setIndex: number;
  weight?: number | null;
  reps?: number | null;
  seconds?: number | null;
  distanceM?: number | null;
  watts?: number | null;
  isWarmup?: boolean;
  rir?: number | null;
}

export interface UpdateSetPayload {
  setId: string;
  weight?: number | null;
  reps?: number | null;
  seconds?: number | null;
  distanceM?: number | null;
  watts?: number | null;
  isWarmup?: boolean;
  rir?: number | null;
}

export interface FinishSessionPayload {
  sessionId: string;
  mood?: number | null;
  rpe?: number | null;
  bodyweight?: number | null;
  note?: string | null;
}

/** A queued op plus its bookkeeping. Intersection, since QueuedOp is a union. */
export type QueueEntry = QueuedOp & {
  /** Monotonic key assigned by IndexedDB; preserves ordering. */
  seq?: number;
  queuedAt: number;
  attempts: number;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "seq", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = fn(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        t.oncomplete = () => db.close();
      }),
  );
}

export async function enqueue(op: QueuedOp): Promise<void> {
  const entry: QueueEntry = { ...op, queuedAt: Date.now(), attempts: 0 };
  await tx("readwrite", (s) => s.add(entry) as IDBRequest<IDBValidKey>);
}

export async function listQueue(): Promise<QueueEntry[]> {
  const all = await tx<QueueEntry[]>("readonly", (s) => s.getAll() as IDBRequest<QueueEntry[]>);
  return all.sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
}

export async function queueSize(): Promise<number> {
  return tx<number>("readonly", (s) => s.count() as IDBRequest<number>);
}

async function remove(seq: number): Promise<void> {
  await tx("readwrite", (s) => s.delete(seq) as unknown as IDBRequest<undefined>);
}

async function bumpAttempts(entry: QueueEntry): Promise<void> {
  await tx("readwrite", (s) => s.put({ ...entry, attempts: entry.attempts + 1 }) as IDBRequest<IDBValidKey>);
}

const ENDPOINTS: Record<QueuedOp["kind"], string> = {
  log_set: "/api/sessions/log-set",
  update_set: "/api/sessions/update-set",
  delete_set: "/api/sessions/delete-set",
  finish_session: "/api/sessions/finish",
};

/** Give up on an entry after this many failed attempts, to avoid a poison queue. */
const MAX_ATTEMPTS = 8;

export interface FlushResult {
  sent: number;
  remaining: number;
}

/**
 * Send queued operations to the server in order. Stops at the first network
 * failure so ordering is preserved; 4xx responses drop the entry (a malformed
 * op must not block the queue forever).
 */
export async function flushQueue(): Promise<FlushResult> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { sent: 0, remaining: await queueSize() };
  }

  const entries = await listQueue();
  let sent = 0;

  for (const entry of entries) {
    if (entry.seq === undefined) continue;
    try {
      const res = await fetch(ENDPOINTS[entry.kind], {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(entry.payload),
      });

      if (res.ok) {
        await remove(entry.seq);
        sent++;
        continue;
      }

      if (res.status >= 400 && res.status < 500) {
        // Permanently rejected (bad payload / gone) — drop it rather than
        // blocking every later set behind it.
        console.warn(`Dropping queued ${entry.kind}: server said ${res.status}`);
        await remove(entry.seq);
        continue;
      }

      // 5xx — server trouble; retry later.
      await bumpAttempts(entry);
      if (entry.attempts + 1 >= MAX_ATTEMPTS) await remove(entry.seq);
      break;
    } catch {
      // Network error: stop here and keep ordering intact.
      await bumpAttempts(entry);
      break;
    }
  }

  return { sent, remaining: await queueSize() };
}
