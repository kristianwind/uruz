/**
 * Built-in scheduler (node side of the instrumentation hook).
 *
 * The ravens must fly without anyone remembering to configure a cron job:
 * a plain `docker run` of the image gets working reminders. So the server
 * itself ticks the scheduled work every 15 minutes — the same idempotent work
 * /api/cron exposes to external schedulers, so both can coexist safely.
 *
 * Enabled in production; in development only with URUZ_SCHEDULER=1 (a dev
 * database full of seeded users should not email real people by accident).
 * URUZ_SCHEDULER=0 turns it off anywhere, for hosts that run /api/cron
 * externally and want exactly one driver.
 */

const TICK_MS = 15 * 60 * 1000;
const FIRST_TICK_MS = 90 * 1000; // let the server settle before the first run

function enabled(): boolean {
  if (process.env.NEXT_PHASE === "phase-production-build") return false;
  const flag = process.env.URUZ_SCHEDULER;
  return flag === "1" || (flag !== "0" && process.env.NODE_ENV === "production");
}

if (enabled()) {
  let running = false;
  const tick = async () => {
    if (running) return; // a slow tick must not overlap the next one
    running = true;
    try {
      // Imported lazily so merely loading this module stays free of side effects.
      const { runScheduledWork } = await import("@/lib/notify/cron");
      const { notifications, analyses } = await runScheduledWork();
      if (notifications.length > 0 || analyses > 0) {
        console.log(
          `scheduler: sent ${notifications.length} notification(s), ran ${analyses} weekly analysis/analyses`,
        );
      }
    } catch (err) {
      console.error("scheduler: tick failed", err);
    } finally {
      running = false;
    }
  };

  console.log(`scheduler: built-in, every ${TICK_MS / 60000} min`);
  setTimeout(tick, FIRST_TICK_MS).unref();
  setInterval(tick, TICK_MS).unref();
}

export {};
