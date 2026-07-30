# Arkitektur

> Dansk originaltekst, frosset 30. juli 2026. Den vedligeholdte udgave er den
> engelske [ARCHITECTURE.md](ARCHITECTURE.md).

Hvordan Uruz hænger sammen, og hvorfor det er skruet sådan sammen.
Beslutninger med begrundelse ligger i [DECISIONS.md](DECISIONS.md).

---

## Det korte overblik

```
┌─────────────────────────────────────────────────────────────┐
│  UI  (React Server + Client Components)                     │
│  src/app/**            sider og API-ruter                   │
│  src/components/**     komponenter, ingen domæne-logik       │
└───────────────┬─────────────────────────────────────────────┘
                │  kalder kun ind i /lib
┌───────────────▼─────────────────────────────────────────────┐
│  DOMÆNE  (rene funktioner — ingen I/O, fuldt testet)        │
│  strength.ts   1RM, PR-detektion, progression               │
│  stats.ts      al statistik                                 │
│  gamification  badges, rang, milepæle, rangliste            │
│  coach/        indsigter, Mimir, tilpasning af træning      │
└───────────────┬─────────────────────────────────────────────┘
                │
┌───────────────▼─────────────┐   ┌──────────────────────────┐
│  DATA  src/lib/db           │   │  TJENESTER               │
│  repo/*  repositories       │   │  ai/provider   (LLM)     │
│  én flade, to backends:     │   │  notify/push   (VAPID)   │
│   • node:sqlite  (lokalt)   │   │  notify/email  (Resend)  │
│   • Supabase/Postgres + RLS │   │  auth/         (passkeys)│
└─────────────────────────────┘   └──────────────────────────┘
```

Den bærende regel: **UI kender ikke databasen, og domænet kender ikke UI.**
Alt der kan regnes ud, regnes ud i rene funktioner der kan unit-testes uden at
starte hverken browser eller database.

---

## Lagene

### 1. Domænet — `src/lib/domain`, `src/lib/coach`

Rene funktioner. Ingen `fetch`, ingen database, ingen React.

| Fil | Ansvar |
|---|---|
| `types.ts` | Datamodellen. Én sandhed om formen på alting. |
| `strength.ts` | Estimeret 1RM (Epley), volumen, PR-detektion, de tre progressionsmodeller. |
| `stats.ts` | Al statistik: uger, tonnage, fremmøde, muskelbalance, stimer, sjove enheder. |
| `gamification.ts` | Badge-evaluering, rang-point, milepæle, rangliste-sortering. |
| `coach/insights.ts` | Regelbaserede træningsindsigter (plateau, ubalance, forsømt øvelse, deload, smerte). |
| `coach/adapt.ts` | Oversætter en skavank/et ønske til konkrete, validerede ændringer. |

Fordi de er rene, er hvert tal brugeren ser dækket af en test. Det er også
grunden til at Uruz kan coache **helt uden AI**: indsigterne er kode, ikke
prompt.

### 2. Data — `src/lib/db`

Et repository-lag. Resten af appen importerer fra `@/lib/db` og ser aldrig en
databasedriver.

- **Lokalt:** Nodes indbyggede `node:sqlite`. Nul opsætning — derfor virker
  `npm run dev` uden konti eller nøgler.
- **Produktion:** Supabase/Postgres med **Row Level Security**
  (`supabase/migrations/0002_rls.sql`). Adgangskontrol ligger i databasen, så
  en fejl i app-koden ikke kan lække en andens træningslog.

Ranglisten i Postgres er en `security definer`-funktion der **kun** returnerer
aggregater. En privat profil er stadig med i kappestriden uden at dele rådata.

### 3. Tjenester

| Modul | Noter |
|---|---|
| `ai/provider.ts` | Én `chat()` over Anthropic, OpenAI, Google, Ollama og enhver OpenAI-kompatibel server. Skrevet med `fetch` frem for SDK'er, så en nøglefri model på eget net er et førsteklasses tilfælde. Håndterer reasoning-modeller. |
| `auth/` | Opake server-sessioner i httpOnly-cookie. Passkeys via `@simplewebauthn`, magic-link som fallback. Ligger bag én flade, så Supabase Auth kan træde i stedet. |
| `notify/` | Web Push (VAPID) med e-mail som fallback, og ravnenes tekstbanker. |
| `offline/` | IndexedDB-kø + synk. |
| `i18n/` | `core.ts` (delt), `server.ts` (server), `I18nProvider` (klient). |

---

## Sådan flyder et sæt gennem systemet

Det er appens vigtigste vej, så den er værd at følge:

```
Brugeren trykker "Log sæt"
   │
   ├─→ UI'et viser sættet MED DET SAMME (optimistisk)
   │
   ├─→ Sættet får et uuid i browseren  ← gør genafspilning idempotent
   │
   ├─→ Lægges i IndexedDB-køen         ← overlever reload og flytilstand
   │
   └─→ Køen tømmes mod /api/sessions/log-set
          │
          ├─→ Serveren afviser dubletter på id
          ├─→ PR-detektion i samme kald  ← reglerne findes ét sted
          └─→ Rekorder gemmes
```

Er der intet net, bliver sættet liggende i køen og sendes af sig selv, når
forbindelsen er tilbage. Rækkefølgen bevares: køen stopper ved første
netværksfejl frem for at springe over.

---

## Mimir

```
Brugerens besked ─┐
Egne data ────────┼─→ anonymiseret sammendrag ─→ model ─→ valideret svar
Skavanker/ønsker ─┘                                          │
                                                             ▼
                                              forslag brugeren godkender
```

Tre regler der ikke kan forhandles:

1. **Kun anonymiserede aggregater** forlader serveren. Modellen ser tal og
   øvelsesnavne — aldrig navn, e-mail eller id'er.
2. **Modellen opfinder ikke øvelser.** Den vælger fra en liste af id'er, og
   hvert id valideres mod biblioteket bagefter.
3. **Fejler modellen, coacher appen videre** på de regelbaserede indsigter.
   En model-nedbrud koster aldrig brugeren hans coaching.

---

## Klar til Yggdrasil Panel

Uruz er bygget til senere at kunne hænge under et større panel:

- **Sti:** sæt `NEXT_PUBLIC_BASE_PATH=/uruz`, så flytter hele appen sig.
- **Auth:** al session-håndtering går gennem `src/lib/auth/session.ts`. Skal
  panelet levere identiteten, er det den ene fil der skal skiftes.
- **Data:** alt hænger på `hall_id`, så flere grupper kan bo i samme
  installation uden at se hinanden — RLS håndhæver det allerede.
- **Domænet er UI-frit**, så statistik og coaching kan genbruges i en
  panel-widget uden at trække React-komponenter med.

---

## Test

```bash
npm test
```

104 tests, alle på ren logik:

| Fil | Dækker |
|---|---|
| `strength.test.ts` | 1RM, volumen, PR-regler, alle tre progressionsmodeller |
| `stats.test.ts` | Uge-grænser, stimer, konsistens, balance, sjove enheder |
| `logging.test.ts` | Hele log-vejen mod en rigtig database, inkl. idempotent genafspilning |
| `gamification.test.ts` | Badge-kriterier, rang, milepæle, rangliste |
| `adapt.test.ts` | Smerte-genkendelse, sikre alternativer, anvendelse af forslag |

Testene kører mod en midlertidig SQLite-fil, så de er hurtige og rører aldrig
rigtige data.

---

## Mappestruktur

```
src/
  app/
    (app)/          appen bag login (træn, statistik, valhal, mig, admin …)
    api/            API-ruter (log, coach, push, cron, export)
    login/ welcome/ invite/    offentlige sider
  components/
    app/ auth/ train/ library/ stats/ valhal/ coach/ admin/ exercise/ ui/
  lib/
    domain/  db/  coach/  ai/  auth/  notify/  offline/  i18n/
locales/          da.json, en.json
supabase/migrations/   produktions-skema + RLS
scripts/          setup, seed, demo-historik, ikoner, VAPID
tests/            unit- og integrationstests
```
