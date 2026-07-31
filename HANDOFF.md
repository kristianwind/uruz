# Handoff — Uruz ᚢ

Status and handover notes, written 30 July 2026, updated 31 July (built-in
scheduler, translations, archive verified, admin can delete members, passkeys
can be replaced — and Face ID finally seen working on a real iPhone).
For yourself in three months, or for the next person who touches the project.

The previous edition was from 28 July. Twenty commits have happened since, and some of
it changes **where things run** — read the section on the hosts first, even if
you skip the rest.

---

## What it is

A training app (PWA) for iPhone and web. Lightning-fast set logging that works without
internet, honest statistics, an AI coach (Mimir) that can adapt training to
injuries and niggles, and a gamification layer in Norse dress.

Runs as a **Rune** in Yggdrasil Panel. Free software under **AGPL-3.0**.

| | |
|---|---|
| **Code** | https://github.com/kristianwind/uruz (public) |
| **Image** | `ghcr.io/kristianwind/uruz:latest` (multi-arch) |
| **App in production** | https://uruz.yggdrasilpanel.com |
| **Website** | https://uruz-training.com — English front page, Danish at `/da.html` |
| **Tests** | 179, all green |
| **Default language** | English. The individual's choice always wins. |

---

## ⚠️ The hosts — what has cost the most

**The two things no longer run on the same machine.**

| What | Host | Server id | Port |
|---|---|---|---|
| **uruz-training.com** | `100.80.130.8` (`kw01`) | `994bd145-1418-4f2c-bb14-ca19dbf3d10c` | 25023 |
| **The Uruz app** | `100.92.81.54` (`.164`) | `0b0bf9c4-80a1-418e-8df5-bb19788be31d` | 25012 |

The site moved on **29 July**. The old container on `.164` (`ygg-66e5a45d`) sits
stopped with its old files still in the data directory.

**If you deploy to the old host, it succeeds.** Every step answers 200, the files
land with the right owner — and none of it becomes visible anywhere. That happened
three times in one evening before anyone noticed.

**Why it wasn't noticed:** Cloudflare served the front page from cache, so
it answered 200 the whole time. It was only a *new* path — `/docs/…` — that revealed
it, because there was nothing cached to fall back on.

> **Always verify against origin, never only through Cloudflare.** A cached response
> from a stopped container looks exactly like a healthy server.

The full deploy recipe is in `CLAUDE.md` and has been corrected.

---

## What has happened since last time

**Login has gained two new ways in.** Password (scrypt, rate-limited, requires the
old one when changing) and login link by e-mail, which now works properly. Passkeys can
be named, viewed with "last used", and deleted — but deletion requires
re-authentication and refuses to remove your last way in.

**E-mail works.** SMTP2GO on `mail-eu.smtp2go.com:2525`. Verified by
sending a real login link: the log got zero new lines, which is what a
successful send looks like — the app only writes when it *cannot* send.

**English is the default language**, including page titles, manifest and descriptions.
E-mails, however, follow the recipient's own choice, not the default — a page in English
before anyone has said otherwise is a reasonable guess, a mail to a named person is
not.

**The app uses the screen on desktop and iPad.** Sidebar from 768 px, content in
columns, exercise queue next to the logging screen. The phone is verified unchanged
— eight screens photographed before and after, zero deviating pixels.

**The first real workout revealed four things**, all fixed: the weight moves
0.5 at a time (hold the button to repeat), the set row has gained a pencil icon
so you can see it can be edited, a workout is shown before it is started, and there is now
an archive of past workouts where sets can be edited and whole workouts deleted.

**Documentation.** Two user guides in `docs/guides/`, published on
uruz-training.com/docs by `npm run gen:docs`. The README is English with the Danish
preserved as `README.da.md`.

---

## What is verified — and what is not

### Verified against reality

- **A real workout at the gym.** Kristian trained on 30 July. It was the
  most important missing test, and it revealed four bugs that are now fixed.
- **Four users are on.** The invitation flow has been tried by people other than the one
  who built it.
- **E-mail goes out** through SMTP2GO, measured against the running server.
- **Passkey deletion** in all four cases: 409 on the last key with no other way
  in, 403 on wrong password, 404 on unknown id, 200 with the key actually gone.
- **Database migrations** — `name` and `last_used_at` were added to an
  existing database at startup, seen with own eyes.
- **The SMTP code** against a real SMTP conversation, not a mock.
- **Anchors in the documentation** against `api.github.com/markdown/raw`.
- **The archive in a browser.** List and detail render on desktop and phone
  widths. An edit was made through the UI, seen in the SQLite database, seen
  again after a reload, and reverted the same way. (The floating circle that
  overlaps the bottom nav in dev is Next's own dev-tools button — it does not
  exist in production.)
- **Face ID on a physical iPhone — it works.** 31 July: a passkey named
  "iPhone" was registered on the running server at 05:08:54Z, and its
  `last_used_at` reads 05:09:21Z — signed out and back in with the key,
  twenty-seven seconds later. This was the oldest unverified item in the
  project.
- **The built-in scheduler runs in production.** The log says
  `scheduler: built-in, every 15 min` at boot, and a tick has since reported
  `sent 0 notification(s), ran 3 weekly analysis/analyses` — Mimir's weekly
  analyses ran on their own, with nothing external calling anything.

### Not verified

- **Web push on iOS.** Requires the app on the home screen. Never seen a notification
  land.
- **The Supabase backend.** Schema and RLS are written, but **the adapter does not exist**
  — `DATA_BACKEND` does not appear in the code. The app runs only on SQLite.

---

## 🚧 What's next

**Nothing is waiting to be deployed.** Everything through 31 July is out and
running. Two ways things go live: the panel's global **Update schedule at
05:30** reinstalls every running server with the latest image on its own, and
Servers → Uruz → Restart in the panel does it now. A `docker restart` does
neither — it reuses the image it already has.

**Reminders send by themselves now.** `instrumentation.ts` ticks the same
idempotent work as `/api/cron` every quarter of an hour in production — no
`CRON_SECRET`, no external schedule, nothing to configure. `CRON_SECRET` is
only for driving it externally; `URUZ_SCHEDULER=0` turns the built-in one off.
Verified in production, see above.

**Two dead passkeys are still on the account.** Both unnamed, created 28 July,
`last_used_at` never — the ones that could not be removed before. With a
working key on the account now, they delete like anything else: **Me**, remove,
straight after a sign-in. Worth doing, so the list only holds keys that work.

**Translation: done.** `DECISIONS.md`, `HANDOFF.md` and `ARCHITECTURE.md` are
English, with the Danish originals preserved as `*.da.md` snapshots — the
English files are the maintained ones.

**Level 2** — hosted edition. The plan is in `docs/COMMERCIAL.md` and is not
decided. The first technical step is multiple gyms per installation: only six
files assume there is one (`getAnyHall()`). The license, which was the most
pressing part, is in place.

**Kvasir.** Kristian has asked whether Mimir should be renamed. The case has been argued
against: Kvasir is already Yggdrasil's AI assistant — 28 files and its own guide —
and two projects on the same machine, each with its own assistant of the same name, gets
confusing. Not settled.

---

## Known warts

- **`Startprogram.html` never existed.** The exercise content is written from
  the description in section 15 of the specification.
- **The arm64 build is flaky.** SWC crashes sporadically under QEMU. The workflow is
  split, so amd64 always gets published.
- **Five other servers on `.164` sit stopped.** Whether they should be running, only
  Kristian knows.
- **The Mac runs out of memory.** A production build took 17.6 minutes instead
  of ten seconds, and vitest's eleven worker processes made two tests
  fail on timeout — they run green in 241 ms alone.
  `npx vitest run --no-file-parallelism` works.

---

## Things that are easy to get wrong

| Trap | What happens |
|---|---|
| **Deploying the site to `.164`** | Succeeds, answers 200, changes nothing. The site lives on `100.80.130.8`. |
| **Verifying only through Cloudflare** | A stopped container looks healthy for hours. Ask origin. |
| Forgetting to bump `?v=` on CSS | Cloudflare holds stylesheets for four hours: new build, old look. |
| `docker restart` to update | Reuses the same image. Looks like a successful update, pulls nothing. |
| `next build` while the dev server is running | Both write `.next`. Use `npm run build:check`. |
| Seed scripts while the dev server is running | SQLite lock. |
| Adding a column to a table that exists | `CREATE TABLE IF NOT EXISTS` skips it. The column must go in `ADDED_COLUMNS` in `sqlite.ts` **and** in the schema. |
| `requireContext()` in an API route | It throws, and a thrown error becomes a 500. Use `getContext()` and return 401. |
| Editing `website/docs/` | Generated by `npm run gen:docs`. Fix the markdown. |
| Relative paths from `/docs/` | `href="docs.css"` becomes `/docs/docs.css`. The file lives in the root. |
| Trusting a green test without counting | A comparison over zero elements is always green. Check that anything was measured at all. |
| Measuring in the browser pane without looking | The viewport can be zero, and then every measurement is nonsense. Take a screenshot. |

All are documented with reasoning in `DECISIONS.md`.

---

## Operations

**Update the app:** push to `main` → GitHub Actions builds → restart the server
**Uruz** in Yggdrasil on `.164`. A restart pulls the new image; a
`docker restart` does not.

**Update the site:** `npm run gen:docs`, then tar/scp/extract on `100.80.130.8`.
The files are live immediately — nginx serves straight from the data directory. Full
recipe in `CLAUDE.md`.

**Backup:** `/data` in its entirety, not only `.sqlite` — the WAL can hold the latest
writes.

**After a UI change** the phone may show the old version: the service worker
caches the app shell. Delete the app from the home screen and add it again.

---

## If something is wrong

| Symptom | Look here |
|---|---|
| The site shows old content | Did you deploy to the right host? Is the container up? Is the CSS version bumped? |
| Passkey fails | **Me → Admin → Passkey setup** |
| Mail doesn't arrive | **Me → Admin** shows which path is used. Check that `EMAIL_FROM` is a sender you own |
| Reminders don't arrive | The startup log should say `scheduler: built-in, every 15 min`. If it was disabled (`URUZ_SCHEDULER=0`), is anything calling `/api/cron`? |
| The container won't start | `curl https://uruz.yggdrasilpanel.com/api/health` — it touches the database |
| Old screens on the phone | Service worker cache. Reinstall from the home screen. |

---

## Conventions

- **User-facing text exists in both languages**, in `/locales/`. Never hardcoded —
  not even page titles and e-mails. **English is the default.**
- **Code comments are in English**, and explain *why*, not *what*.
- **Domain logic belongs in `/lib`**, not in components.
- **Every non-obvious decision is written down in `DECISIONS.md`** with reasoning.
- Tests cover pure logic. UI is verified in the browser — and a screenshot is
  more trustworthy than a measurement.
