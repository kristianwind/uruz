import { getContext } from "@/lib/auth/session";
import { listCompletedSessions, listSessionSets, listPersonalRecords } from "@/lib/db/repo/sessions";
import { listUserBadges } from "@/lib/db/repo/badges";
import { listCoachMessages } from "@/lib/db/repo/coach";
import { listConstraints } from "@/lib/db/repo/constraints";
import { listReminders } from "@/lib/db/repo/reminders";
import { listExercises } from "@/lib/db/repo/exercises";

export const runtime = "nodejs";

/**
 * Complete export of everything Uruz holds about the signed-in user
 * (spec §10, GDPR). Machine-readable and self-contained: exercise names are
 * embedded rather than referenced by id, so the file is readable on its own.
 */
export async function GET() {
  const ctx = await getContext();
  if (!ctx) return new Response("unauthenticated", { status: 401 });

  const exercises = new Map(listExercises().map((e) => [e.id, e]));
  const name = (id: string) => exercises.get(id)?.nameDa ?? id;

  const sessions = listCompletedSessions(ctx.user.id).map((s) => ({
    startedAt: s.startedAt,
    endedAt: s.endedAt,
    mood: s.mood,
    rpe: s.rpe,
    bodyweight: s.bodyweight,
    note: s.note,
    sets: listSessionSets(s.id).map((set) => ({
      exercise: name(set.exerciseId),
      setIndex: set.setIndex,
      weight: set.weight,
      reps: set.reps,
      seconds: set.seconds,
      isWarmup: set.isWarmup,
      isPr: set.isPr,
      rir: set.rir,
      loggedAt: set.loggedAt,
    })),
  }));

  const payload = {
    exportedAt: new Date().toISOString(),
    app: "Uruz",
    profile: {
      displayName: ctx.user.displayName,
      email: ctx.user.email,
      role: ctx.user.role,
      difficulty: ctx.user.difficulty,
      coachTone: ctx.user.coachTone,
      locale: ctx.user.localePref,
      createdAt: ctx.user.createdAt,
    },
    sessions,
    personalRecords: listPersonalRecords(ctx.user.id).map((pr) => ({
      exercise: name(pr.exerciseId),
      type: pr.type,
      value: pr.value,
      achievedAt: pr.achievedAt,
    })),
    badges: listUserBadges(ctx.user.id),
    coachMessages: listCoachMessages(ctx.user.id, 1000).map((m) => ({
      kind: m.kind,
      body: m.body,
      createdAt: m.createdAt,
    })),
    constraints: listConstraints(ctx.user.id, false).map((c) => ({
      kind: c.kind,
      body: c.body,
      isActive: c.isActive,
      createdAt: c.createdAt,
    })),
    reminders: listReminders(ctx.user.id).map((r) => ({
      kind: r.kind,
      schedule: r.scheduleCron,
      channel: r.channel,
      enabled: r.enabled,
    })),
  };

  const date = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="uruz-data-${date}.json"`,
    },
  });
}
