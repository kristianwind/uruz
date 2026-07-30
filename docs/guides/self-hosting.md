# Hosting Uruz yourself

Uruz is free software under [AGPL-3.0](../../LICENSE). You can run it for
yourself, your training partner or your gym, and nobody can take that away.

This is the operator's guide. If you just want to train, read
[using Uruz](using-uruz.md).

---

## What you need

Almost nothing. One machine that can run a container, or Node 22 and a terminal.

**There is no database to install.** Uruz stores everything in a single SQLite
file using Node's built-in driver — no Postgres, no Redis, no queue. That is a
deliberate limit: a training log for a handful of people does not need a
cluster, and every piece of infrastructure you do not have is one you cannot be
woken up by.

**Everything else is optional.** The AI coach, notifications, email and the
scheduler are all things you can add later, or never.

---

## Three ways to run it

**These are alternatives, not steps.** Pick one — all three run the same app
against the same data, and you can move between them later, because the database
is a single file you can carry.

| | For whom |
|---|---|
| **Node, locally** | Trying it out, or working on it |
| **Docker** | Running it permanently on a machine you have |
| **A Rune in Yggdrasil Panel** | You already run the panel, and want its backups and updates |

### On your own machine, to try it

```bash
npm install
```

```bash
npm run setup
```

```bash
npm run dev
```

Open **http://localhost:3000**. The first screen asks you to create the
administrator account — that is you.

Want it populated so you can see what the statistics look like?

```bash
npm run db:seed:demo && npm run db:seed:history
```

That creates demo users and about twelve weeks of plausible training.

### With Docker

```bash
docker run -d \
  --name uruz \
  -p 3000:3000 \
  -v uruz-data:/data \
  ghcr.io/kristianwind/uruz:latest
```

The image is built for `linux/amd64` and `linux/arm64`, so it runs on a Raspberry
Pi as well as a server. `/data` is where everything lives — the SQLite file and
its write-ahead log. Mount it somewhere you back up.

### As a Rune in Yggdrasil Panel

[Yggdrasil Panel](https://yggdrasilpanel.com) turns a server into something you
can point and click at, and Uruz is packaged as one of its *runes*: an app the
panel can plant, with its own data directory, backups and environment.

1. **Runes → Carve a rune** → import [`yggdrasil/uruz.yaml`](../../yggdrasil/uruz.yaml)
2. Create a server from the rune and give it a subdomain
3. Fill in whichever fields you want — all of them are optional

> The panel keeps its own copy of a rune. Editing the file in the repository
> changes nothing until you import it again.

---

## Being reachable

Uruz needs to know the address it is served on. It is used for sign-in links and
for the passkey domain, and getting it wrong breaks both in ways that are hard
to trace.

**You usually do not have to configure it.** Behind a reverse proxy — Nginx
Proxy Manager, a Cloudflare Tunnel, Caddy — Uruz reads `x-forwarded-host` and
`x-forwarded-proto` from the request and works it out. Set
`NEXT_PUBLIC_APP_URL` only if you want to pin it; an explicit value always wins.

**Passkeys need HTTPS.** Browsers refuse them otherwise, and they refuse quietly:
the failure happens on the device and the server never hears about it. The one
exception is `localhost`, which browsers treat as secure so local development
works.

**Me → Admin → Passkey setup** shows the address and the passkey domain the app
has settled on, and says plainly when they cannot work together.

---

## Configuration

Copy `.env.example` to `.env.local` and fill in what you want. In a container,
these are environment variables; in Yggdrasil, they are the rune's fields.

### Email

Uruz sends sign-in links, invitations and reminders. There are two ways, and
one fallback.

**SMTP** — any mail server. Your host's, your company's, a transactional
service, or Gmail with an app password.

```bash
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=uruz@example.com
SMTP_PASSWORD=…
EMAIL_FROM="Uruz <uruz@example.com>"
```

Port 587 starts in plaintext and upgrades with STARTTLS; 465 is TLS from the
first byte. Uruz works that out from the port — set `SMTP_SECURE=true|false`
only if your server is unusual.

**Resend** — an API key instead of a mail server: set `RESEND_API_KEY` and
`EMAIL_FROM`. If both are configured, SMTP wins.

**Neither** — messages are written to the container log instead, links and all.
That is enough to complete a sign-in while you are setting things up.

> **This fallback is not a place to stay.** A sign-in link in a log is a working
> key to somebody's account for anyone who can read logs. Configure mail before
> anyone else uses the installation.

Most providers reject a sender they do not consider yours. If `EMAIL_FROM`
points at a domain you do not send from, mail lands in spam or bounces.

**Me → Admin** shows which of the three routes is actually in use.

### The AI coach

Uruz is not tied to one vendor. Set `AI_PROVIDER` to `anthropic`, `openai`,
`google`, `ollama` or `custom`.

```bash
# A model on your own network — no API key needed
AI_PROVIDER=custom
AI_BASE_URL=http://your-server.lan:8080/v1
AI_MODEL=gemma-4-26b-qat
```

```bash
# Or a hosted one
AI_PROVIDER=anthropic
AI_MODEL=claude-sonnet-5
AI_API_KEY=sk-ant-…
```

Without a model, Uruz still coaches — the suggestions are rule-based instead of
written by a language model, which is the intended fallback rather than a
degraded mode.

Check the connection under **Me → Admin → AI status**.

> Worth knowing for your users' sake: with a model on your own hardware,
> nothing about anyone's training leaves the building. With a hosted provider,
> their questions and constraints go to that provider. Say which one you run.

### Notifications

```bash
npm run gen:vapid
```

Put the two keys it prints into your configuration. Without them, reminders fall
back to email.

On iOS, push only works once the app has been added to the home screen. That is
Apple's rule, not the app's.

### The scheduler

**The app runs its own scheduler.** In production it ticks every fifteen
minutes on its own — reminders, nudges and the weekly analysis need no setup.

If you would rather drive it from an external scheduler (Vercel Cron, a
systemd timer, plain `curl`), set `CRON_SECRET` and hit the endpoint every
fifteen minutes:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://your-app.example.com/api/cron
```

Without the secret the endpoint refuses to run. That is deliberate — it sends
messages to real people. The work is idempotent, so the built-in scheduler and
an external one can coexist; set `URUZ_SCHEDULER=0` if you want the external
one to be the only driver.

---

## Backup

**Everything is in `/data`.** Back up the whole directory, not just the
`.sqlite` file: SQLite runs in write-ahead mode, so the newest writes may still
be in `uruz.sqlite-wal` when you copy it. A backup of the database file alone
can silently miss the last few sets somebody logged.

In Yggdrasil the rune already declares `backup.include: ["."]`, which covers it.

To restore, stop the container, put the directory back, and start it again.

Individual users can also export their own data from **Me → Export my data**, in
JSON or CSV. That is worth telling people about: it is what makes leaving
possible, and knowing you can leave is why people stay.

---

## Updating

Pull the new image and recreate the container:

```bash
docker pull ghcr.io/kristianwind/uruz:latest
docker stop uruz && docker rm uruz && docker run -d … # same flags as before
```

In Yggdrasil, restart the server from the panel — it re-pulls on start.

> A plain `docker restart` does **not** fetch a new image. It restarts the same
> container with the same one, which looks like a successful update and changes
> nothing.

**The database migrates itself.** New tables and columns are added on start;
nothing is dropped or renamed, so an older data directory keeps working.

**After a visible change, phones may show the old version.** The app caches
itself so it can work offline. Remove it from the home screen and add it again,
or reload in the browser.

---

## When something is wrong

| Symptom | Where to look |
|---|---|
| Container will not start | `curl https://your-app/api/health` — it touches the database, so it catches storage problems too |
| Passkeys fail | **Me → Admin → Passkey setup**. Address and passkey domain must match, and it must be HTTPS |
| Mail never arrives | **Me → Admin** shows which route is in use. If it says dev mode, nothing is configured. Check `EMAIL_FROM` is a sender you own |
| Reminders never fire | The log should say `scheduler: built-in, every 15 min` at startup. If you disabled it (`URUZ_SCHEDULER=0`), is anything actually calling `/api/cron`? |
| Mimir silent | **Me → Admin → AI status → Check connection** |
| Stale screens on phones | Service worker cache — reinstall from the home screen |

---

## A few things that are easy to get wrong

These are written down because they were got wrong first.

**Running `next build` while the dev server is running** corrupts `.next` —
both write to it. Use `npm run build:check`, which builds somewhere else.

**Running the seed scripts while the dev server is running** hits a SQLite lock.
Stop the server first.

**Assuming a rune update changes an existing server.** Yggdrasil seeds a rune's
defaults first and lays the server's *saved* environment on top, so an old
default stays put on a server that already exists.

**Trusting a plain restart to update.** See above — it does not.

---

## Security, honestly

Uruz is early software written for a handful of people, and it says so on the
front page. What it does do:

- Sessions are opaque tokens in the database, not signed blobs — revoking one
  actually revokes it
- Passwords are scrypt with per-password salts, and the cost parameters travel
  with the hash so they can be raised later
- Sign-in attempts are rate-limited per account and per address
- Changing a password ends every other session
- Removing a passkey asks for your password first, and refuses to remove your
  last way in
- The last administrator cannot be deactivated
- Sign-in links are single-use and expire in 30 minutes

What it does not do: multi-tenancy. One installation is one hall. If you want
two groups that cannot see each other, run two installations — that is cheap
with containers, and the isolation is then physical rather than a policy
somebody could get wrong.

**If you host this for other people**, know that a training log with bodyweight
and injuries is closer to health data than to ordinary account data, and in the
EU that carries obligations. Say what you store, where it goes, and what happens
to it when someone leaves.
