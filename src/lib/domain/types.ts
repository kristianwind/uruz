/**
 * Uruz domain model (spec §4).
 *
 * These types are the single source of truth for the shape of the data. The
 * data-access layer (`@/lib/db`) maps them to/from whichever backend is in use
 * (node:sqlite for local dev, Supabase Postgres in production). UI never talks
 * to a backend directly — only through repositories that speak these types.
 */

export type Role = "admin" | "member" | "coach";
export type ThemePref = "norse" | "plain";
export type ModePref = "dark" | "light";
export type Difficulty = "begynder" | "erfaren" | "pro";
export type CoachTone = "soft" | "hard";
/** Show exercises as stick-figure illustrations or as photographs. */
export type MediaPref = "illustration" | "photo";

export type ExerciseCategory = "ben" | "pres" | "traek" | "kerne" | "kondi";
export type Equipment = "maskine" | "haandvaegt" | "kabel" | "kropsvaegt" | "stang";
export type Unit = "kg" | "sek" | "reps" | "km";

export type WorkoutGoal = "styrke" | "udholdenhed" | "helkrop" | "split" | "kondi";

export type PRType =
  | "1rm_est"
  | "max_weight"
  | "max_reps"
  | "max_volume"
  | "max_hold"
  | "max_distance"
  | "max_watts";

export type BadgeTier = "bronze" | "soelv" | "guld";
export type CoachMessageKind =
  | "ros"
  | "ris"
  | "forslag"
  | "opsummering"
  | "reminder";
export type ReminderChannel = "push" | "email";
export type InvitationStatus = "pending" | "accepted" | "revoked";
export type GoalType =
  | "vaegt_paa_ovelse"
  | "traeninger_pr_uge"
  | "kropsvaegt"
  | "volumen";

/** Progression strategy applied per workout-exercise (spec §5). */
export type ProgressionMode = "double" | "linear" | "rir" | "none";

export interface Hall {
  id: string;
  name: string;
  createdAt: string;
}

export interface User {
  id: string;
  hallId: string;
  email: string;
  displayName: string;
  role: Role;
  rankLevel: number; // 0..5 -> Thræl..Einherjer
  avatar: string | null;
  themePref: ThemePref;
  modePref: ModePref;
  localePref: string;
  mediaPref: MediaPref;
  difficulty: Difficulty;
  coachTone: CoachTone;
  isPrivate: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface Exercise {
  id: string;
  slug: string;
  nameDa: string;
  nameEn: string | null;
  category: ExerciseCategory;
  primaryMuscles: string[];
  equipment: Equipment;
  unit: Unit;
  isBodyweight: boolean;
  instructionsSteps: string[];
  instructionsStepsEn: string[];
  cues: string[];
  cuesEn: string[];
  saferVariant: string | null;
  saferVariantEn: string | null;
  svgKey: string | null;
  /** Optional photograph of the exercise; falls back to the illustration. */
  imageUrl: string | null;
  difficulty: Difficulty;
  demoVideoUrl: string | null;
  createdBy: string | null;
  isPublic: boolean;
}

export interface Workout {
  id: string;
  hallId: string;
  name: string;
  /** English name for seeded templates; user-created workouts leave this null. */
  nameEn: string | null;
  description: string | null;
  descriptionEn: string | null;
  goal: WorkoutGoal;
  level: Difficulty;
  estimatedMinutes: number;
  isTemplate: boolean;
  createdBy: string | null;
  createdAt: string;
}

export interface WorkoutExercise {
  id: string;
  workoutId: string;
  exerciseId: string;
  order: number;
  targetSets: number;
  targetRepsMin: number | null;
  targetRepsMax: number | null;
  targetSeconds: number | null;
  restSeconds: number;
  progressionMode: ProgressionMode;
  /** A warm-up row: logged sets are marked as warm-up automatically. */
  isWarmup: boolean;
  notes: string | null;
}

export interface Session {
  id: string;
  userId: string;
  workoutId: string | null;
  startedAt: string;
  endedAt: string | null;
  mood: number | null; // 1..5
  rpe: number | null; // 1..10
  bodyweight: number | null;
  note: string | null;
}

export interface SetLog {
  id: string;
  sessionId: string;
  exerciseId: string;
  setIndex: number;
  weight: number | null;
  reps: number | null;
  seconds: number | null;
  /** Cardio only: metres covered and average watts. */
  distanceM: number | null;
  watts: number | null;
  isWarmup: boolean;
  isPr: boolean;
  rir: number | null;
  loggedAt: string;
}

export interface PersonalRecord {
  id: string;
  userId: string;
  exerciseId: string;
  type: PRType;
  value: number;
  achievedAt: string;
  sessionId: string | null;
}

export interface Badge {
  id: string;
  slug: string;
  name: string;
  description: string;
  runeSymbol: string;
  tier: BadgeTier;
  criteriaJson: Record<string, unknown>;
}

export interface UserBadge {
  id: string;
  userId: string;
  badgeId: string;
  earnedAt: string | null;
  progress: number; // 0..1
}

export interface Streak {
  id: string;
  userId: string;
  currentDays: number;
  longestDays: number;
  lastTrainedOn: string | null;
  freezeTokens: number;
}

export interface CoachMessage {
  id: string;
  userId: string;
  kind: CoachMessageKind;
  body: string;
  dataJson: Record<string, unknown> | null;
  createdAt: string;
  readAt: string | null;
}

export interface Reminder {
  id: string;
  userId: string;
  kind: string;
  scheduleCron: string;
  channel: ReminderChannel;
  enabled: boolean;
  lastSentAt: string | null;
}

export interface Invitation {
  id: string;
  hallId: string;
  email: string;
  code: string;
  invitedBy: string;
  role: Role;
  status: InvitationStatus;
  expiresAt: string;
}

export interface Goal {
  id: string;
  userId: string;
  type: GoalType;
  target: number;
  deadline: string | null;
  progress: number;
}

/** Rank ladder (spec §9). Index maps to User.rankLevel. */
export const RANK_SLUGS = [
  "thrael",
  "dreng",
  "karl",
  "bersaerk",
  "jarl",
  "einherjer",
] as const;
export type RankSlug = (typeof RANK_SLUGS)[number];
