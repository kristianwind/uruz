/**
 * Local development schema (node:sqlite dialect), as a module rather than a
 * file on disk.
 *
 * It must be importable, not read with `fs`: a Next standalone build traces
 * imports and would not copy a stray .sql file into the container image. The
 * canonical Postgres schema lives in supabase/migrations/.
 *
 * Conventions: ids are TEXT uuids, booleans are INTEGER 0/1, string arrays and
 * json blobs are stored as TEXT (JSON-encoded), timestamps are ISO-8601 TEXT.
 */
export const SCHEMA_SQL = `
-- Uruz local development schema (node:sqlite dialect).
--
-- This mirrors the canonical Postgres schema in supabase/migrations, minus
-- Row Level Security (which Postgres/Supabase enforces in production). For the
-- local backend, access scoping is enforced in the repository layer instead.
--
-- Conventions: ids are TEXT uuids, booleans are INTEGER 0/1, string arrays and
-- json blobs are stored as TEXT (JSON-encoded), timestamps are ISO-8601 TEXT.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS halls (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id           TEXT PRIMARY KEY,
  hall_id      TEXT NOT NULL REFERENCES halls(id) ON DELETE CASCADE,
  email        TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  role         TEXT NOT NULL DEFAULT 'member',
  rank_level   INTEGER NOT NULL DEFAULT 0,
  avatar       TEXT,
  theme_pref   TEXT NOT NULL DEFAULT 'norse',
  mode_pref    TEXT NOT NULL DEFAULT 'dark',
  locale_pref  TEXT NOT NULL DEFAULT 'en',
  media_pref   TEXT NOT NULL DEFAULT 'illustration',
  difficulty   TEXT NOT NULL DEFAULT 'begynder',
  coach_tone   TEXT NOT NULL DEFAULT 'soft',
  is_private   INTEGER NOT NULL DEFAULT 0,
  is_active    INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT NOT NULL
);

-- Passwords live apart from the user row, not as a column on it.
-- In Postgres every hall member may SELECT every other member's user row (that
-- is what makes Valhalla work), so a hash stored there would be readable by
-- one's own training partner. A separate table gets no policies at all, which
-- makes it unreachable from a client and server-only by construction.
-- A password is the fallback for whoever cannot use a passkey; no row here
-- simply means that person has no password.
CREATE TABLE IF NOT EXISTS user_passwords (
  user_id    TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  hash       TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS credentials (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind          TEXT NOT NULL,               -- 'passkey' | 'dev'
  public_key    TEXT,                        -- base64url (passkey)
  counter       INTEGER NOT NULL DEFAULT 0,
  transports    TEXT,                        -- JSON array
  -- What the person called this key ("iPhone", "work laptop"). Without it a
  -- list of credentials is a list of identical rows, and nobody can tell which
  -- one to remove.
  name          TEXT,
  last_used_at  TEXT,
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS exercises (
  id                 TEXT PRIMARY KEY,
  slug               TEXT NOT NULL UNIQUE,
  name_da            TEXT NOT NULL,
  name_en            TEXT,
  category           TEXT NOT NULL,
  primary_muscles    TEXT NOT NULL DEFAULT '[]',
  equipment          TEXT NOT NULL,
  unit               TEXT NOT NULL DEFAULT 'kg',
  is_bodyweight      INTEGER NOT NULL DEFAULT 0,
  instructions_steps TEXT NOT NULL DEFAULT '[]',
  instructions_steps_en TEXT NOT NULL DEFAULT '[]',
  cues               TEXT NOT NULL DEFAULT '[]',
  cues_en            TEXT NOT NULL DEFAULT '[]',
  safer_variant      TEXT,
  safer_variant_en   TEXT,
  svg_key            TEXT,
  image_url          TEXT,
  difficulty         TEXT NOT NULL DEFAULT 'begynder',
  demo_video_url     TEXT,
  created_by         TEXT REFERENCES users(id) ON DELETE SET NULL,
  is_public          INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS workouts (
  id                TEXT PRIMARY KEY,
  hall_id           TEXT NOT NULL REFERENCES halls(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  name_en           TEXT,
  description       TEXT,
  description_en    TEXT,
  goal              TEXT NOT NULL DEFAULT 'helkrop',
  level             TEXT NOT NULL DEFAULT 'begynder',
  estimated_minutes INTEGER NOT NULL DEFAULT 45,
  is_template       INTEGER NOT NULL DEFAULT 0,
  created_by        TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at        TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS workout_exercises (
  id               TEXT PRIMARY KEY,
  workout_id       TEXT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id      TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  ord              INTEGER NOT NULL DEFAULT 0,
  target_sets      INTEGER NOT NULL DEFAULT 3,
  target_reps_min  INTEGER,
  target_reps_max  INTEGER,
  target_seconds   INTEGER,
  rest_seconds     INTEGER NOT NULL DEFAULT 90,
  progression_mode TEXT NOT NULL DEFAULT 'double',
  notes            TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workout_id  TEXT REFERENCES workouts(id) ON DELETE SET NULL,
  started_at  TEXT NOT NULL,
  ended_at    TEXT,
  mood        INTEGER,
  rpe         INTEGER,
  bodyweight  REAL,
  note        TEXT
);

CREATE TABLE IF NOT EXISTS set_logs (
  id          TEXT PRIMARY KEY,
  session_id  TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  set_index   INTEGER NOT NULL DEFAULT 0,
  weight      REAL,
  reps        INTEGER,
  seconds     INTEGER,
  -- Cardio: a rowing machine measures a set in metres and watts, not kilos.
  distance_m  INTEGER,
  watts       INTEGER,
  is_warmup   INTEGER NOT NULL DEFAULT 0,
  is_pr       INTEGER NOT NULL DEFAULT 0,
  rir         INTEGER,
  logged_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS personal_records (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  value       REAL NOT NULL,
  achieved_at TEXT NOT NULL,
  session_id  TEXT REFERENCES sessions(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS badges (
  id            TEXT PRIMARY KEY,
  slug          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  description   TEXT NOT NULL,
  rune_symbol   TEXT NOT NULL,
  tier          TEXT NOT NULL DEFAULT 'bronze',
  criteria_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS user_badges (
  id        TEXT PRIMARY KEY,
  user_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id  TEXT NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TEXT,
  progress  REAL NOT NULL DEFAULT 0,
  UNIQUE (user_id, badge_id)
);

CREATE TABLE IF NOT EXISTS streaks (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  current_days    INTEGER NOT NULL DEFAULT 0,
  longest_days    INTEGER NOT NULL DEFAULT 0,
  last_trained_on TEXT,
  freeze_tokens   INTEGER NOT NULL DEFAULT 2
);

CREATE TABLE IF NOT EXISTS coach_messages (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL,
  body       TEXT NOT NULL,
  data_json  TEXT,
  created_at TEXT NOT NULL,
  read_at    TEXT
);

CREATE TABLE IF NOT EXISTS reminders (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind          TEXT NOT NULL,
  schedule_cron TEXT NOT NULL,
  channel       TEXT NOT NULL DEFAULT 'push',
  enabled       INTEGER NOT NULL DEFAULT 1,
  last_sent_at  TEXT
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint   TEXT NOT NULL UNIQUE,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS invitations (
  id         TEXT PRIMARY KEY,
  hall_id    TEXT NOT NULL REFERENCES halls(id) ON DELETE CASCADE,
  email      TEXT NOT NULL,
  code       TEXT NOT NULL UNIQUE,
  invited_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'member',
  status     TEXT NOT NULL DEFAULT 'pending',
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS goals (
  id       TEXT PRIMARY KEY,
  user_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type     TEXT NOT NULL,
  target   REAL NOT NULL,
  deadline TEXT,
  progress REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  token      TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS webauthn_challenges (
  id         TEXT PRIMARY KEY,
  key        TEXT NOT NULL,               -- email or userId, per flow
  challenge  TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- Ailments ("skavanker") and wishes ("ønsker") the user has told Mimir about.
-- These persist so every later suggestion respects them, and so a sore
-- shoulder is not forgotten the next time the workout is planned.
CREATE TABLE IF NOT EXISTS user_constraints (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL,               -- 'skavank' | 'oenske'
  body        TEXT NOT NULL,
  -- Optional structured hints extracted from the text (affected area, etc.).
  data_json   TEXT,
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL,
  resolved_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_constraints_user ON user_constraints(user_id, is_active);

CREATE TABLE IF NOT EXISTS magic_tokens (
  token      TEXT PRIMARY KEY,
  email      TEXT NOT NULL,
  purpose    TEXT NOT NULL DEFAULT 'login',  -- 'login' | 'invite'
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at    TEXT
);

CREATE TABLE IF NOT EXISTS audit_log (
  id         TEXT PRIMARY KEY,
  hall_id    TEXT NOT NULL,
  actor_id   TEXT,
  action     TEXT NOT NULL,
  target     TEXT,
  data_json  TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id, started_at);
CREATE INDEX IF NOT EXISTS idx_setlogs_session ON set_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_setlogs_exercise ON set_logs(exercise_id);
CREATE INDEX IF NOT EXISTS idx_we_workout ON workout_exercises(workout_id, ord);
CREATE INDEX IF NOT EXISTS idx_pr_user_ex ON personal_records(user_id, exercise_id);
CREATE INDEX IF NOT EXISTS idx_coach_user ON coach_messages(user_id, created_at);
`;
