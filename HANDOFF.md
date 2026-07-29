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
| **Kode** | https://github.com/kristianwind/uruz |
| **Image** | `ghcr.io/kristianwind/uruz:latest` (offentligt) |
| **Website** | https://uruz-training.com |
| **Tests** | 173, alle grønne |
| **Site-kilde** | `website/` — dansk og engelsk, åbn `index.html` |

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
  et rigtigt domæne), og adressen udledes nu af selve forespørgslen når
  konfigurationen stadig står på localhost.
- **Password-login** hele vejen rundt: sæt, skift, log ind, throttling,
  nulstilling via e-mail. Se afsnittet nedenfor.
- **E-mail via SMTP** mod en rigtig SMTP-samtale: beskeden kom frem med korrekt
  afsender, modtager og emne.
- **Hold skærmen tændt.** Låsen tages på logge-skærmen og slippes igen når man
  navigerer væk — også ved navigation inde i appen, som er det virkelige
  tilfælde.
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

## Adressen: `NEXT_PUBLIC_APP_URL` behøver ikke længere at være sat

Det var årsagen til at både passkey og login-links var brudt: serveren blev
oprettet med rune-defaulten `http://localhost:3000`, og den værdi drev både
login-links i e-mails og passkey-domænet (RP ID).

**Det er nu løst i koden.** `src/lib/auth/origin.ts` er taget i brug: siger
konfigurationen stadig `localhost`, mens forespørgslen tydeligvis kommer et
andet sted fra, læses `x-forwarded-host` / `x-forwarded-proto` i stedet — dem
sætter proxyen foran. Rækkefølge: konfiguration, forespørgsel, localhost.

Sæt gerne alligevel variablen til appens rigtige adresse. En eksplicit adresse
vinder altid, og så afhænger intet af proxyens headere. **Mig → Admin →
Passkey-opsætning** siger nu hvilken af de to der er i brug.

### Kom ind uden passkey

Der er tre veje ind: passkey, kodeord og login-link på e-mail.

Er der hverken SMTP eller Resend sat op, skriver appen i stedet login-linket i
serverens log — nok til at komme ind første gang, men **det bør ikke være en
permanent tilstand**: alle der kan læse loggen, kan dermed logge ind som en
hvilken som helst bruger. Sæt en mailserver op (se README), eller sæt et
kodeord under **Mig → Kodeord** så snart du er inde.

---

## Password-login

Efterspurgt fordi "ikke alle kan bruge passkey". Passkey er stadig den
anbefalede vej; kodeord er alternativet, ét tryk væk på login-skærmen.

| Hvor | Hvad |
|---|---|
| `/login` | "Brug kodeord i stedet", og "Glemt kodeord?" derunder |
| **Mig → Kodeord** | sæt, skift eller fjern sit kodeord |
| Onboarding | tilbydes sammen med passkey, efter kontoen er oprettet |
| E-mail | et engangslink til at vælge nyt kodeord, gyldigt 30 min |

Værd at vide om opførslen:

- **Fem fejl pr. kvarter**, talt både pr. e-mail og pr. kalder-adresse. Et
  vellykket login nulstiller tælleren. Tælleren lever i hukommelsen — det
  virker fordi der er én container; skaleres der ud, skal den i databasen.
- **Alle login-fejl ser ens ud** (samme 401), og der hashes også for en ukendt
  e-mail, så svartiden ikke røber om kontoen findes.
- **Skift kræver det nuværende kodeord** og lukker alle andre sessioner.
- **Hashen ligger i `user_passwords`**, ikke som kolonne på `users` — i
  Postgres kan ethvert hal-medlem læse andres `users`-række.

Verificeret lokalt: kodeord sat gennem UI'et, forkert kodeord afvist, rigtigt
kodeord logger ind, throttling slår til på sjette forsøg, nulstillingslinket
virker én gang, et for kort kodeord bruger ikke linket op, og et
nulstillings-link kan ikke bruges som login-link.

**Ikke verificeret:** ingen har brugt det på en rigtig telefon endnu.

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
| Lade en flex-container indeholde både tekst og et link | Teksten og linket bliver hver sit flex-element og lander på hver sin linje med et hul imellem, når det wrapper. |
| Tro at en rune-opdatering ændrer en eksisterende server | Yggdrasil sår rune-defaults først og lægger serverens **gemte** env ovenpå. En gammel default bliver siddende på serveren. |
| Læse `window` under render i en klientkomponent | Serveren siger falsk, browseren sandt, og React smider hele træet væk. Afgør det i en `useEffect` — se `usePasskeySupported`. |
| Tilføje en kolonne til en tabel der allerede findes | `CREATE TABLE IF NOT EXISTS` springer hele sætningen over, så kolonnen når aldrig en kørende database. En ny *tabel* klarer sig selv; en ny *kolonne* kræver `ALTER TABLE`. |

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
| Containeren starter ikke | `curl https://din-adresse/api/health` — den rører databasen, så den fanger også et lager-problem. |
| Gamle skærme på telefonen | Service worker-cache. Geninstallér fra hjemmeskærmen. |

---

## Det jeg ville gøre som det næste

I den rækkefølge:

1. **Bekræft Face ID på en rigtig iPhone.** Det eneste ubekræftede i
   login-flowet — og nu ikke længere det eneste der kan lukke dig ind, for
   kodeord virker. Prøv gerne begge dele på telefonen.
2. **Log en rigtig træning i centret.** Alt er bygget ud fra en formodning om
   hvordan det føles med svedige fingre mellem sæt. Den formodning skal testes.
3. **Invitér Ib.** Så bliver Valhal og ranglisten meningsfuld, og
   invitationsflowet bliver prøvet af en anden end den der byggede det.
4. **Sæt cron op** så ravnene faktisk sender noget.
5. Derefter: bonus-listen i specifikationens afsnit 17 (supersæt, foto-
   progression, deload-uger, træningsmakker-tilstand).

---

## Konventioner

- **Brugervendt tekst findes i begge sprog**, i `/locales/da.json` og `en.json`.
  Aldrig hardkodet i en komponent — heller ikke sidetitler og e-mails.
  **Engelsk er standarden**; den enkeltes valg vinder altid.
- **Kodekommentarer er engelske**, og forklarer *hvorfor*, ikke *hvad*.
- **Domænelogik hører i `/lib`**, ikke i komponenter.
- **Enhver ikke-oplagt beslutning skrives i `DECISIONS.md`** med begrundelse.
- Tests dækker ren logik. UI verificeres i browseren, ikke med snapshots.
