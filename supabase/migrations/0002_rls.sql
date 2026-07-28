-- Uruz — Row Level Security.
--
-- The rule the app is built around (spec §2, §10):
--   * A user owns their own training log. Nobody else may read their raw sets.
--   * Shared content (exercises, the hall's workouts, badges) is readable by
--     everyone in the same hall.
--   * Admins may manage their own hall — never another one.
--
-- RLS is enforced by Postgres, so a bug in the application layer cannot leak
-- another member's data. Aggregates for the leaderboard are produced by a
-- security-definer function that deliberately exposes totals only.

-- Helper functions ---------------------------------------------------------

-- The caller's hall. STABLE so Postgres can cache it per statement.
create or replace function current_hall_id()
returns uuid
language sql stable security definer set search_path = public
as $$ select hall_id from users where id = auth.uid() $$;

create or replace function is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$ select exists (
  select 1 from users
  where id = auth.uid() and role = 'admin' and is_active
) $$;

-- Enable RLS everywhere ----------------------------------------------------

alter table halls              enable row level security;
alter table users              enable row level security;
alter table exercises          enable row level security;
alter table workouts           enable row level security;
alter table workout_exercises  enable row level security;
alter table sessions           enable row level security;
alter table set_logs           enable row level security;
alter table personal_records   enable row level security;
alter table badges             enable row level security;
alter table user_badges        enable row level security;
alter table streaks            enable row level security;
alter table goals              enable row level security;
alter table coach_messages     enable row level security;
alter table user_constraints   enable row level security;
alter table reminders          enable row level security;
alter table push_subscriptions enable row level security;
alter table invitations        enable row level security;
alter table audit_log          enable row level security;

-- Halls --------------------------------------------------------------------

create policy "hall readable by members" on halls
  for select using (id = current_hall_id());

create policy "hall editable by admin" on halls
  for update using (id = current_hall_id() and is_admin());

-- Users --------------------------------------------------------------------
-- Everyone in the hall can see who else is in it (names and ranks power
-- Valhalla); only the person themselves — or an admin — can change a row.

create policy "hall members visible" on users
  for select using (hall_id = current_hall_id());

create policy "user updates self" on users
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy "admin manages hall users" on users
  for update using (hall_id = current_hall_id() and is_admin());

-- Exercises ----------------------------------------------------------------
-- The library is shared content: readable by all, writable by admins.

create policy "exercises readable" on exercises
  for select using (is_public or created_by = auth.uid());

create policy "admin writes exercises" on exercises
  for all using (is_admin()) with check (is_admin());

-- Workouts -----------------------------------------------------------------

create policy "hall workouts readable" on workouts
  for select using (hall_id = current_hall_id());

create policy "members create workouts" on workouts
  for insert with check (hall_id = current_hall_id());

-- A member may edit their own workouts; templates are admin-only.
create policy "own or admin workout update" on workouts
  for update using (
    hall_id = current_hall_id()
    and (created_by = auth.uid() or is_admin())
  );

create policy "own or admin workout delete" on workouts
  for delete using (
    hall_id = current_hall_id()
    and (created_by = auth.uid() or is_admin())
  );

create policy "workout exercises follow workout" on workout_exercises
  for all using (
    exists (
      select 1 from workouts w
      where w.id = workout_exercises.workout_id
        and w.hall_id = current_hall_id()
    )
  )
  with check (
    exists (
      select 1 from workouts w
      where w.id = workout_exercises.workout_id
        and w.hall_id = current_hall_id()
    )
  );

-- Training log -------------------------------------------------------------
-- The heart of the privacy model: raw logs are strictly the owner's.

create policy "own sessions" on sessions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own set logs" on set_logs
  for all using (
    exists (select 1 from sessions s where s.id = set_logs.session_id and s.user_id = auth.uid())
  )
  with check (
    exists (select 1 from sessions s where s.id = set_logs.session_id and s.user_id = auth.uid())
  );

create policy "own records" on personal_records
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Gamification -------------------------------------------------------------

create policy "badges readable" on badges for select using (true);

create policy "own user badges" on user_badges
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own streak" on streaks
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own goals" on goals
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Coaching -----------------------------------------------------------------
-- Coach messages and stated ailments are personal; nobody else sees them.

create policy "own coach messages" on coach_messages
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own constraints" on user_constraints
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Notifications ------------------------------------------------------------

create policy "own reminders" on reminders
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own push subscriptions" on push_subscriptions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Invitations & audit ------------------------------------------------------

create policy "admin manages invitations" on invitations
  for all using (hall_id = current_hall_id() and is_admin())
  with check (hall_id = current_hall_id() and is_admin());

create policy "admin reads audit" on audit_log
  for select using (hall_id = current_hall_id() and is_admin());

-- Leaderboard --------------------------------------------------------------
-- Valhalla needs each member's totals without exposing anyone's raw sets.
-- SECURITY DEFINER lets this read past RLS, and it returns aggregates only.
-- A member who has marked their profile private is reduced to attendance.

create or replace function hall_leaderboard()
returns table (
  user_id       uuid,
  display_name  text,
  rank_level    int,
  sessions      bigint,
  volume        numeric,
  is_private    boolean
)
language sql stable security definer set search_path = public
as $$
  select
    u.id,
    u.display_name,
    u.rank_level,
    count(distinct s.id) as sessions,
    case when u.is_private then null
         else coalesce(sum(sl.weight * sl.reps) filter (where not sl.is_warmup), 0)
    end as volume,
    u.is_private
  from users u
  left join sessions s on s.user_id = u.id and s.ended_at is not null
  left join set_logs sl on sl.session_id = s.id
  where u.hall_id = current_hall_id() and u.is_active
  group by u.id, u.display_name, u.rank_level, u.is_private;
$$;

revoke all on function hall_leaderboard() from public;
grant execute on function hall_leaderboard() to authenticated;
