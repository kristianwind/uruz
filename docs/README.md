# Uruz documentation

Written for two kinds of reader, and split accordingly.

## Guides

**[Using Uruz](guides/using-uruz.md)** — for the person training. Signing in,
putting it on your phone, logging a workout, correcting a set, the archive,
building your own workouts, Kvasir, Valhalla, reminders, training without signal,
and getting your data out.

**[Hosting Uruz yourself](guides/self-hosting.md)** — for whoever runs the
server. Three ways to run it, being reachable, email, the AI coach,
notifications, the scheduler, backup, updating, and the things that are easy to
get wrong.

## Reference

**[Architecture](../ARCHITECTURE.md)** — how the pieces fit together, and why
the calculations are pure functions.

**[Decisions](../DECISIONS.md)** — every non-obvious choice with its reasoning.
Long, and deliberately so: it is the file that explains why something odd-looking
is odd on purpose.

**[Handoff](../HANDOFF.md)** — current state, what has been verified against
reality, and what has not.

**[Commercial plan](COMMERCIAL.md)** — a draft for running Uruz as a hosted
service alongside the free one. Not decided, not built.

**[The Yggdrasil rune](../yggdrasil/README.md)** — running Uruz as an app in
Yggdrasil Panel.

**[The website](../website/README.md)** — how uruz-training.com is built and
deployed.

---

## On the website

The two guides are also published at
[uruz-training.com/docs](https://uruz-training.com/docs/using-uruz.html).

Those pages are generated from these files by `npm run gen:docs`, run by hand
and committed — the site is static files with no build step, and that is worth
keeping. Edit the markdown, never `website/docs/`.

## A note on language

These guides are in English, matching the app's default language, the front page
of [uruz-training.com](https://uruz-training.com) and the repository itself —
that is what someone arriving without a preference meets.

`README.md` is English, with the Danish original kept at
[`README.da.md`](../README.da.md) — the same pattern as the website.

`DECISIONS.md`, `HANDOFF.md` and `ARCHITECTURE.md` are still Danish. They were
written for the two people building it, and they still are; translating them is
on the list.

The app itself is fully bilingual, exercise instructions included.
