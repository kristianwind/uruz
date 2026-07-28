import type {
  Badge,
  CoachMessage,
  Exercise,
  Goal,
  Hall,
  Invitation,
  PersonalRecord,
  Reminder,
  Session,
  SetLog,
  Streak,
  User,
  UserBadge,
  Workout,
  WorkoutExercise,
} from "@/lib/domain/types";
import {
  asStr,
  asStrOrNull,
  toBool,
  toJsonArray,
  toJsonObject,
  toNum,
  type Row,
} from "./sqlite";

/** Map DB rows (snake_case, JSON-as-text) onto the camelCase domain types. */

export const mapHall = (r: Row): Hall => ({
  id: asStr(r.id),
  name: asStr(r.name),
  createdAt: asStr(r.created_at),
});

export const mapUser = (r: Row): User => ({
  id: asStr(r.id),
  hallId: asStr(r.hall_id),
  email: asStr(r.email),
  displayName: asStr(r.display_name),
  role: asStr(r.role) as User["role"],
  rankLevel: Number(r.rank_level ?? 0),
  avatar: asStrOrNull(r.avatar),
  themePref: asStr(r.theme_pref) as User["themePref"],
  modePref: asStr(r.mode_pref) as User["modePref"],
  localePref: asStr(r.locale_pref) || "da",
  mediaPref: (asStr(r.media_pref) || "illustration") as User["mediaPref"],
  difficulty: asStr(r.difficulty) as User["difficulty"],
  coachTone: asStr(r.coach_tone) as User["coachTone"],
  isPrivate: toBool(r.is_private),
  isActive: toBool(r.is_active),
  createdAt: asStr(r.created_at),
});

export const mapExercise = (r: Row): Exercise => ({
  id: asStr(r.id),
  slug: asStr(r.slug),
  nameDa: asStr(r.name_da),
  nameEn: asStrOrNull(r.name_en),
  category: asStr(r.category) as Exercise["category"],
  primaryMuscles: toJsonArray(r.primary_muscles),
  equipment: asStr(r.equipment) as Exercise["equipment"],
  unit: asStr(r.unit) as Exercise["unit"],
  isBodyweight: toBool(r.is_bodyweight),
  instructionsSteps: toJsonArray(r.instructions_steps),
  instructionsStepsEn: toJsonArray(r.instructions_steps_en),
  cues: toJsonArray(r.cues),
  cuesEn: toJsonArray(r.cues_en),
  saferVariant: asStrOrNull(r.safer_variant),
  saferVariantEn: asStrOrNull(r.safer_variant_en),
  svgKey: asStrOrNull(r.svg_key),
  imageUrl: asStrOrNull(r.image_url),
  difficulty: asStr(r.difficulty) as Exercise["difficulty"],
  demoVideoUrl: asStrOrNull(r.demo_video_url),
  createdBy: asStrOrNull(r.created_by),
  isPublic: toBool(r.is_public),
});

export const mapWorkout = (r: Row): Workout => ({
  id: asStr(r.id),
  hallId: asStr(r.hall_id),
  name: asStr(r.name),
  nameEn: asStrOrNull(r.name_en),
  description: asStrOrNull(r.description),
  descriptionEn: asStrOrNull(r.description_en),
  goal: asStr(r.goal) as Workout["goal"],
  level: asStr(r.level) as Workout["level"],
  estimatedMinutes: Number(r.estimated_minutes ?? 45),
  isTemplate: toBool(r.is_template),
  createdBy: asStrOrNull(r.created_by),
  createdAt: asStr(r.created_at),
});

export const mapWorkoutExercise = (r: Row): WorkoutExercise => ({
  id: asStr(r.id),
  workoutId: asStr(r.workout_id),
  exerciseId: asStr(r.exercise_id),
  order: Number(r.ord ?? 0),
  targetSets: Number(r.target_sets ?? 3),
  targetRepsMin: toNum(r.target_reps_min),
  targetRepsMax: toNum(r.target_reps_max),
  targetSeconds: toNum(r.target_seconds),
  restSeconds: Number(r.rest_seconds ?? 90),
  progressionMode: asStr(r.progression_mode) as WorkoutExercise["progressionMode"],
  notes: asStrOrNull(r.notes),
});

export const mapSession = (r: Row): Session => ({
  id: asStr(r.id),
  userId: asStr(r.user_id),
  workoutId: asStrOrNull(r.workout_id),
  startedAt: asStr(r.started_at),
  endedAt: asStrOrNull(r.ended_at),
  mood: toNum(r.mood),
  rpe: toNum(r.rpe),
  bodyweight: toNum(r.bodyweight),
  note: asStrOrNull(r.note),
});

export const mapSetLog = (r: Row): SetLog => ({
  id: asStr(r.id),
  sessionId: asStr(r.session_id),
  exerciseId: asStr(r.exercise_id),
  setIndex: Number(r.set_index ?? 0),
  weight: toNum(r.weight),
  reps: toNum(r.reps),
  seconds: toNum(r.seconds),
  isWarmup: toBool(r.is_warmup),
  isPr: toBool(r.is_pr),
  rir: toNum(r.rir),
  loggedAt: asStr(r.logged_at),
});

export const mapPersonalRecord = (r: Row): PersonalRecord => ({
  id: asStr(r.id),
  userId: asStr(r.user_id),
  exerciseId: asStr(r.exercise_id),
  type: asStr(r.type) as PersonalRecord["type"],
  value: Number(r.value),
  achievedAt: asStr(r.achieved_at),
  sessionId: asStrOrNull(r.session_id),
});

export const mapBadge = (r: Row): Badge => ({
  id: asStr(r.id),
  slug: asStr(r.slug),
  name: asStr(r.name),
  description: asStr(r.description),
  runeSymbol: asStr(r.rune_symbol),
  tier: asStr(r.tier) as Badge["tier"],
  criteriaJson: toJsonObject(r.criteria_json) ?? {},
});

export const mapUserBadge = (r: Row): UserBadge => ({
  id: asStr(r.id),
  userId: asStr(r.user_id),
  badgeId: asStr(r.badge_id),
  earnedAt: asStrOrNull(r.earned_at),
  progress: Number(r.progress ?? 0),
});

export const mapStreak = (r: Row): Streak => ({
  id: asStr(r.id),
  userId: asStr(r.user_id),
  currentDays: Number(r.current_days ?? 0),
  longestDays: Number(r.longest_days ?? 0),
  lastTrainedOn: asStrOrNull(r.last_trained_on),
  freezeTokens: Number(r.freeze_tokens ?? 0),
});

export const mapCoachMessage = (r: Row): CoachMessage => ({
  id: asStr(r.id),
  userId: asStr(r.user_id),
  kind: asStr(r.kind) as CoachMessage["kind"],
  body: asStr(r.body),
  dataJson: toJsonObject(r.data_json),
  createdAt: asStr(r.created_at),
  readAt: asStrOrNull(r.read_at),
});

export const mapReminder = (r: Row): Reminder => ({
  id: asStr(r.id),
  userId: asStr(r.user_id),
  kind: asStr(r.kind),
  scheduleCron: asStr(r.schedule_cron),
  channel: asStr(r.channel) as Reminder["channel"],
  enabled: toBool(r.enabled),
  lastSentAt: asStrOrNull(r.last_sent_at),
});

export const mapInvitation = (r: Row): Invitation => ({
  id: asStr(r.id),
  hallId: asStr(r.hall_id),
  email: asStr(r.email),
  code: asStr(r.code),
  invitedBy: asStr(r.invited_by),
  role: asStr(r.role) as Invitation["role"],
  status: asStr(r.status) as Invitation["status"],
  expiresAt: asStr(r.expires_at),
});

export const mapGoal = (r: Row): Goal => ({
  id: asStr(r.id),
  userId: asStr(r.user_id),
  type: asStr(r.type) as Goal["type"],
  target: Number(r.target),
  deadline: asStrOrNull(r.deadline),
  progress: Number(r.progress ?? 0),
});
