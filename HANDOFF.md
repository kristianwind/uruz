# Handoff — Uruz ᚢ

Status og overleveringsnoter, skrevet 28. juli 2026.
Til dig selv om tre måneder, eller til den næste der rører projektet.

---

## Hvad det er

En træningsapp (PWA) til iPhone og web til Kristian og Ib. Lynhurtig
sæt-logning der virker uden internet, ærlig statistik, en AI-coach (Mimir) der
kan tilpasse træningen til skavanker, og et gamification-lag i nordisk klædning.

Bygget efter en detaljeret dansk specifikation i ti faser. Kører som en **Rune**
i Yggdrasil Panel.

| | |
|---|---|
| **Kode** | https://github.com/kristianwind/uruz (privat) |
| **Image** | `ghcr.io/kristianwind/uruz:latest` (offentligt) |
| **I drift** | https://uruz.yggdrasilpanel.com |
| **Tests** | 131, alle grønne |
| **Website** | `website/index.html` — åbn i en browser |

---

## Sådan kommer du i gang

```bash
npm install && npm run setup && npm run dev
```

Vil du se den med data i:

```bash
npm run db:seed:demo && npm run db:seed:history
```

Ingen konti, ingen nøgler, ingen database at installere. Det er med vilje.

---

## Hvordan det hænger sammen

Læs [ARCHITECTURE.md](ARCHITECTURE.md) for det fulde billede. Det korte:

```
UI (React)  →  Domæne (rene funktioner, testet)  →  Data (repositories)
                                                  →  Tjenester (AI, push, auth)
```

**Den bærende regel:** alt der kan regnes ud, er rene funktioner uden I/O. Derfor
er hvert tal i appen unit-testet, og derfor kan Uruz coache fornuftigt helt uden
en AI-model.

**To datalag bag én flade:** `node:sqlite` lokalt og i containeren (nul
opsætning), Supabase/Postgres med Row Level Security klar i
`supabase/migrations/` hvis I bliver mange.

---

## Hvad der er verificeret — og hvad der ikke er

Det her er den vigtigste sektion. Jeg har testet meget i browseren og i en
kørende container, men ikke alt kan testes uden rigtig hardware.

### Verificeret

- **Offline-logning.** Slog nettet fra midt i en træning, loggede sæt, så det
  havne i IndexedDB-køen, tændte nettet, så det synkronisere. Køen tømtes.
- **Første kørsel i container.** Tom database → opret admin → biblioteket
  seedes automatisk → uautentificeret adgang afvises → data overlever genstart.
- **Mimir mod den rigtige model.** Ugentlig analyse (4,7 s) og "Spørg Mimir"
  (7 s) mod `gemma-4-26b-qat`. Tilpasning af træning til en øm skulder, inkl.
  at skavanken huskes til en senere, urelateret forespørgsel.
- **Passkey-domænet** udledes korrekt af adressen (testet i container med
  `uruz.yggdrasilpanel.com`).
- **Reminders.** Cron springer korrekt over når man allerede har trænet i dag,
  og vælger rivalise-teksten når en hal-kammerat har trænet.
- **Sikkerhed.** Sidste admin kan ikke deaktiveres. Magic-links er engangs.
  Uautentificerede API-kald giver 401.

### Ikke verificeret — kræver rigtig hardware

- **Face ID / passkeys på en fysisk iPhone.** Alt *omkring* dem er testet
  (sessioner, gating, magic-link-fallback, at RP ID udledes rigtigt), men
  browseren jeg har haft til rådighed har ingen authenticator. Kristian fik en
  fejl på sin iPhone; årsagen (RP ID defaultede til `localhost`) er fundet og
  rettet, men **selve Face ID-flowet er stadig ikke set lykkes én gang.**
  → *Det er det første der skal bekræftes.*
- **Web push på iOS.** Kræver at appen er lagt på hjemmeskærmen. VAPID-nøgler
  er genereret og koden er på plads, men en notifikation er aldrig landet på en
  rigtig telefon.
- **Supabase/Postgres-backend.** Skema og RLS-policies er skrevet, men aldrig
  kørt mod en rigtig Supabase-instans. Lokalt kører alt på SQLite.
- **En rigtig træning i centret.** Ingen har brugt appen til det den er lavet
  til endnu. Det er den vigtigste test der mangler.

---

## ⚠️ AKUT: sæt `NEXT_PUBLIC_APP_URL` på serveren

**Det er årsagen til at både passkey og login-links er brudt lige nu.**

Serveren blev oprettet med rune-defaulten `http://localhost:3000`, og den værdi
bruges to steder:

- login-links i e-mails peger på `localhost` (ubrugelige)
- passkey-domænet (RP ID) udledes af den → browseren afviser Face ID

**Fix:** sæt variablen på Uruz-serveren i Yggdrasil til
`https://uruz.yggdrasilpanel.com` og genstart. Det løser begge dele.

### Kom ind uden passkey imens

Uden `RESEND_API_KEY` skriver appen login-linket i containerens log:

1. `/login` → skriv e-mail → "Send mig et login-link"
2. Yggdrasil → Uruz-serveren → **Console/Logs**
3. Find `📧 [dev email — no RESEND_API_KEY]` og åbn URL'en
   (ret `localhost:3000` til `uruz.yggdrasilpanel.com` indtil variablen er sat)

Verificeret i en container. Ingen data går tabt — server skal ikke genskabes.

> **Sikkerhedsnote:** login-links i klartekst i containerloggen betyder at
> enhver med adgang til panelets logs kan logge ind som en hvilken som helst
> bruger. Acceptabelt som engangs-redning, ikke som permanent tilstand. Sæt
> `RESEND_API_KEY`, eller gør password-login færdigt (se nedenfor).

---

## 🚧 Uafsluttet arbejde

To ting er påbegyndt og **ikke** gjort færdige. Begge er commitet, testet og
bryder ingenting — de er bare ikke koblet på appen endnu.

### 1. Password-login (efterspurgt: "ikke alle kan bruge passkey")

**Færdigt:**
- `src/lib/auth/password.ts` — scrypt via Nodes `node:crypto`. Ingen ny
  afhængighed, intet native build. Salt pr. kodeord, parametre gemt i hashen så
  de kan hæves senere, `timingSafeEqual`, korrupt hash læses som forkert
  kodeord frem for at kaste.
- `tests/password.test.ts` — 14 tests, alle grønne.

**Mangler:**
- `password_hash TEXT` på `users` (både `schema.sqlite.ts` og
  `supabase/migrations/`)
- `POST /api/auth/password/login` og `/api/auth/password/set`
- **Rate limiting** på login-forsøg — vigtigt, findes ikke endnu nogen steder
- Password-felt i `LoginForm`, og "sæt/skift kodeord" under **Mig**
- Tilbud om at sætte kodeord i onboarding (`FirstRunForm`, `InviteForm`)
- Nulstilling af kodeord via magic-link

Passkey bør forblive den anbefalede vej; kodeord er alternativet.

### 2. Selv-udledning af appens adresse

`src/lib/auth/origin.ts` er skrevet men **ikke taget i brug**. Den løser
rodårsagen ovenfor: i stedet for at stole på en håndskrevet variabel der
defaulter til localhost, læser den `x-forwarded-host` / `x-forwarded-proto`
fra requesten, som en reverse proxy sætter.

Rækkefølge: konfiguration først, request dernæst, localhost sidst.

**Mangler:** at kalde `getAppOrigin()` / `getAppHost()` i stedet for at læse
`process.env.NEXT_PUBLIC_APP_URL` direkte i:
- `src/lib/auth/webauthn.ts` (`rpConfig` — skal blive async)
- `src/app/api/auth/magic/request/route.ts`
- `src/app/api/auth/magic/callback/route.ts`
- `src/app/(app)/admin/actions.ts` (invitationslinks)

Bemærk afvejningen dokumenteret i filen: at stole på forwarded-headere er
bevidst, fordi det får en selvhostet opsætning bag en proxy til at virke uden
håndkonfiguration — og en eksplicit sat adresse vinder altid.

---

## Kendte skævheder

- **`Startprogram.html` fandtes aldrig.** Specifikationen henviser til den som
  kilde til øvelsesindhold. Trin og cues er skrevet ud fra beskrivelsen i
  afsnit 15. Dukker filen op, ligger indholdet samlet i
  `src/lib/db/seed-data.ts`.
- **arm64-bygget er flaky.** Next.js' SWC-compiler crasher sporadisk under
  QEMU-emulering (`Illegal instruction`). Workflowet er delt op så amd64 altid
  bliver udgivet og arm64 følger med når det lykkes. Skal arm64 være pålideligt,
  kræver det en rigtig ARM-runner.
- **Lokal mappe hedder `Uruz`, repoet hedder `uruz`.** Kosmetisk.

---

## Ting der er nemme at gøre forkert

Skrevet ned fordi jeg gjorde dem forkert først.

| Fælde | Hvad der sker |
|---|---|
| `next build` mens dev-serveren kører | Begge skriver `.next` og dev-serveren korrumperes. Brug `npm run build:check`. |
| Seed-scripts mens dev-serveren kører | SQLite-lås: `database is locked`. Stop serveren først. |
| Læse filer med `fs` i app-koden | Next standalone sporer imports, ikke filer. Skemaet er derfor et TS-modul, ikke en `.sql`-fil. |
| `<Line>` i et React-fragment i Recharts | Kurven tegnes ikke, helt uden fejlbesked. Skal være direkte barn. |
| Importere en *mappe* fra en klientkomponent | `@/lib/i18n` gav en ubrugelig runtime-fejl. Brug fuld sti (`@/lib/i18n/core`). |
| Glemme `env(safe-area-inset-top)` | Indhold lander oven i iPhonens ur, fordi status-bjælken er gennemsigtig. |
| Antage at en model kun foreslår ét | Modellen udtrykker "erstat X" som *både* en bytning og en fjernelse. Bytning vinder. |
| Tro at en rune-opdatering ændrer en eksisterende server | Yggdrasil sår rune-defaults først og lægger serverens **gemte** env ovenpå. En gammel default bliver siddende på serveren. |

Alle er dokumenteret med begrundelse i [DECISIONS.md](DECISIONS.md).

---

## Drift

### Opdatér den kørende app

Push til `main` → GitHub Actions bygger og skubber → **genstart serveren i
Yggdrasil** for at hente det nye image.

Efter en UI-ændring: service workeren cacher app-skallen, så en telefon kan
vise den gamle version. Slet appen fra hjemmeskærmen og tilføj den igen, eller
genindlæs i Safari.

### Rune-manifestet

Ligger i `yggdrasil/uruz.yaml`. Panelet **gemmer runen i sin egen database** —
retter du filen, sker der ingenting før du importerer den igen under
**Runes → Carve a rune**.

### Reminders

Sender først noget når `/api/cron` bliver kaldt. Kræver `CRON_SECRET` sat, og
en schedule der kalder endpointet hvert kvarter. Uden hemmeligheden nægter det
at køre — med vilje, for det sender beskeder til rigtige mennesker.

### Backup

`/data` er hele databasen inkl. WAL-filer. Runens `backup.include: ["."]`
fanger det hele. En backup af kun `.sqlite` kan mangle de nyeste skrivninger.

---

## Hvis noget er galt

| Symptom | Kig her |
|---|---|
| Passkey fejler | **Mig → Admin → Passkey-opsætning**. Adresse og domæne skal passe sammen, og der skal være HTTPS. |
| Mimir svarer ikke | **Mig → Admin → AI-status → Tjek forbindelse**. Uden model falder appen tilbage til regelbaserede forslag — det er meningen. |
| Reminders kommer ikke | Er `CRON_SECRET` sat, og bliver `/api/cron` faktisk kaldt? |
| Containeren starter ikke | `curl https://uruz.yggdrasilpanel.com/api/health` — den rører databasen, så den fanger også et lager-problem. |
| Gamle skærme på telefonen | Service worker-cache. Geninstallér fra hjemmeskærmen. |

---

## Det jeg ville gøre som det næste

I den rækkefølge:

1. **Bekræft Face ID på en rigtig iPhone.** Det eneste ubekræftede i login-flowet.
2. **Log en rigtig træning i centret.** Alt er bygget ud fra en formodning om
   hvordan det føles med svedige fingre mellem sæt. Den formodning skal testes.
3. **Invitér Ib.** Så bliver Valhal og ranglisten meningsfuld, og
   invitationsflowet bliver prøvet af en anden end den der byggede det.
4. **Sæt cron op** så ravnene faktisk sender noget.
5. Derefter: bonus-listen i specifikationens afsnit 17 (supersæt, foto-
   progression, deload-uger, træningsmakker-tilstand).

---

## Konventioner

- **Brugervendt tekst er dansk**, i `/locales/da.json` og `en.json`. Aldrig
  hardkodet i en komponent.
- **Kodekommentarer er engelske**, og forklarer *hvorfor*, ikke *hvad*.
- **Domænelogik hører i `/lib`**, ikke i komponenter.
- **Enhver ikke-oplagt beslutning skrives i `DECISIONS.md`** med begrundelse.
- Tests dækker ren logik. UI verificeres i browseren, ikke med snapshots.
