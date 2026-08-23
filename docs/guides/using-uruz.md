# Using Uruz

A guide for the person training, not the person running the server. If you want
to host it yourself, read [self-hosting](self-hosting.md) instead.

---

## Getting in

Uruz offers three ways to sign in. They all lead to the same account — you can
use whichever works on the device in your hand.

**A passkey** is Face ID, Touch ID, or your laptop's fingerprint reader. It is
the fastest and the safest, because there is no password to steal, and it is
what the app suggests first. Add one under **Me → Passkeys**, and give it a name
like "iPhone" so you can tell your keys apart later.

**A password** is the fallback. Not every device or browser can do passkeys, and
not everyone wants to. Set one under **Me → Password**. It has to be at least
ten characters; there are no rules about symbols, because length does more work
than punctuation and forced symbols only push people towards `Password1!`.

**A sign-in link by email** needs nothing memorised. Enter your address, and a
link arrives that signs you in. It works once and expires after 30 minutes.

> If you forget your password, the same email link is how you set a new one.

### More than one key

You can have several passkeys — one per device is the sensible pattern. Under
**Me → Passkeys** each one shows when it was added and when it last let you in,
so you can remove a phone you no longer have.

Removing a key asks for your password first. A live session is not proof of who
you are: a phone left unlocked on a bench should not be a way to strip its
owner's keys. And Uruz refuses to remove your *last* way in — if you have no
password and no working mail server, the key stays until you set one up.

---

## Putting it on your phone

Uruz is a web app that installs like a real one. It gets its own icon, opens
without a browser bar, and works offline.

**On iPhone**, open the app in **Safari** — only Safari can install on iOS. Tap
the share icon at the bottom, scroll down, and choose **Add to Home Screen**.

**On Android**, Chrome offers to install it, or use the menu → **Install app**.

**On a computer**, Chrome and Edge show an install icon in the address bar.

There is a walkthrough inside the app under **Me → Install app**.

---

## A workout, start to finish

### Choosing one

**Train** opens with today's workout. If you have a programme, that is the next
one in the rotation — the workout you have gone longest without — with a line
underneath saying how long it has been. If you have no programme yet, the same
place offers to have Kvasir lay one out; see [Kvasir, the coach](#kvasir-the-coach)
below.

Underneath sits the full list. Seven ready-made workouts ship with the app, from
a 20-minute short one to a full-body starter programme, and your own appear here
too.

Tapping a workout **shows you what is in it** — the exercises, sets, target reps
and rest — and gives you a **Start** button. It does not begin immediately, so
you can look before you commit, or change your mind.

**Free workout** starts an empty session instead: pick exercises as you go. Good
for a day when you are improvising, or when the gym is busy and you take what is
free. It sits below today's workout rather than at the top — it is always one
tap away, but it is no longer the app's answer to what you should do.

If you left a workout unfinished, **Resume** appears at the top.

### Logging a set

The logging screen shows one exercise at a time, with the drawing of it and
**How to do it** next to the name. Knowing what a movement is called is not the
same as knowing the movement, and the instructions are right there rather than
in a library you would have to leave the workout to reach.

The weight and reps are **already filled in** — from your last session, or from
what the progression suggests. Most of the time you just tap **Log set**.

**The +/− buttons move half a kilo.** Machines land on halves, and on stacks
with increments nothing like one plate. If you need to travel further, **hold
the button down** — it repeats, faster the longer you hold. You can also tap the
number itself and type it.

**Warm-up** marks a set as a warm-up. It is logged, but it does not count
towards your volume, your records or your targets.

When you beat a previous best, the set is marked and the app says so.

### The rest timer

Logging a working set starts the rest timer automatically, at whatever the
workout specifies. **+30s** and **−30s** adjust it, and you can skip it.

**The screen stays on** while you are on the logging screen — ninety seconds of
rest is long enough for a phone to lock, and unlocking with chalk on your hands
is a nuisance. It stops the moment you leave the screen.

> On an iPhone in Low Power Mode, iOS refuses to keep the screen on no matter
> what an app asks. If the screen sleeps anyway, that is usually why.

### Correcting a set

**Tap the set.** The row has a pencil on it and opens into fields for weight and
reps, with a **Delete** button.

This works both during the workout and afterwards, from the archive.

### Finishing

**Finish workout** ends the session and asks how it went — mood, effort, your
bodyweight, and a note if you want one. All of it is optional, and all of it
feeds the statistics later.

---

## Past workouts

**Train → Past workouts** lists everything you have finished, with the date,
how many sets and how long it took.

Open one and you get the sets grouped by exercise, editable exactly as they were
during the workout. At the bottom, **Delete workout** removes the whole session
and every set in it, after asking once.

Your personal records survive a deleted workout. The weight was still lifted —
it would be wrong to take a rank back because you tidied up a mis-logged day.

---

## Making a workout your own

From a workout's page:

**Duplicate & adjust** makes a copy named "… (copy)" and opens it in the
builder. The seven built-in workouts are templates and cannot be edited in
place — a copy is the right way, so the originals stay intact for everyone in
the hall.

**Edit** appears on workouts you made yourself.

In the builder you can add exercises from the library, remove them, move them up
and down, set target sets, reps and rest per exercise, and give the whole thing
a new name before saving.

---

## Kvasir, the coach

Kvasir is the app's AI coach. He is optional: without a model configured, Uruz
still gives you concrete suggestions — they are just rule-based rather than
written by a language model.

**Weekly analysis** looks at what you have actually done and says something
useful about it, rather than congratulating you for existing.

**Ask Kvasir** takes a question in your own words. "I only have 25 minutes today,
what do I do?" is a good one.

**He can lay out your programme.** From **Train**, or from `/coach/program`, he
asks what you are after, how many days a week you can train, how long you have
each time, and what equipment you have — then builds a plan of workouts from it.
He uses only exercises that are actually in your library, so a plan never points
at something you cannot do, and he allows for anything you have told him hurts.

The plan is built from rules first and then handed to the model to improve, which
is why it works with no model configured at all: without one you get the
rule-built plan, and a model that fails or answers badly costs the plan its
polish rather than its existence. Building a new plan retires the old one; it
never touches the workouts themselves, or a single set you have logged.

**Tell him about a niggle or a wish** — this is the part worth knowing about. A
sore shoulder, a bad knee, "I want to focus on my back for a while". He adapts
the training around it, and he remembers: mention a shoulder today, and a
question next week about something else still takes it into account.

> Kvasir is a training coach, not a doctor. He gives no dietary advice, never
> comments on your body or your weight, and points you to a doctor or
> physiotherapist when something hurts. That is built into his instructions and
> cannot be switched off — not even with the "tough" tone, which only makes him
> blunter, never unkind.

---

## Valhalla

The friendly-rivalry corner. Everyone in your hall appears on the leaderboard,
sorted by attendance, volume, streak or this week.

**Ranks** go from **Thrall** through **Dreng**, **Karl**, **Berserker** and
**Jarl** to **Einherjar**, earned by training rather than by lifting heavy —
consistency is what the app rewards.

**Runes and badges** mark milestones: your first workout, ten, fifty, a hundred;
your first record; five weeks unbroken; training before 7 in the morning; having
tried every exercise in the library.

If you would rather not share your numbers, **Me → Private profile** keeps your
volume to yourself while still letting you appear in the hall.

---

## The ravens

Huginn and Muninn are the reminders. They nudge you on your training days,
praise a good session, and give you a gentle push if you have been away.

Set your training days and the time of day under **Me → Reminders**. Notifications
can arrive as push messages on your phone, or by email if push is not set up.

The tone follows your **coach tone** setting: gentle or tough.

> Reminders only go out if whoever runs the server has set up a scheduler. If
> you never get any, that is the first thing to ask about.

---

## Training without signal

Uruz works in a basement with no bars.

Everything you log is saved on the device first and synced when the connection
comes back. A banner tells you when you are offline and when it is catching up.
Nothing is lost, and you do not have to think about it.

The only things that need a connection are Kvasir, the leaderboard, and anything
that involves other people.

---

## Your data

**Me → Export my data** gives you everything as JSON or CSV — every workout,
every set, every record. It is yours, and it is a real export, not a summary.

**Me → Delete my data** removes your account and everything in it. It asks you
to type your own name first, because it cannot be undone.

If Uruz is hosted for you rather than by you, the export is also how you leave:
take the file, run the app yourself, and carry on.

---

## Settings worth knowing about

**Me → Settings** holds the things that change how the app looks and behaves:

- **Theme** — Norse, or plain numbers if you would rather skip the mythology
- **Colour** — dark or light
- **Language** — English or Danish, including the exercise instructions
- **Exercise visuals** — the line drawings, or photographs where they exist
- **Lock to portrait** — where the browser allows it

On an iPhone, no web app can lock the screen rotation; that switch lives in
iOS's own Control Centre. Uruz says so rather than showing a toggle that does
nothing.

---

## When something is wrong

| What you see | What it usually is |
|---|---|
| Face ID fails | The address the app is reached on has to match its passkey domain, and it has to be HTTPS. Whoever runs the server can see both under **Me → Admin → Passkey setup**. |
| Kvasir does not answer | No model is configured, or it cannot be reached. The app falls back to rule-based suggestions — that is intended, not broken. |
| No reminders arrive | The server's scheduler is not calling the app. Ask whoever runs it. |
| An old screen after an update | The app caches itself so it works offline. Remove it from your home screen and add it again, or reload in Safari. |
| A sign-in link never arrives | Check spam. If it still does not, the server may have no mail configured — ask. |
