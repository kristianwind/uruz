/**
 * Generate realistic training history for the demo users, so statistics,
 * badges and the leaderboard have something to show before real training data
 * exists.
 *
 *   npm run db:seed:history            # ~12 weeks for every user
 *   URUZ_HISTORY_WEEKS=20 npm run db:seed:history
 *
 * Safe to re-run: it clears previously generated demo sessions first.
 */
import { getDb, newId } from "../src/lib/db/sqlite";
import { listHallUsers } from "../src/lib/db/repo/users";
import { getAnyHall } from "../src/lib/db/repo/halls";
import { listTemplates, getWorkoutExercises } from "../src/lib/db/repo/workouts";
import { getExercisesByIds } from "../src/lib/db/repo/exercises";
import { logSet } from "../src/lib/db/repo/sessions";

const WEEKS = Number(process.env.URUZ_HISTORY_WEEKS || 12);
const SESSIONS_PER_WEEK = 2;

/** Deterministic PRNG so re-runs produce the same plausible history. */
function makeRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const hall = getAnyHall();
if (!hall) {
  console.error("No hall found. Run `npm run db:seed:demo` first.");
  process.exit(1);
}

const users = listHallUsers(hall.id);
if (users.length === 0) {
  console.error("No users found. Run `npm run db:seed:demo` first.");
  process.exit(1);
}

const templates = listTemplates(hall.id).filter((t) => !t.name.startsWith("Kondi"));
if (templates.length === 0) {
  console.error("No workout templates found. Run `npm run db:seed` first.");
  process.exit(1);
}

const db = getDb();

// Remove any previously generated history so the script is idempotent.
for (const user of users) {
  db.prepare("DELETE FROM sessions WHERE user_id = ?").run(user.id);
  db.prepare("DELETE FROM personal_records WHERE user_id = ?").run(user.id);
}

let totalSessions = 0;
let totalSets = 0;

users.forEach((user, userIndex) => {
  const rand = makeRandom(1000 + userIndex * 7919);
  // Each user has their own starting strength and rate of progress.
  const strengthBase = 0.8 + userIndex * 0.25;
  const startWeights = new Map<string, number>();

  for (let week = WEEKS - 1; week >= 0; week--) {
    for (let s = 0; s < SESSIONS_PER_WEEK; s++) {
      // Skip the occasional session — real life, and it makes streaks honest.
      if (rand() < 0.12) continue;

      const template = templates[(week * SESSIONS_PER_WEEK + s + userIndex) % templates.length];
      const items = getWorkoutExercises(template.id);
      if (items.length === 0) continue;

      const started = new Date();
      started.setDate(started.getDate() - week * 7 - (s === 0 ? 3 : 0));
      started.setHours(16 + Math.floor(rand() * 3), Math.floor(rand() * 60), 0, 0);

      const sessionId = newId();
      db.prepare("INSERT INTO sessions (id, user_id, workout_id, started_at) VALUES (?,?,?,?)").run(
        sessionId,
        user.id,
        template.id,
        started.toISOString(),
      );

      const exercises = getExercisesByIds(items.map((i) => i.exerciseId));
      let setCount = 0;

      for (const item of items) {
        const ex = exercises.get(item.exerciseId);
        if (!ex) continue;

        if (ex.unit === "sek") {
          // Timed holds creep up over the weeks.
          const base = 25 + (WEEKS - week) * 1.2;
          for (let i = 0; i < item.targetSets; i++) {
            logSet(user.id, {
              sessionId,
              exerciseId: ex.id,
              setIndex: i,
              seconds: Math.round(base + rand() * 6 - 3),
            });
            setCount++;
          }
          continue;
        }

        // Weight starts from a per-exercise base and progresses ~2.5 kg every
        // few weeks, with a little noise so the graph is not a straight line.
        if (!startWeights.has(ex.id)) {
          const machineBase =
            ex.category === "ben" ? 55 : ex.category === "pres" ? 30 : ex.category === "traek" ? 35 : 15;
          startWeights.set(ex.id, Math.round(machineBase * strengthBase));
        }
        const base = startWeights.get(ex.id)!;
        const progressed = base + Math.floor((WEEKS - week) / 3) * 2.5;
        const weight = Math.max(5, Math.round((progressed + (rand() * 5 - 2.5)) / 2.5) * 2.5);

        const targetMin = item.targetRepsMin ?? 8;
        const targetMax = item.targetRepsMax ?? 12;
        for (let i = 0; i < item.targetSets; i++) {
          // Reps drift down across the sets, as fatigue accumulates.
          const reps = Math.max(
            targetMin - 2,
            Math.round(targetMax - i - rand() * 1.5),
          );
          logSet(user.id, {
            sessionId,
            exerciseId: ex.id,
            setIndex: i,
            weight,
            reps,
          });
          setCount++;
        }
      }

      const ended = new Date(started.getTime() + (35 + rand() * 25) * 60000);
      db.prepare("UPDATE sessions SET ended_at = ?, mood = ?, rpe = ?, bodyweight = ? WHERE id = ?").run(
        ended.toISOString(),
        3 + Math.floor(rand() * 3), // 3..5
        6 + Math.floor(rand() * 3), // 6..8
        // A slow, noisy bodyweight trend.
        Math.round((82 + userIndex * 4 - (WEEKS - week) * 0.06 + rand() * 0.8) * 10) / 10,
        sessionId,
      );

      totalSessions++;
      totalSets += setCount;
    }
  }
});

console.log("✔ Demo history generated");
console.log(`  Users:    ${users.length}`);
console.log(`  Weeks:    ${WEEKS}`);
console.log(`  Sessions: ${totalSessions}`);
console.log(`  Sets:     ${totalSets}`);
