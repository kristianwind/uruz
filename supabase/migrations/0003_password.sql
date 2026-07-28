-- Password login as a fallback for people who cannot use a passkey.
--
-- The hash is scrypt, produced and verified by src/lib/auth/password.ts, in the
-- stored form `scrypt$N$r$p$<salt-b64>$<hash-b64>`. No row means the user has
-- no password and can only sign in with a passkey or a magic link.
--
-- Deliberately a table of its own rather than a column on `users`: the
-- "hall members visible" policy in 0002_rls.sql lets every member SELECT every
-- other member's user row, which a password hash has no business being part of.
-- This table enables RLS and defines *no* policies, so it is unreachable from
-- anon and authenticated no matter what — only the service role, i.e. the
-- server, can read or write it. That is exactly the intended reach.

create table if not exists user_passwords (
  user_id    uuid primary key references users(id) on delete cascade,
  hash       text not null,
  updated_at timestamptz not null default now()
);

alter table user_passwords enable row level security;

-- No policies: RLS with none denies everything for anon/authenticated.
-- Revoke the blanket grants Supabase hands those roles as well, so a future
-- policy added by accident cannot expose the table on its own.
revoke all on table user_passwords from anon, authenticated;
