# Architecture

How Uruz fits together, and why it is put together that way.
Decisions with rationale live in [DECISIONS.md](DECISIONS.md).

---

## The short overview

```
┌─────────────────────────────────────────────────────────────┐
│  UI  (React Server + Client Components)                     │
│  src/app/**            pages and API routes                 │
│  src/components/**     components, no domain logic          │
└───────────────┬─────────────────────────────────────────────┘
                │  only calls into /lib
┌───────────────▼─────────────────────────────────────────────┐
│  DOMAIN  (pure functions — no I/O, fully tested)            │
│  strength.ts   1RM, PR detection, progression               │
│  stats.ts      all statistics                               │
│  gamification  badges, rank, milestones, leaderboard        │
│  coach/        insights, Kvasir, workout adaptation          │
└───────────────┬─────────────────────────────────────────────┘
                │
┌───────────────▼─────────────┐   ┌──────────────────────────┐
│  DATA  src/lib/db           │   │  SERVICES                │
│  repo/*  repositories       │   │  ai/provider   (LLM)     │
│  one surface, two backends: │   │  notify/push   (VAPID)   │
│   • node:sqlite  (local)    │   │  notify/email  (Resend)  │
│   • Supabase/Postgres + RLS │   │  auth/         (passkeys)│
└─────────────────────────────┘   └──────────────────────────┘
```

The load-bearing rule: **the UI does not know the database, and the domain does not know the UI.**
Everything that can be computed is computed in pure functions that can be
unit-tested without starting either a browser or a database.

---

## The layers

### 1. The domain — `src/lib/domain`, `src/lib/coach`

Pure functions. No `fetch`, no database, no React.

| File | Responsibility |
|---|---|
| `types.ts` | The data model. One truth about the shape of everything. |
| `strength.ts` | Estimated 1RM (Epley), volume, PR detection, the three progression models. |
| `stats.ts` | All statistics: weeks, tonnage, attendance, muscle balance, streaks, fun units. |
| `gamification.ts` | Badge evaluation, rank points, milestones, leaderboard sorting. |
| `coach/insights.ts` | Rule-based training insights (plateau, imbalance, neglected exercise, deload, pain). |
| `coach/adapt.ts` | Translates an ailment/a wish into concrete, validated changes. |

Because they are pure, every number the user sees is covered by a test. That is
also why Uruz can coach **entirely without AI**: the insights are code, not
prompt.

### 2. Data — `src/lib/db`

A repository layer. The rest of the app imports from `@/lib/db` and never sees a
database driver.

- **Locally:** Node's built-in `node:sqlite`. Zero setup — which is why
  `npm run dev` works without accounts or keys.
- **Production:** Supabase/Postgres with **Row Level Security**
  (`supabase/migrations/0002_rls.sql`). Access control lives in the database, so
  a bug in the app code cannot leak someone else's training log.

The leaderboard in Postgres is a `security definer` function that returns
**only** aggregates. A private profile still takes part in the contest without
sharing raw data.

### 3. Services

| Module | Notes |
|---|---|
| `ai/provider.ts` | One `chat()` across Anthropic, OpenAI, Google, Ollama and any OpenAI-compatible server. Written with `fetch` rather than SDKs, so a key-free model on your own network is a first-class case. Handles reasoning models. |
| `auth/` | Opaque server sessions in an httpOnly cookie. Passkeys via `@simplewebauthn`, magic link as fallback. Sits behind a single surface, so Supabase Auth can take its place. |
| `notify/` | Web Push (VAPID) with email as fallback, and the ravens' text banks. |
| `offline/` | IndexedDB queue + sync. |
| `i18n/` | `core.ts` (shared), `server.ts` (server), `I18nProvider` (client). |

---

## How a set flows through the system

This is the app's most important path, so it is worth following:

```
The user taps "Log set"
   │
   ├─→ The UI shows the set IMMEDIATELY (optimistic)
   │
   ├─→ The set gets a uuid in the browser  ← makes replay idempotent
   │
   ├─→ Placed in the IndexedDB queue       ← survives reload and airplane mode
   │
   └─→ The queue drains against /api/sessions/log-set
          │
          ├─→ The server rejects duplicates on id
          ├─→ PR detection in the same call  ← the rules live in one place
          └─→ Records are saved
```

If there is no network, the set stays in the queue and is sent by itself once
the connection is back. Order is preserved: the queue stops at the first
network error rather than skipping ahead.

---

## Kvasir

```
The user's message ─┐
Their own data ─────┼─→ anonymized summary ─→ model ─→ validated reply
Ailments/wishes ────┘                                          │
                                                               ▼
                                                suggestions the user approves
```

Three rules that are not up for negotiation:

1. **Only anonymized aggregates** leave the server. The model sees numbers and
   exercise names — never a name, an email or ids.
2. **The model does not invent exercises.** It picks from a list of ids, and
   every id is validated against the library afterwards.
3. **If the model fails, the app keeps coaching** on the rule-based insights.
   A model outage never costs the user their coaching.

---

## Ready for Yggdrasil Panel

Uruz is built so it can later hang under a larger panel:

- **Path:** set `NEXT_PUBLIC_BASE_PATH=/uruz` and the whole app moves.
- **Auth:** all session handling goes through `src/lib/auth/session.ts`. If the
  panel is to supply the identity, that is the one file to swap.
- **Data:** everything hangs on `hall_id`, so several groups can live in the
  same installation without seeing each other — RLS already enforces it.
- **The domain is UI-free**, so statistics and coaching can be reused in a
  panel widget without dragging React components along.

---

## Tests

```bash
npm test
```

104 tests, all on pure logic:

| File | Covers |
|---|---|
| `strength.test.ts` | 1RM, volume, PR rules, all three progression models |
| `stats.test.ts` | Week boundaries, streaks, consistency, balance, fun units |
| `logging.test.ts` | The whole logging path against a real database, incl. idempotent replay |
| `gamification.test.ts` | Badge criteria, rank, milestones, leaderboard |
| `adapt.test.ts` | Pain recognition, safe alternatives, applying suggestions |

The tests run against a temporary SQLite file, so they are fast and never touch
real data.

---

## Folder structure

```
src/
  app/
    (app)/          the app behind login (train, stats, valhal, me, admin …)
    api/            API routes (log, coach, push, cron, export)
    login/ welcome/ invite/    public pages
  components/
    app/ auth/ train/ library/ stats/ valhal/ coach/ admin/ exercise/ ui/
  lib/
    domain/  db/  coach/  ai/  auth/  notify/  offline/  i18n/
locales/          da.json, en.json
supabase/migrations/   production schema + RLS
scripts/          setup, seed, demo history, icons, VAPID
tests/            unit and integration tests
```
