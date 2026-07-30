/**
 * Next.js instrumentation hook. Kept to the exact shape the compiler
 * recognises: the NEXT_RUNTIME check wraps a relative dynamic import, so the
 * edge bundle drops the branch entirely — the scheduler's import chain reaches
 * web-push and node:http, which must never be resolved for edge.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation-node");
  }
}
