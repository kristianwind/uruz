# Decisions (DECISIONS)

A running log of non-obvious choices and assumptions made while building
Uruz, per the instruction in section 0 ("note the assumption in `DECISIONS.md`").
Newest first within each phase.

## Addition — every exercise gets the numbers it actually has

- **The record celebration was asking before the set had been saved.** Only the
  first set of an exercise ever got "New record", however much heavier the
  later ones were. The rule itself was never wrong — a test that logs three
  increasing sets proves all three are recorded — but `push()` in the offline
  queue awaited only the *IndexedDB* write and fired the network send with
  `void flush()`. The PR check then asked the server about a set still sitting
  in the queue, and `/api/sessions/pr-check` answered `pending: true`, which
  the client read as "no record". Whether a celebration appeared came down to
  whether an earlier flush happened to be in flight. `push()` now awaits the
  send. This costs nothing on screen — the optimistic update has already
  painted the set, and offline the flush returns immediately. **The general
  shape of the bug: an await that looks like it covers the work, but stops one
  step short of it.**

- **Cardio is metres and watts, not kilos and repetitions.** A rowing machine
  is `unit: "km"`, and the logging screen branched only on *timed* vs
  *everything else* — so it asked for kilos and reps, and the set it produced
  described nothing that happened. Rowing and cycling now log distance, watts
  and time (`distance_m`, `watts` on `set_logs`), and both can set a record:
  further and harder are achievements that weight × reps cannot express.

- **Held sets are timed, not remembered.** A plank ended with typing the
  seconds afterwards, which is guessing — nobody counts accurately while
  shaking. A stopwatch times the set as it happens and drops the reading into
  the field, which stays editable for the times you did count. It is anchored
  on a timestamp rather than a counter, so a phone that sleeps mid-plank still
  reports the real elapsed time.

- **An exercise can be added to a workout while training it.** A plan meets a
  gym where a machine is taken, and previously only free training could pick
  from the library. The same picker now serves both. Added exercises live in
  the screen's state and are never written back to the template: the day's
  substitution is not a change to the plan, and a set records its own exercise
  id, so nothing needs to be. They carry no prescription either, so the screen
  counts their sets rather than measuring them against a target nobody chose.

- **Remembering your last numbers now covers exercises the template never
  listed.** The prefill was built per template row, so free training — and
  anything added mid-session — opened on defaults, having forgotten everything
  you had ever done. The library itself now carries each exercise's last
  weight, reps, seconds, distance and watts.

## Addition — a scheduler must ask what it already sent

- **Sixty-nine e-mails in a day, to a real person.** A hall member's last
  completed session was exactly seven days old, and the nudge path guarded
  itself with `days % 7 !== 0` — which reads like "once a week" but is constant
  for a whole day. On day seven it let *every* fifteen-minute tick through
  instead of closing all but one. Nothing else stood in the way: unlike the
  reminder path, which stamps `last_sent_at`, the nudge path stored no record
  of having fired.

- **The guard is now what was actually sent, not what the calendar implies.**
  It asks the stored coach message (`latestCoachMessage(userId, "ris")`) and
  skips if one landed within 36 hours. The database is the only thing that can
  answer "have I already done this?" for a job that runs every quarter of an
  hour in a process that may have restarted since — in-memory state and
  derived-from-today's-date arithmetic both fail that test. 36 hours is
  deliberately longer than a day, so two ticks either side of midnight cannot
  slip through, and shorter than the week between two nudge-eligible days.

- **The rule this leaves behind:** *anything that sends to a human must be
  guarded by a record of the send, not by a condition that happens to be true
  only briefly.* A time-derived condition is a coincidence, not a lock.

- **It took a person to notice, because nothing else was watching.** The
  workflow builds the image but runs no tests, so the 184 existing tests only
  run when someone runs them. The regression test written here (eight ticks
  must produce one nudge) would have caught this — if anything had executed it.
  Worth fixing next.

## Addition — sets are the unit, and weight is never hidden

- **A workout is sets × reps, and the screen now says so.** The target line
  read "Target: 12–20 reps" and never mentioned that the workout wanted three
  of them; `targetSets` reached the logging screen and was used for nothing.
  So one logged set looked like a finished exercise. It now reads "Target: 3
  sets × 12–20 reps", with a live "Set 2 of 3" above the log button. Warm-ups
  do not count towards it — three working sets means three real ones. Free
  training has no prescription, so there it simply counts ("Set 2") rather
  than inventing a target to measure you against.

- **The weight control is shown for bodyweight exercises too.** It was hidden
  for anything flagged `is_bodyweight`, but the save path branched only on
  *timed*, so the working weight was submitted anyway — a crunch logged 41 kg
  that nobody could see or change, and with no history it would have logged
  the seed default of 20. Two ways to fix it, and the deciding fact came from
  the person using it: he does crunches **on a machine**. So the weight is
  real, and hiding the field was the error, not storing the number. The field
  is now always shown (0 = no load), and the seed for a bodyweight exercise is
  0 rather than 20. The rule this leaves behind: **never store a value the
  screen does not show.** A hidden field is not a simplification, it is a
  number nobody chose.

## Addition — what the first team of users hit

- **An admin can now delete a member — with the member's name typed out.**
  The feature simply did not exist: only deactivate and role change did, and
  the sole deletion path was deleting *yourself* under Me. Deleting a member
  erases their whole training history, so it borrows the self-deletion's
  speed bump (type the display name) rather than a yes/no dialog — an admin
  page must not be a place where a mis-tap can erase a person. Your own row
  shows no delete button: deleting yourself belongs to the Me flow, which
  also signs you out properly. The audit entry is written *before* the row
  goes, because afterwards there is no row to attribute it to.

- **A freshly opened session counts as proof of presence.** Removing a passkey
  demanded the account password or a live assertion from another key. An
  account with no password whose only passkey is broken could satisfy
  neither — the dead key was undeletable, and `excludeCredentials` then also
  blocked registering a replacement on the same device. The way out: a
  session opened within the last ten minutes now counts as re-authentication
  by itself (the GitHub "sudo mode" model). Sign in with an e-mail link,
  remove the key straight away. The bench-phone threat this rule guards
  against is an *old* session; a minutes-old one proves someone just came
  through the front door. Two side effects, both deliberate: an account
  *with* a password may now also re-authenticate with a key (a key is no
  weaker than a password), and a bare probe with no proof attached no longer
  spends rate-limit budget — it guesses at nothing, so it must not lock out
  the person about to type their real password.

## Addition — the ravens fly by themselves

- **The scheduler lives in the app, not in the host.** Reminders never fired
  because nothing called `/api/cron` — the endpoint sat finished for days
  waiting for a cron job nobody had set up, and every future installation
  would inherit the same silent gap. Now `instrumentation.ts` ticks the same
  idempotent work every 15 minutes in production: a plain `docker run` of the
  image gets working reminders with zero configuration. `/api/cron` stays for
  hosts that prefer an external driver (idempotency makes both at once
  harmless), and `URUZ_SCHEDULER=0` hands the job over entirely. In
  development the scheduler is off unless `URUZ_SCHEDULER=1` — a dev database
  full of seeded users must not mail real people by accident.

- **The instrumentation hook keeps the exact shape the compiler recognises.**
  A first version did its guards inline and imported through the `@/` alias —
  Next then resolved the scheduler's import chain (web-push → `node:http`)
  for the edge bundle too, and the dev server failed to boot. The fix is the
  documented pattern verbatim: `if (process.env.NEXT_RUNTIME === "nodejs")`
  wrapping a *relative* dynamic import, which the edge pass eliminates.
  Deviating from that shape is what broke it.

- **`getLocale()` no longer assumes a request.** It read the locale cookie
  unconditionally, and `cookies()` throws outside a request scope — so the
  first scheduler tick for a user without a saved language preference would
  have crashed. Outside a request there is no cookie to consult; the default
  locale is the honest answer, so that is what it returns.

- **English documentation, Danish snapshots.** `DECISIONS.md`, `HANDOFF.md`
  and `ARCHITECTURE.md` follow the README's pattern: English is the
  maintained text, the Danish originals are preserved as `*.da.md` and say
  so at the top. Maintaining both languages of a living document is double
  bookkeeping nobody will do.

## Addition — what the first real training session revealed

Found by using the app in a gym, not by reading the code.

- **The weight steps by 0.5, not 2.5.** One step was one plate, which cannot
  express what the machines actually sit at: they land on halves, and on stacks
  with entirely different increments. A number you cannot enter is a number that
  gets logged wrong. **Hold the button to repeat**, faster the longer you hold —
  otherwise 20 to 60 would be eighty taps. The field can still be typed into
  directly.

- **The set row could always be edited and deleted — it just didn't look like it.**
  The feature existed; there was no hint that the row could be tapped, and so the
  first person to use the app for real could not correct a mislogged set.
  A pencil icon was the entire difference. Worth remembering: a feature without a
  visible way in does not exist.

- **A workout must be viewable before it is started.** The Train page linked
  directly to `/train/start`, which creates a session immediately. So you could
  not look at what a workout contained without having started it — and could not
  back out. The link now goes to the workout page, where the contents are shown,
  and where Start, Duplicate and Edit already lived. The back arrow follows where
  you came from.

- **The archive was missing entirely.** The numbers were summed into statistics
  and never shown as themselves, so a wrongly logged workout stayed wrong — there
  was no screen to find it on again. `/train/history` shows them, and each one
  can be corrected with the same set rows as the live screen. One behavior, one
  place to get it right.

- **Rotation lock is impossible on iPhone, and the app now says so.**
  The manifest requests portrait (Android honors it), and `screen.orientation.lock()`
  exists in Chromium but rejects with `NotSupportedError` outside an installed
  app — measured, not assumed. iOS Safari has neither. The toggle is only shown
  where it works; otherwise the text says where the iPhone's own lock button is.
  A toggle that does nothing teaches people to distrust the app.

## Addition — delete your passkey

Built after Yggdrasil's solution, as Kristian requested — but with three of its
holes closed. The Yggdrasil session itself pointed to them as bugs, not as
differences.

- **Deletion requires saying who you are again.** Yggdrasil settles for a live
  session and a confirmation dialog in the browser, which is cosmetics. An
  unlocked phone on a bench must not be the way to remove the owner's keys — the
  same reasoning as a password change requiring the old password. If there is a
  password, it is asked for; if there is not, a fresh passkey assertion is
  required.

- **The last way in cannot be removed.** Yggdrasil has no such guard, and that
  is defensible *there*, because all users have a password and passkeys are an
  add-on. Uruz cannot assume that. The rule lives in `credential-removal.ts` as
  a pure function with six tests: the last key may only go if there is a
  password **or** a mail server that can actually send.

- **"We can always email you" is false without a mail server.** Without SMTP or
  Resend, the login link is only written to the server's log, which is not a way
  in for someone who is locked out. Therefore email only counts when
  `emailProvider()` is not `dev`. Yggdrasil has exactly that trap in its
  forgot-password feature.

- **The sessions are closed.** If you remove a key because the device is gone,
  it is pointless if the device's session lives on. We do not track which
  session came from which key, so all are closed and the current one is issued
  again.

- **The rejection comes before the challenge.** At first the order was reversed,
  so you could get as far as confirming yourself and *then* be told it was your
  only key. The guard reveals nothing a logged-in owner does not already know
  about their own account, so it belongs first.

- **Ownership lives in the WHERE clause**, not in a lookup followed by a check —
  then there is no gap in between, and a foreign id simply hits zero rows. And
  `deleteCredential` returns whether anything actually disappeared, so an
  unknown id gives a 404 rather than a 200 that lies.

- **Keys have names.** Without them the list is three identical rows, and no one
  dares remove any of them. The name is asked for at creation, and `last_used_at`
  is set where the counter is already updated — it is the same moment.

## Addition — English as the default language

- **English is what a stranger will most likely read.** The app was written in
  Danish for two people and is now public. Someone arriving without a saved
  choice gets English; someone who has chosen keeps their choice. Only the
  column's default value is changed — not existing rows, because that would
  switch the language out from under the two people who have used the app in
  Danish all along.

- **Emails follow the recipient, not the default.** A page showing English
  before anyone has said otherwise is a reasonable guess. Writing to a named
  person in a language they have not chosen is not. Login and reset emails look
  up the user's `locale_pref` from the email address. Invitations go to someone
  without an account, so there is no choice to follow — they are sent in the
  sender's language, which is the best guess at a shared one.

- **The page titles were seventeen Danish strings.** They are invisible in the
  app itself, but the browser tab, the history and the name of a home-screen
  bookmark come from them. They are now `generateMetadata` with a key, so they
  follow the same language as the page.

- **Two sets of screenshots.** The Danish landing page must not show English
  screens, and the README — public and English-facing — must not show Danish
  ones. The script takes a language and sets the demo user's `locale_pref`,
  because the app follows the logged-in user's choice. `npm run gen:screenshots`
  and `…:da`.

## Addition — the app on a screen you do not hold in your hand

- **The bottom bar is the answer to thumbs, not to screens.** On a phone, the
  bottom third is what you can reach; on a desktop, a bar stuck to the bottom of
  a tall window is stranded far from everything else. From 768 px the same
  destinations move to a rail on the left side. Below 768 px nothing happens.

- **The boundary is at 768 px, i.e. iPad in portrait.** One can argue that a
  tablet in the hand is still "mobile", but that is also where the content
  becomes wide enough that the bottom bar looks abandoned.

- **The width is not set entirely free.** The content gets a ceiling of 1152 px.
  A line of text at 1500 px is harder to read than one at 400. Pages that want
  more space get it by splitting into columns — not by stretching.

- **The cards flow in two columns rather than sitting in a grid.** A grid
  leaves a hole under the short card until the tall one next to it ends.
  Flowing columns (`columns-2` with `break-inside-avoid`) simply fill up. The
  cost is that the reading order becomes column by column, which is acceptable
  for a reference view like statistics and admin.

- **The logging screen keeps its vertical flow — but the guide moved out to the
  side.** Weight, reps and "Log set" are tuned to be hit without looking, and
  they must stay where the thumb looks for them. With the instructions above,
  they pushed the button down; from 1024 px they sit in a column beside it
  instead. Measured: the button sits at the top of its column, no matter how
  long the guide is.

- **The exercise queue only exists when there is room for it.** On the phone,
  the progress bars at the top are the entire overview, and that is the right
  trade when every pixel sits between a thumb and a number. On a wide screen
  there is no trade: the list can simply stand there and show what is done,
  what remains, and let you jump straight to an exercise.

- **The phone is verified unchanged, not assumed unchanged.** Eight screens
  photographed at 390 px before and after and compared pixel by pixel: zero
  differing pixels. (The files' checksums were different — that is PNG encoding,
  not content. Worth knowing, because it looks like a regression.)

## Addition — the exercise must be visible, and the screen must stay on

- **The drawing belongs where the exercise is done.** Knowing the name of a
  movement is not the same as knowing the movement, and looking it up meant
  leaving the workout, finding it in the library and navigating back — with the
  rest timer running. The drawing now sits next to the name, and steps and cues
  are one tap away without going anywhere.

- **The guide is collapsed by default.** Mid-workout, the weight and reps are
  what the thumb reaches for. A wall of instructions between them and the top
  of the screen would push the entire point of the app further down. Measured
  at 390 px: "Log set" is still visible with the guide open.

- **Wake lock retries on first touch.** Some browsers only grant a lock during
  a user action. Getting here by tapping a workout counts, but the effect runs
  a moment later, and that window is short. If it failed, the next tap on the
  screen is a free second chance — and logging a set *is* a tap, so it costs
  the user nothing. The lock is also listened to for `release`, because the
  browser lets go of it on its own terms (a call, a notification), and without
  that it would never come back.

- **iOS' low power mode refuses outright.** That is its right, and there is
  nothing to be done about it from the app's side. Worth knowing when the
  screen goes dark anyway.

## Addition — email, the hall's name and a public repo

- **SMTP before Resend.** A self-hosted setup usually already has a mail
  server; requiring an account with a third party to be able to send a login
  link is a needless obstacle. If both are set, SMTP wins: typing in a mail
  server is deliberate work, a forgotten API key is not. With neither, the
  message is written to the log, which is enough to get started and expressly
  not enough to keep going.

- **`nodemailer` is the one new dependency.** SMTP is a protocol with TLS,
  STARTTLS and authentication; writing it ourselves to avoid a dependency
  would cost more than the dependency. It has no runtime dependencies of its
  own and no native build, which is the line the project has held.

- **The hall is named by whoever builds it.** The default was two specific
  people's names, which greeted every other installation with two strangers.
  It is now asked for at first run, with a neutral fallback name, and an admin
  can change it afterwards — a name chosen in a hurry at six in the morning
  should not be permanent.

- **The repo is public, and `CLAUDE.md` is not.** The working notes about the
  production host contain server ids, internal addresses and ssh details.
  They now live in `.gitignore`, so they cannot be committed by accident.
  HANDOFF.md has at the same time been scrubbed of the internal address and of
  the recipe for logging in via the container's log.

## Addition — the screen must stay on, and the site must be able to fill a screen

- **The wake lock lives exactly as long as the logging screen is open.** A rest
  of ninety seconds is plenty for the phone to lock, and unlocking with chalk
  on your fingers to type two numbers is the most annoying part of using a
  phone in a gym. The lock is taken when the screen opens and released when you
  leave it — a lock that outlived the workout would be a dead battery. The
  browser drops it by itself when the tab is hidden, so it is retaken on
  `visibilitychange`; without that it stops working after the first
  interruption, without anyone noticing. No setting: it is the behavior you
  want mid-workout, and browsers that cannot do it do nothing.

- **The site was mobile-first and merely centered.** On a big screen it read
  as a narrow column with two empty margins. The width, the typography and the
  spacing now grow with the screen via `clamp()` rather than jumps at a
  breakpoint, so there is no width at which the layout visibly hops.

- **Six screenshots in one row was rejected.** They can fit on a wide screen,
  but each phone becomes so small that the numbers in it — the entire point of
  showing real screenshots — cannot be read. Three big ones beat six
  decorative ones.

- **The website is two documents, not a language button.** `index.html` is
  Danish, `en.html` English, each with its own `lang`, its own `canonical` and
  an `hreflang` link to the other. That is what a screen reader and a search
  engine need, and the page works entirely without JavaScript. The price is
  that the two files must be kept in sync — it says so in `website/README.md`.

## Addition — password as an alternative to passkey

*(Requested along the way: "not everyone can use passkeys".)*

- **Passkey remains the recommendation; password is the alternative.** The
  login screen still opens on passkey. Password sits one tap away, because it
  is the only way in for a device or browser that cannot do passkeys at all —
  not because it is just as good.

- **The hash lives in its own table, not as a column on `users`.** The Postgres
  policy "hall members visible" lets any member read the entire *row* for
  everyone else in the hall — it is the one that drives Valhal. A password hash
  on that row would thereby be readable by your own training partner.
  `user_passwords` has RLS enabled and *no* policies, which makes it
  unreachable for `anon`/`authenticated` no matter what; only the server can
  touch it. Deliberately deviates from the handoff note's "password_hash on
  users".

- **Rate limiting did not exist until now.** A passkey cannot be guessed; a
  password can. The limit is five failures per quarter hour, counted both per
  email and per caller address, so neither one account nor one machine can be
  used to grind through. A successful login resets both counters, so ordinary
  use never comes near the ceiling. The state lives in memory — Uruz runs as
  one container against one SQLite file, so there is exactly one process to
  count in. If it is to scale horizontally, the counter must go in the
  database.

- **All login failures look the same.** Unknown email, no password set, wrong
  password and deactivated account give the same 401. Hashing is also done
  when there is nothing to compare against, so "does not exist" is not
  measurably faster than "wrong password" — otherwise the identical error
  messages would be a joke.

- **Changing the password requires the old one, and closes all other sessions.**
  A live session is not proof enough: a phone lying unlocked on a bench must
  not be the way to lock the owner out. And if you change your password because
  someone else knows it, it would be pointless to let that someone's session
  live.

- **Forgot password goes through a one-time link with its own purpose.** The
  link replaces the old password as proof, so it must not be usable for
  anything else: `consumeMagicToken` now requires a matching purpose, and a
  reset link is therefore rejected by the login callback. Strength is checked
  *before* the link is consumed — a rejected password must not cost the user
  the link.

- **The same strength rule in browser and server.** `checkPasswordStrength` has
  moved to `password-rules.ts` without `server-only`, so the form can say "too
  short" immediately. The server still decides; the client check is a courtesy.

## Addition — the app derives its own address

- **The request beats a configuration that still says localhost.**
  `NEXT_PUBLIC_APP_URL` wins when it points somewhere real, but the default
  `http://localhost:3000` is not an answer — it is the absence of one. If the
  request clearly did not come from localhost, `x-forwarded-host` /
  `x-forwarded-proto` are read instead. That is what makes a self-hosted setup
  behind a proxy work without hand-configuration. Order: configuration,
  request, localhost.

- **Trusting forwarded headers is a deliberate choice.** The operator owns
  their own proxy, and an explicitly set address always wins, so an
  installation that worries can pin it down. The admin panel now says when the
  address is derived rather than set.

- **`rpConfig()` became asynchronous.** The address now comes from the request,
  and `headers()` is async in Next 15. It spreads to `checkWebAuthnConfig()`
  and the admin page, but keeps the passkey domain and login links on one
  truth.

- **Passkey support is decided after mount.** `passkeySupported()` looks at
  `window` and was therefore false on the server and true in the browser — the
  first paint disagreed with the server, and React threw the whole tree away
  and built it again. The bug predates the password work; it is fixed now,
  because the new button inherited it.

## Addition — ailments & wishes (Mimir adapts the training)

*(Requested along the way: "you should be able to write to the AI and tell it
about an ailment or a wish, and it should adjust the training or make
suggestions".)*

- **Mimir suggests, the human decides.** A suggestion never changes anything by
  itself. The user sees every change (swap / adjust / remove) with reasoning
  and approves. The result is saved as a *copy* — the original program
  survives, so an adaptation to a sore shoulder does not imperceptibly become
  the permanent plan.

- **The model may never invent exercises.** It gets a list of ids and may only
  choose from it; every id is validated against the library before the
  suggestion is shown. Unknown ids are discarded — they are not guessed.

- **Ailments and wishes are remembered.** They are stored in `user_constraints`
  and injected into *all* later Mimir calls. Verified: after "my shoulder
  hurts", Mimir removed shoulder presses in a later, entirely unrelated query
  about time and back — with the reasoning "due to your pain". They can be
  viewed and dismissed in the UI, because the user must be able to see what
  the coach is taking into account.

- **Swap beats remove.** The model routinely expresses "replace X" as *both* a
  swap and a removal of X. Read literally, the exercise would simply vanish,
  because removals are applied first. The swap wins — that was clearly the
  intent. (Caught in the first live test.)

- **A workout can never be emptied completely.** Removals that would leave zero
  exercises are discarded.

- **Pain always triggers the doctor referral**, regardless of what the model
  comes up with: the text is flagged server-side based on wording, and the UI
  shows the note.

## Phase 8 — Mimir (AI coach)

*(Requested along the way: "you should be able to choose AI provider: all the
well-known ones + custom".)*

- **One `chat()` surface, many providers.** Anthropic, OpenAI, Google, Ollama
  and any OpenAI-compatible server (llama.cpp/llama-swap, LM Studio, vLLM,
  OpenRouter …) — selected solely with `AI_PROVIDER`/`AI_BASE_URL`/`AI_MODEL`.
  The rest of the app does not know who answered. The calls are written with
  `fetch` rather than provider SDKs, so all providers are treated alike and a
  keyless, self-hosted server works without special treatment.

- **No API key is a valid setup.** A model on your own network typically has
  no key; `Authorization` is only sent if there actually *is* a key,
  because some local servers reject an empty bearer token.

- **The app coaches even without a model.** `insights.ts` derives concrete
  suggestions (plateau, imbalance, neglected exercise, streak, deload, pain in
  notes) directly from data. It is both the fallback on model failure *and*
  the full experience if you do not want AI. A model outage never costs the
  user their coaching.

- **Reasoning models require special handling** (found in testing against
  Gemma-4 26B): the model spent the entire token budget on hidden "thinking"
  and returned an empty answer. Now: the budget is raised, `<think>` blocks
  are stripped, an empty answer with `reasoning_content` gives a clear error
  instead of silence, and `chat_template_kwargs.enable_thinking=false` is sent
  to self-hosted servers — that brought the response time from ~21 s to under
  1 s. The field is *only* sent to self-hosted endpoints, since OpenAI rejects
  unknown fields.

- **Only anonymized aggregates leave the server.** The model gets numbers and
  exercise names — never name, email or ids.

- **The safety rules rank above the tone.** Regardless of "soft/hard" coach
  tone, Mimir may not give diet, calorie or weight-loss advice, may not
  promise cures, and must refer to a doctor on pain. The diet rule was
  tightened after the model in testing started advising on protein intake on
  its own.

## Phase 7 — Reminders & notifications (Huginn & Muninn)

- **Ribbing must never become shame.** The ravens' texts live in fixed banks
  with two tones. Even the "hard" tone is blunt and teasing — never
  condescending, and never a word about body or weight. Nudges come no earlier
  than after 4 days (2-3 workouts a week means entirely normal rest days) and
  never after 21 days: at that point the app would rather stay silent than
  become a guilty conscience.

- **No reminder for someone who has already trained today.** Verified: cron
  skipped the reminder when today's workout was logged, and sent it when the
  workout was 5 days old.

- **If a hall-mate has trained, the rivalry text is used instead.** The
  reminder then becomes "Ib has logged a workout in the hall. Will it stand
  unanswered?" rather than a generic reminder (section 8).

- **Push first, email as fallback.** Without a registered device the message
  goes by email, so a reminder never disappears in silence. The message is
  also always stored in the app, whether or not delivery succeeds.

- **Messages are chosen deterministically from a seed**, so the same day does
  not change text on every render.

- **Cron refuses to run without `CRON_SECRET`.** The endpoint sends messages
  to real people, so it fails closed rather than defaulting to open.
  All the work is idempotent — if it runs too often, nothing happens.

- **iOS requires installation before push.** `pushSupport()` distinguishes
  between "not supported" and "add the app to your home screen first", because
  the former would be outright misleading on an iPhone.

## Phase 6 — Gamification

- **Badges are recomputed from history, not on events.** Instead of counting
  up when something happens, all badges are evaluated against the entire
  training history. That way an offline replay, a corrected set or a missed
  event can never leave a user with a wrong badge — the data is the answer key.

- **Criteria live in data (`criteria_json`).** The code only knows the
  criterion *types* (number of workouts, records, week streak, before-X-o'clock,
  the whole library), so new badges can be seeded without a new deploy.

- **Rank is computed from history, also for others in the hall.** The stored
  `rank_level` column is only updated when *that* user opens the app; the
  leaderboard would therefore show a hall-mate with a stale rank (caught in
  the browser: Ib stood as "Thræl" with exactly the same numbers as Kristian's
  "Jarl"). The leaderboard therefore derives the rank from data.

- **Attendance weighs heaviest in rank points** (2 per workout, 1 per record,
  3 per week in the streak). Showing up is what the app rewards — not being
  the strongest.

- **The leaderboard shares only aggregates.** Only totals, streak and the
  week's count leave the server, never raw set logs, so a private profile can
  still join the friendly rivalry (section 2).

## Phase 5 — Statistics

- **All statistics are pure functions.** `src/lib/domain/stats.ts` knows
  neither database nor React, so every number the user sees is unit-tested
  (31 tests). The UI layer only formats what the functions return.

- **Weeks start on Monday, dates are local.** ISO weeks are what Danes expect,
  and day keys are built from local fields — otherwise a workout at 23:30
  would land on the wrong day in the statistics.

- **The streak is not broken by a week in progress.** If you trained last
  week but not yet this week, the streak still counts: the week is not over
  yet. It is a motivation app, not a judge.

- **Consistency is measured per week and cannot be "saved up".** Five workouts
  in one week do not offset seven empty weeks — each week contributes at most
  its target. Showing up evenly is the point (section 13).

- **Muscle volume is credited to every primary muscle.** It measures
  *exposure*, not physiology, and is precise enough to make "lots of push,
  little pull" visible. Imbalance is only flagged at 10 sets or more, so early
  numbers do not scare anyone.

- **Strength standards are rough and indicative.** Machines vary wildly
  between manufacturers, so the level is shown as an indication relative to
  body weight — never as an answer key.

- **Fun units are chosen so the number can be imagined.** The unit is scaled
  to a number between 1 and 100 ("9.8 × city bus" rather than "0.03 × blue
  whale").

- **Demo history as a script.** `npm run db:seed:history` generates ~12 weeks
  of realistic training with deterministic randomness, so statistics, badges
  and Valhal can be seen and tested before any real data exists.

- **CSV with semicolon and BOM.** Danish Excel expects semicolon as the
  separator, and without a BOM, æ/ø/å turn into gibberish.

- **Recharts traps (found by verification in the browser):** `<Line>` must be
  a *direct* child of `<LineChart>` — wrapped in a React fragment the curve is
  not drawn, with no error message at all. And the y-axis `domain` is computed
  explicitly instead of the `"dataMin - 5"` string form, which gave an empty
  plot.

## Addition — language choice & exercise display

*(Requested along the way: "choice of language or English only" + "illustration
or pictures of the exercise".)*

- **Language is a user setting, not a build flag.** Danish and English live as
  a file each in `/locales`. The choice is stored both on the user
  (`locale_pref`) and in a cookie, so the login, invitation and installation
  pages — which are shown *before* you are logged in — also hit the right
  language. The user's saved choice wins over the cookie when logged in.

- **The exercise content is translated too, not just the buttons.** An English
  UI with Danish exercise names would be half a job, so exercises have
  `name_en`, `instructions_steps_en`, `cues_en` and `safer_variant_en`, and the
  seven-plus finished templates have `name_en`/`description_en`. Everything
  falls back to Danish if a translation is missing — the library never shows
  blank fields. The user's *own* workouts are not translated: they are called
  what the user wrote.

- **Illustration or photo per user.** Exercises have an optional `image_url`;
  the setting `media_pref` chooses between line drawing and photo. The
  illustration is always the fallback — it works offline, requires no network
  and exists for every exercise. A photo that cannot be fetched falls back
  silently to the drawing.

- **Never import a directory from a client component.** `@/lib/i18n` (the
  directory) gave a useless runtime error (`Cannot read properties of
  undefined`), because the directory also contains `server.ts` with
  `server-only`. Shared i18n code therefore lives in `@/lib/i18n/core` and is
  always imported with the full path.

- **The service worker is not registered in development.** It caches
  `/_next/static/` cache-first; in dev, chunk names change all the time, so a
  cached chunk stops matching the HTML and hydration dies. An already
  installed worker is actively unregistered in dev.

## Phase 3 — Core logging

- **Client-generated ids make sync idempotent.** Every set gets a uuid in the
  browser *before* it is sent. The server rejects duplicates on id, so a queue
  replayed twice (offline → online, or two tabs) never double-logs or hands
  out the same record again. Verified in tests and in the browser.

- **Offline queue in IndexedDB, not in the service worker.** iOS Safari lacks
  Background Sync; the queue therefore lives in IndexedDB and is drained by
  the app (on mount, on `online`, and after every write). Order is preserved:
  the queue stops at the first network error instead of skipping ahead.

- **4xx drops a queue entry, 5xx retries.** A permanently rejected call (e.g.
  a deleted session) must not block all later sets behind it. After 8 futile
  attempts the entry is given up, so the queue does not become "poisoned".

- **PR detection happens server-side in the same call as the insert.** The
  rules exist in one place (`prCandidatesForSet`/`newRecords`), and the client
  afterwards only asks "did it break a record?" — so celebration and data are
  never in disagreement. A record must be beaten *strictly*, so you do not
  celebrate repeating your own best.

- **The Epley formula for estimated 1RM.** Common gym standard and reasonable
  in the 1–12 rep range Uruz aims at. Always shown as an *estimate*.

- **Weight suggestions are rounded to something that exists in the gym.**
  2.5 kg steps above 20 kg, 1 kg below — otherwise the app suggests 61.7 kg,
  which no machine can be set to.

## Phase 2 — Auth & users

- **Opaque server sessions in an httpOnly cookie.** Instead of a JWT in the
  client, a random token is stored in `auth_sessions` and set as an httpOnly,
  SameSite=Lax cookie (secure in production). That makes "log out on all
  devices" trivial (delete the user's rows) and keeps tokens out of
  JavaScript.

- **Passkeys via `@simplewebauthn` v13, not Supabase Auth.** Supabase's own
  WebAuthn support is not uniformly available; `@simplewebauthn` works the
  same on both backends and keeps auth behind our own `AuthProvider` surface,
  as the instruction requires (section 3). Magic link is the built-in
  fallback.

- **No leakage of account existence.** `/api/auth/magic/request` always
  answers `{ok:true}`, and passkey login options return valid options even for
  unknown emails. Only real, active users actually get a link sent.

- **Magic tokens are single-use.** The token is marked used on redemption;
  reuse is rejected (verified). Lifetime 30 min, invitations 14 days.

- **First run seeds the library.** `/api/auth/first-run` creates hall + admin
  *and* runs the content seed, so a fresh production setup has exercises and
  templates from the first login without running scripts.

- **Passkey registration is optional at onboarding.** The user is already
  logged in via session, so "Continue" skips it — otherwise a device without
  an authenticator could lock itself out.

## Phase 1 — Foundation

- **`Startprogram.html` did not exist in the directory.** The instruction
  refers to it as the source of exercise content, but the file was not
  present. The exercise content (steps, cues, safer variants) is therefore
  written from the description in section 15 and ordinary, cautious training
  guidance. Gladly replaced with the actual content if the file turns up.

- **Two data layers behind one interface.** The app runs by default on a
  built-in **`node:sqlite`** store (Node 26) — zero external dependencies, so
  the app works immediately and can be tested locally. The production target
  is **Supabase Postgres with Row Level Security** (delivered as migrations +
  policies + adapter). All data access goes through `@/lib/db`, so the backend
  can be swapped without touching the UI. Reasoning: the instruction requires
  Supabase/RLS *and* that the app is trivial to run for a non-technical person
  — the two concerns are reconciled by making the backend swappable.

- **RLS in production; repository scoping in dev.** Row Level Security belongs
  to Postgres/Supabase. The local sqlite layer has no RLS; instead the
  repository layer enforces the same access rules (a user sees only their own
  raw logs, admin sees the whole hall). The DoD requirement for RLS is met by
  the Postgres policies.

- **Tailwind v4 (CSS-first).** Semantic color variables on two axes
  (dark/light × norse/plain) set via `data-mode`/`data-theme` on `<html>`. An
  inline script sets the theme before first paint to avoid a flash.

- **`tsx` for scripts.** Seed/reset/gen scripts share code with the app (path
  alias `@/*`, extensionless `.ts` imports). Node's raw type stripping does
  not resolve these; `tsx` does, and is a standard tool.

- **Icons without image dependencies.** The PWA icons are generated by a
  small, pure PNG encoder (Node's built-in `zlib` + CRC) that rasterizes the
  ᚢ rune. No `sharp`/`canvas` native build dependency.

- **Demo users in seed (optional).** `npm run db:seed` adds content only
  (exercises, templates, badges). `npm run db:seed:demo` additionally creates
  admin (Kristian) + a pending invitation for Ib (code `IBIBIBIB`), so the app
  can be explored right away (section 15). A clean production setup instead
  uses admin-first onboarding at first run.

- **Offline queue client-side.** iOS Safari lacks Background Sync, so the
  set logging's offline queue lives in IndexedDB on the client and is drained
  when the network is back. The service worker handles app-shell caching
  only. (Built in phase 3.)
