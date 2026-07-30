# Handoff — Uruz ᚢ

> Dansk originaltekst, frosset 30. juli 2026. Den vedligeholdte udgave er den
> engelske [HANDOFF.md](HANDOFF.md).

Status og overleveringsnoter, skrevet 30. juli 2026.
Til dig selv om tre måneder, eller til den næste der rører projektet.

Den forrige udgave var fra 28. juli. Der er sket tyve commits siden, og noget af
det ændrer **hvor tingene kører** — læs afsnittet om værterne først, også hvis
du springer resten over.

---

## Hvad det er

En træningsapp (PWA) til iPhone og web. Lynhurtig sæt-logning der virker uden
internet, ærlig statistik, en AI-coach (Mimir) der kan tilpasse træningen til
skavanker, og et gamification-lag i nordisk klædning.

Kører som en **Rune** i Yggdrasil Panel. Fri software under **AGPL-3.0**.

| | |
|---|---|
| **Kode** | https://github.com/kristianwind/uruz (offentligt) |
| **Image** | `ghcr.io/kristianwind/uruz:latest` (multi-arch) |
| **App i drift** | https://uruz.yggdrasilpanel.com |
| **Website** | https://uruz-training.com — engelsk forside, dansk på `/da.html` |
| **Tests** | 179, alle grønne |
| **Standardsprog** | Engelsk. Den enkeltes valg vinder altid. |

---

## ⚠️ Værterne — det der har kostet mest

**De to ting kører ikke længere på samme maskine.**

| Hvad | Vært | Server-id | Port |
|---|---|---|---|
| **uruz-training.com** | `100.80.130.8` (`kw01`) | `994bd145-1418-4f2c-bb14-ca19dbf3d10c` | 25023 |
| **Uruz-appen** | `100.92.81.54` (`.164`) | `0b0bf9c4-80a1-418e-8df5-bb19788be31d` | 25012 |

Sitet flyttede **29. juli**. Den gamle container på `.164` (`ygg-66e5a45d`) står
stoppet med sine gamle filer stadig i datamappen.

**Deployer du til den gamle vært, lykkes det.** Hvert trin svarer 200, filerne
lander med rigtig ejer — og intet af det bliver synligt nogen steder. Det skete
tre gange på én aften, før nogen opdagede det.

**Hvorfor det ikke blev opdaget:** Cloudflare serverede forsiden fra cache, så
den svarede 200 hele tiden. Det var kun en *ny* sti — `/docs/…` — der afslørede
det, fordi der ikke var noget cachet at falde tilbage på.

> **Verificér altid mod origin, aldrig kun gennem Cloudflare.** Et cachet svar
> fra en stoppet container ser nøjagtig ud som en sund server.

Den fulde deploy-opskrift står i `CLAUDE.md` og er rettet.

---

## Hvad der er sket siden sidst

**Login har fået to nye veje ind.** Kodeord (scrypt, rate-limitet, kræver det
gamle ved skift) og login-link på e-mail, der nu virker rigtigt. Passkeys kan
navngives, ses med "sidst brugt", og slettes — men sletning kræver
genautentificering og nægter at fjerne din sidste vej ind.

**E-mail virker.** SMTP2GO på `mail-eu.smtp2go.com:2525`. Verificeret ved at
sende et rigtigt login-link: loggen fik nul nye linjer, hvilket er hvad et
vellykket send ser ud som — appen skriver kun, når den *ikke* kan sende.

**Engelsk er standardsproget**, inklusive sidetitler, manifest og beskrivelser.
E-mails følger dog modtagerens eget valg, ikke standarden — en side på engelsk
før nogen har sagt andet er et rimeligt gæt, en mail til en navngiven person er
det ikke.

**Appen bruger skærmen på desktop og iPad.** Sidebjælke fra 768 px, indhold i
spalter, øvelseskø ved siden af logge-skærmen. Telefonen er verificeret uændret
— otte skærme fotograferet før og efter, nul afvigende pixels.

**Det første rigtige træningspas afslørede fire ting**, alle rettet: vægten går
0,5 ad gangen (hold knappen for at gentage), sæt-rækken har fået et blyant-ikon
så man kan se at den kan rettes, en træning vises før den startes, og der er nu
et arkiv over tidligere træninger hvor sæt kan rettes og hele træninger slettes.

**Dokumentation.** To brugervejledninger i `docs/guides/`, udgivet på
uruz-training.com/docs af `npm run gen:docs`. README er engelsk med den danske
bevaret som `README.da.md`.

---

## Hvad der er verificeret — og hvad der ikke er

### Verificeret mod virkeligheden

- **En rigtig træning i centret.** Kristian trænede 30. juli. Det var den
  vigtigste manglende test, og den afslørede fire fejl der nu er rettet.
- **Fire brugere er på.** Invitationsflowet er prøvet af andre end den der
  byggede det.
- **E-mail går ud** gennem SMTP2GO, målt mod den kørende server.
- **Passkey-sletning** i alle fire tilfælde: 409 på sidste nøgle uden anden vej
  ind, 403 på forkert kodeord, 404 på ukendt id, 200 med nøglen faktisk væk.
- **Databasemigrationer** — `name` og `last_used_at` blev tilføjet til en
  eksisterende database ved opstart, set med egne øjne.
- **SMTP-koden** mod en rigtig SMTP-samtale, ikke en mock.
- **Ankre i dokumentationen** mod `api.github.com/markdown/raw`.

### Ikke verificeret

- **Face ID på en fysisk iPhone.** Stadig. Alt omkring det er testet, men selve
  flowet er aldrig set lykkes. Nu er der ingen risiko ved at prøve: kodeord og
  e-mail virker begge som vej ind.
- **Arkivet i en browser.** Ruten svarer, koden er typechecket og bygget, men
  Mac'en løb tør for hukommelse og en dev-server kunne ikke startes. Sidens
  udseende er aldrig set.
- **Web push på iOS.** Kræver appen på hjemmeskærmen. Aldrig set en notifikation
  lande.
- **Supabase-backenden.** Skema og RLS er skrevet, men **adapteren findes ikke**
  — `DATA_BACKEND` optræder ikke i koden. Appen kører kun på SQLite.

---

## 🚧 Det næste

**En genstart mangler.** De to knapper på Træn-siden (`7e9def9`) er den eneste
app-kodeændring der ikke er ude. Alt andet siden sidste genstart er
dokumentation og website.

**Reminders sender stadig ingenting.** `/api/cron` bliver aldrig kaldt. Kræver
`CRON_SECRET` og en schedule hvert kvarter. Ravnene er bygget og venter.

**Oversættelse.** `DECISIONS.md`, `HANDOFF.md` og `ARCHITECTURE.md` er stadig
danske — omkring 7.700 ord. README er klaret.

**Level 2** — hostet udgave. Planen ligger i `docs/COMMERCIAL.md` og er ikke
besluttet. Første tekniske skridt er flere haller pr. installation: kun seks
filer antager at der findes én (`getAnyHall()`). Licensen, som var det mest
presserende, er på plads.

**Kvasir.** Kristian har spurgt om Mimir skulle omdøbes. Der er argumenteret
imod: Kvasir er allerede Yggdrasils AI-assistent — 28 filer og sin egen guide —
og to projekter på samme maskine med hver sin assistent af samme navn bliver
forvirrende. Ikke afgjort.

---

## Kendte skævheder

- **`Startprogram.html` fandtes aldrig.** Øvelsesindholdet er skrevet ud fra
  beskrivelsen i specifikationens afsnit 15.
- **arm64-bygget er flaky.** SWC crasher sporadisk under QEMU. Workflowet er
  delt, så amd64 altid bliver udgivet.
- **Fem andre servere på `.164` står stoppet.** Om de skal køre, ved kun
  Kristian.
- **Mac'en løber tør for hukommelse.** Et produktionsbyg tog 17,6 minutter i
  stedet for ti sekunder, og vitest' elleve arbejdsprocesser fik to tests til at
  fejle på timeout — de kører grønt på 241 ms alene.
  `npx vitest run --no-file-parallelism` virker.

---

## Ting der er nemme at gøre forkert

| Fælde | Hvad der sker |
|---|---|
| **Deploye sitet til `.164`** | Lykkes, svarer 200, ændrer ingenting. Sitet ligger på `100.80.130.8`. |
| **Verificere kun gennem Cloudflare** | En stoppet container ser sund ud i timevis. Spørg origin. |
| Glemme at bumpe `?v=` på CSS | Cloudflare holder stylesheets i fire timer: ny opbygning, gammelt udseende. |
| `docker restart` for at opdatere | Genbruger samme image. Ligner en vellykket opdatering, henter intet. |
| `next build` mens dev-serveren kører | Begge skriver `.next`. Brug `npm run build:check`. |
| Seed-scripts mens dev-serveren kører | SQLite-lås. |
| Tilføje en kolonne til en tabel der findes | `CREATE TABLE IF NOT EXISTS` springer den over. Kolonnen skal i `ADDED_COLUMNS` i `sqlite.ts` **og** i skemaet. |
| `requireContext()` i en API-rute | Den kaster, og en kastet fejl bliver til 500. Brug `getContext()` og returnér 401. |
| Redigere `website/docs/` | Genereret af `npm run gen:docs`. Ret markdown'en. |
| Relative stier fra `/docs/` | `href="docs.css"` bliver til `/docs/docs.css`. Filen ligger i roden. |
| Stole på en grøn test uden at tælle | En sammenligning over nul elementer er altid grøn. Tjek at der overhovedet blev målt noget. |
| Måle i browserruden uden at kigge | Viewport kan være nul, og så er hver måling vrøvl. Tag et skærmbillede. |

Alle er dokumenteret med begrundelse i `DECISIONS.md`.

---

## Drift

**Opdatér appen:** push til `main` → GitHub Actions bygger → genstart serveren
**Uruz** i Yggdrasil på `.164`. En genstart henter det nye image; det gør en
`docker restart` ikke.

**Opdatér sitet:** `npm run gen:docs`, så tar/scp/pak ud på `100.80.130.8`.
Filerne er live med det samme — nginx serverer direkte fra datamappen. Fuld
opskrift i `CLAUDE.md`.

**Backup:** `/data` i sin helhed, ikke kun `.sqlite` — WAL kan gemme de nyeste
skrivninger.

**Efter en UI-ændring** kan telefonen vise den gamle udgave: service workeren
cacher app-skallen. Slet appen fra hjemmeskærmen og læg den på igen.

---

## Hvis noget er galt

| Symptom | Kig her |
|---|---|
| Sitet viser gammelt indhold | Deployede du til den rigtige vært? Er containeren oppe? Er CSS-versionen bumpet? |
| Passkey fejler | **Mig → Admin → Passkey-opsætning** |
| Mail kommer ikke | **Mig → Admin** viser hvilken vej der bruges. Tjek at `EMAIL_FROM` er en afsender du ejer |
| Reminders kommer ikke | Bliver `/api/cron` kaldt? |
| Containeren starter ikke | `curl https://uruz.yggdrasilpanel.com/api/health` — den rører databasen |
| Gamle skærme på telefonen | Service worker-cache. Geninstallér fra hjemmeskærmen. |

---

## Konventioner

- **Brugervendt tekst findes i begge sprog**, i `/locales/`. Aldrig hardkodet —
  heller ikke sidetitler og e-mails. **Engelsk er standarden.**
- **Kodekommentarer er engelske**, og forklarer *hvorfor*, ikke *hvad*.
- **Domænelogik hører i `/lib`**, ikke i komponenter.
- **Enhver ikke-oplagt beslutning skrives i `DECISIONS.md`** med begrundelse.
- Tests dækker ren logik. UI verificeres i browseren — og et skærmbillede er
  mere troværdigt end en måling.
