-- Uruz — canonical Postgres schema (Supabase).
--
-- This is the production target. The local development backend
-- (src/lib/db/schema.sqlite.sql) mirrors these tables; the difference is that
-- Postgres also enforces access control in the database itself via Row Level
-- Security (see 0002_rls.sql).
--
-- Apply with:  supabase db push        (or paste into the SQL editor)

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- halls ----
create table if not exists halls (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- users ----
-- `id` matches auth.users.id so RLS can compare against auth.uid() directly.
create table if not exists users (
  id           uuid primary key references auth.users(id) on delete cascade,
  hall_id      uuid not null references halls(id) on delete cascade,
  email        text not null unique,
  display_name text not null,
  role         text not null default 'member' check (role in ('admin','member','coach')),
  rank_level   int  not null default 0,
  avatar       text,
  theme_pref   text not null default 'norse' check (theme_pref in ('norse','plain')),
  mode_pref    text not null default 'dark'  check (mode_pref in ('dark','light')),
  locale_pref  text not null default 'da',
  media_pref   text not null default 'illustration' check (media_pref in ('illustration','photo')),
  difficulty   text not null default 'begynder' check (difficulty in ('begynder','erfaren','pro')),
  coach_tone   text not null default 'soft' check (coach_tone in ('soft','hard')),
  is_private   boolean not null default false,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);
create index if not exists idx_users_hall on users(hall_id);

-- ------------------------------------------------------------ exercises ----
create table if not exists exercises (
  id                    uuid primary key default gen_random_uuid(),
  slug                  text not null unique,
  name_da               text not null,
  name_en               text,
  category              text not null check (category in ('ben','pres','traek','kerne','kondi')),
  primary_muscles       text[] not null default '{}',
  equipment             text not null,
  unit                  text not null default 'kg' check (unit in ('kg','sek','reps','km')),
  is_bodyweight         boolean not null default false,
  instructions_steps    text[] not null default '{}',
  instructions_steps_en text[] not null default '{}',
  cues                  text[] not null default '{}',
  cues_en               text[] not null default '{}',
  safer_variant         text,
  safer_variant_en      text,
  svg_key               text,
  image_url             text,
  difficulty            text not null default 'begynder',
  demo_video_url        text,
  created_by            uuid references users(id) on delete set null,
  is_public             boolean not null default true
);

-- ------------------------------------------------------------- workouts ----
create table if not exists workouts (
  id                uuid primary key default gen_random_uuid(),
  hall_id           uuid not null references halls(id) on delete cascade,
  name              text not null,
  name_en           text,
  description       text,
  description_en    text,
  goal              text not null default 'helkrop',
  level             text not null default 'begynder',
  estimated_minutes int not null default 45,
  is_template       boolean not null default false,
  created_by        uuid references users(id) on delete set null,
  created_at        timestamptz not null default now()
);
create index if not exists idx_workouts_hall on workouts(hall_id);

create table if not exists workout_exercises (
  id               uuid primary key default gen_random_uuid(),
  workout_id       uuid not null references workouts(id) on delete cascade,
  exercise_id      uuid not null references exercises(id) on delete cascade,
  ord              int not null default 0,
  target_sets      int not null default 3,
  target_reps_min  int,
  target_reps_max  int,
  target_seconds   int,
  rest_seconds     int not null default 90,
  progression_mode text not null default 'double' check (progression_mode in ('double','linear','rir','none')),
  notes            text
);
create index if not exists idx_we_workout on workout_exercises(workout_id, ord);

-- ------------------------------------------------------- training log ------
create table if not exists sessions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  workout_id uuid references workouts(id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at   timestamptz,
  mood       int check (mood between 1 and 5),
  rpe        int check (rpe between 1 and 10),
  bodyweight numeric(5,2),
  note       text
);
create index if not exists idx_sessions_user on sessions(user_id, started_at desc);

create table if not exists set_logs (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references sessions(id) on delete cascade,
  exercise_id uuid not null references exercises(id) on delete cascade,
  set_index   int not null default 0,
  weight      numeric(6,2),
  reps        int,
  seconds     int,
  is_warmup   boolean not null default false,
  is_pr       boolean not null default false,
  rir         int,
  logged_at   timestamptz not null default now()
);
create index if not exists idx_setlogs_session on set_logs(session_id);
create index if not exists idx_setlogs_exercise on set_logs(exercise_id);

create table if not exists personal_records (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  exercise_id uuid not null references exercises(id) on delete cascade,
  type        text not null check (type in ('1rm_est','max_weight','max_reps','max_volume','max_hold')),
  value       numeric(10,2) not null,
  achieved_at timestamptz not null default now(),
  session_id  uuid references sessions(id) on delete set null
);
create index if not exists idx_pr_user_ex on personal_records(user_id, exercise_id);

-- ----------------------------------------------------------- gamification --
create table if not exists badges (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  name          text not null,
  description   text not null,
  rune_symbol   text not null,
  tier          text not null default 'bronze' check (tier in ('bronze','soelv','guld')),
  criteria_json jsonb not null default '{}'
);

create table if not exists user_badges (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references users(id) on delete cascade,
  badge_id  uuid not null references badges(id) on delete cascade,
  earned_at timestamptz,
  progress  numeric(4,3) not null default 0,
  unique (user_id, badge_id)
);

create table if not exists streaks (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null unique references users(id) on delete cascade,
  current_days    int not null default 0,
  longest_days    int not null default 0,
  last_trained_on date,
  freeze_tokens   int not null default 2
);

create table if not exists goals (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid not null references users(id) on delete cascade,
  type     text not null,
  target   numeric(10,2) not null,
  deadline date,
  progress numeric(5,4) not null default 0
);

-- ------------------------------------------------------------- coaching ----
create table if not exists coach_messages (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  kind       text not null check (kind in ('ros','ris','forslag','opsummering','reminder')),
  body       text not null,
  data_json  jsonb,
  created_at timestamptz not null default now(),
  read_at    timestamptz
);
create index if not exists idx_coach_user on coach_messages(user_id, created_at desc);

-- Ailments and wishes Kvasir must respect in every later suggestion.
create table if not exists user_constraints (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  kind        text not null check (kind in ('skavank','oenske')),
  body        text not null,
  data_json   jsonb,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists idx_constraints_user on user_constraints(user_id, is_active);

-- -------------------------------------------------------- notifications ----
create table if not exists reminders (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users(id) on delete cascade,
  kind          text not null,
  schedule_cron text not null,
  channel       text not null default 'push' check (channel in ('push','email')),
  enabled       boolean not null default true,
  last_sent_at  timestamptz
);

create table if not exists push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------- invites -----
create table if not exists invitations (
  id         uuid primary key default gen_random_uuid(),
  hall_id    uuid not null references halls(id) on delete cascade,
  email      text not null,
  code       text not null unique,
  invited_by uuid not null references users(id) on delete cascade,
  role       text not null default 'member',
  status     text not null default 'pending' check (status in ('pending','accepted','revoked')),
  expires_at timestamptz not null
);

-- --------------------------------------------------------------- audit -----
create table if not exists audit_log (
  id         uuid primary key default gen_random_uuid(),
  hall_id    uuid not null references halls(id) on delete cascade,
  actor_id   uuid references users(id) on delete set null,
  action     text not null,
  target     text,
  data_json  jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_audit_hall on audit_log(hall_id, created_at desc);
