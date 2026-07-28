# Uruz som Rune i Yggdrasil Panel

Uruz kører som en almindelig container. Denne mappe indeholder rune-manifestet
`uruz.yaml`, som lærer Yggdrasil at installere, starte og passe på den.

---

## Sådan får du den op

### 1. Sørg for at der findes et image

Imaget bygges og skubbes automatisk af
[`.github/workflows/docker.yml`](../.github/workflows/docker.yml) hver gang der
pushes til `main`. Det ender som:

```
ghcr.io/kristianwind/uruz:latest
```

Bygget er **multi-arch** (amd64 + arm64), så det kører både på en almindelig
server og på en ARM-maskine.

> Vil du hellere bygge og skubbe manuelt fra din egen maskine, skal din
> `gh`-token have `write:packages`:
>
> ```bash
> gh auth refresh -h github.com -s write:packages
> ```
>
> ```bash
> gh auth token | docker login ghcr.io -u kristianwind --password-stdin
> docker buildx build --platform linux/amd64,linux/arm64 \
>   -t ghcr.io/kristianwind/uruz:latest --push .
> ```

### 2. Giv Yggdrasil adgang til imaget

Pakken arver repoets synlighed og er altså **privat**. Serveren der kører
Yggdrasil skal derfor kunne logge på GHCR:

```bash
docker login ghcr.io -u kristianwind
```

Alternativt kan du gøre netop pakken offentlig under
**GitHub → Packages → uruz → Package settings**. Koden forbliver privat.

### 3. Læg runen ind i panelet

**Runes → Carve a rune (upload)** og vælg `uruz.yaml`.

Eller peg **Runes → Browse GitHub** på denne mappe i repoet.

> Panelet gemmer runen i sin egen database. Retter du `uruz.yaml` bagefter,
> sker der ingenting før du **importerer den igen**.

### 4. Opret serveren

Opret en server ud fra Uruz-runen. Sæt som minimum:

| Felt | Værdi |
|---|---|
| **Offentlig adresse** | `https://uruz.dit-domæne.dk` |
| **Passkey-domæne** | `uruz.dit-domæne.dk` |

De to skal passe sammen — ellers virker Face ID-login ikke, fordi passkeys er
bundet til værtsnavnet.

### 5. Giv den et subdomæne

Uruz er en HTTP-app, så den kan ligge bag **Nginx Proxy Manager** eller
**Cloudflare Tunnel** — begge understøttes af Yggdrasil under
`Settings → Domains`. Sæt serverens `subdomain` til fx `uruz`.

Det er også her HTTPS kommer fra, og **HTTPS er ikke til forhandling**:
passkeys og service workers virker kun på et sikkert origin.

---

## Efter første start

1. Åbn adressen. Du bliver bedt om at oprette administrator-kontoen.
2. Øvelser, skabeloner og badges seedes automatisk ved den oprettelse.
3. Invitér Ib under **Mig → Admin → Invitér bruger**.

---

## Reminders kræver et ur

Ravnene sender først noget, når `/api/cron` bliver kaldt. Sæt `CRON_SECRET` som
variabel på serveren og lav en schedule (eller en cron-linje på værten) der
kalder den hvert kvarter:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://uruz.dit-domæne.dk/api/cron
```

Uden `CRON_SECRET` **nægter** endpointet at køre — det sender beskeder til
rigtige mennesker, så det fejler hellere lukket end åbent.

---

## Hvad der ligger hvor

| Sti | Indhold |
|---|---|
| `/data/uruz.sqlite` | Hele databasen — træninger, brugere, alt |
| `/data/uruz.sqlite-wal`, `-shm` | SQLites write-ahead log. Hører med til databasen |

Runens `backup.include: ["."]` tager hele `/data`, så Yggdrasils backup-knap
fanger alt. WAL-filerne skal med — en backup af kun `.sqlite` kan mangle de
nyeste skrivninger.

---

## Sundhedstjek

Containeren har et indbygget healthcheck mod `/api/health`. Det rører
databasen med vilje: en proces der lytter, men ikke kan nå sit eget lager, er
ikke rask, og skal ikke rapportere grønt.

```bash
curl https://uruz.dit-domæne.dk/api/health
# {"status":"ok","app":"uruz","time":"…"}
```

---

## Kør den uden Yggdrasil

Runen er bekvemmelighed, ikke en forudsætning:

```bash
docker run -d --name uruz -p 3000:3000 -v uruz-data:/data \
  -e NEXT_PUBLIC_APP_URL=https://uruz.dit-domæne.dk \
  -e WEBAUTHN_RP_ID=uruz.dit-domæne.dk \
  ghcr.io/kristianwind/uruz:latest
```

---

## Ting der er værd at vide

- **Uruz har sit eget login.** Yggdrasil har ikke SSO, så Uruz beholder
  passkeys og magic-link. Panelets brugere og Uruz' brugere er to ting.
- **`URUZ_DEV_AUTOLOGIN` er hårdt slået fra i imaget.** Den bekvemmelighed
  hører til på en udviklingsmaskine, ikke på noget der kan nås udefra.
- **Databasen er SQLite.** Det er rigeligt til en håndfuld personer i én hal
  og betyder ingen ekstra container. Skal I være mange, ligger
  Postgres-skemaet og RLS-policyerne klar i `../supabase/migrations/`.
