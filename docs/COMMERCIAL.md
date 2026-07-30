# Uruz i to spor — en plan

Udkast til diskussion, 29. juli 2026. Ikke besluttet, ikke bygget.

Målet: man kan hente Uruz og hoste den selv, **eller** oprette en konto på
uruz-training.com og lade den køre hos os. Begge spor skal vedligeholdes lige
godt — det kommercielle må ikke blive det rigtige produkt og det åbne en rest.

---

## Det ene valg alt andet hænger på

Skal hostede kunder dele én database, eller have hver sin?

Jeg har set efter i koden, og svaret er tydeligere end forventet.

**Appen kører kun på SQLite.** `DATA_BACKEND` optræder ikke ét sted i kildekoden.
Supabase-sporet er et *skema* i `supabase/migrations/` og ingen adapter — README
lover mere end koden holder. Det er værd at vide, før man planlægger noget
ovenpå det.

**Men RLS-skemaet er allerede skrevet flerlejer-agtigt:** `current_hall_id()`
udleder hallen af den indloggede bruger, og hver policy filtrerer på den. Den
tænkning findes, den er bare aldrig kørt.

**Og kun seks filer antager at der findes én hal** — `getAnyHall()` i session,
cron, dispatch, seed, first-run og repoet selv. Flerlejer er altså ikke en
omskrivning, men det er heller ikke gratis.

### Anbefaling: én container pr. hold

Ikke fælles database. **Samme container-image som folk selv henter, én instans
og én SQLite-fil pr. hold.** Præcis som Yggdrasil allerede sår runer i dag.

Det lyder gammeldags. Det er den rigtige beslutning her, og grunden er den
betingelse du selv stillede:

> *begge løsninger skal vedligeholdes sideløbende*

Med én container pr. hold **findes der ingen kommerciel kodebase.** Det hostede
produkt *er* driften — provisionering, backup, opdatering — og ikke en variant
af appen. Der kan ikke opstå en gren hvor den betalende kunde får noget den
selvhostende ikke får, fordi de kører nøjagtig samme byte.

Hvad det ellers giver:

- **Isolationen er fysisk.** Ingen RLS-policy der kan skrives forkert og lække
  én kundes træningslog til en anden. For helbredsnære data er det ikke ingenting.
- **Eksport er allerede løst.** `/api/export` (JSON og CSV) og `/api/account/delete`
  findes. En kunde kan tage sine data og gå — og selv hoste videre på dem.
- **Ingen ny kode, ingen ny risiko.** Der skal ikke skrives en Supabase-adapter,
  og RLS-policyerne skal ikke afprøves i produktion for første gang med
  fremmedes data i.

Hvad det koster:

- **Hukommelse.** Uruz står på ~74 MB i tomgang. En 32 GB-maskine kan bære et
  par hundrede hold med luft. Det rækker langt forbi 50–100 beta-konti, og
  formentlig forbi hvor det her nogensinde kommer.
- **Opdatering er en flåde, ikke én knap.** Skal løses med et script fra dag ét,
  ikke i hånden pr. kunde.
- **Grænsen findes.** Ved tusinder af hold holder det op. Det er et luksusproblem
  at få, og den dag findes flerlejer-sporet stadig — skemaet ligger der.

### Hvornår man skal skifte mening

Skriv triggeren ned nu, mens den er billig at være ærlig om: **hvis en maskine
ikke længere kan bære flåden, eller driften tager mere end en aften om måneden.**
Så skrives Supabase-adapteren, de seks filer bliver hal-bevidste, og RLS
afprøves ordentligt. Ikke før.

---

## Det der mangler, uanset spor

Alt herunder hører i det åbne repo. Ikke fordi det er pænt, men fordi en
selvhostende med to træningsgrupper har præcis samme behov.

| Hvad | Hvorfor det ikke findes i dag |
|---|---|
| **Tilmelding** | `isFirstRun()` opretter den *eneste* hal. Der er ingen "opret konto nummer to". |
| **Flere haller pr. installation** | De seks `getAnyHall()`-steder. Nødvendigt for selvhostere med to hold — og for os, hvis vi senere samler kunder. |
| **En LICENS** | Se nedenfor. Den er vigtigst, og den mangler helt. |
| **Sundhedstjek der duer til overvågning** | `/api/health` findes og rører databasen. Skal udvides med version, så en flåde kan ses under ét. |
| **Opdatering af en flåde** | Script der ruller et nyt image ud over N containere, én ad gangen, med rulning tilbage hvis sundhedstjekket fejler. |

Det kommercielle spor har derudover sit *eget* lag, som ikke hører i appen:

- provisionering (opret container, subdomæne, backup-plan)
- abonnementstilstand (aktiv, i restance, opsagt)
- fakturering

**Det lag hører uden for repoet** — en lille tjeneste, eller en rune i Yggdrasil.
Så snart betaling kan mærkes inde i appen, er der to varianter at vedligeholde.

---

## Licensen — det mest presserende

**Repoet har ingen licensfil.** Det er offentligt, men uden licens er alle
rettigheder forbeholdt: ingen har juridisk lov til at hoste det selv. Det åbne
spor findes altså ikke endnu, uanset hvad README siger.

Tre veje:

**MIT** — enhver må gøre hvad som helst, også hoste det kommercielt. Simpelt,
velkendt, maksimal udbredelse. Nogen *kan* konkurrere med dig på din egen kode;
i praksis sker det først når produktet er stort nok til at det kan betale sig.

**AGPL-3.0** — hosting er tilladt, men den der hoster skal offentliggøre sine
ændringer. Beskytter mod at en større aktør bygger en lukket udgave ovenpå.
Skræmmer til gengæld nogle virksomheder væk fra overhovedet at røre koden.

**Open core** — nogle funktioner kun i den betalte udgave. **Den ville jeg
fravælge.** Den bryder direkte med din betingelse: det er præcis mekanikken der
gør det åbne spor til en rest.

Til et projekt af denne størrelse ville jeg tage **AGPL-3.0**: den koster
ingenting i praksis, og den holder muligheden åben for at sige nej til en
opkøbers lukkede fork senere. MIT er også et fint valg, hvis udbredelse betyder
mere end kontrol.

---

## Betaling

### Vælg en *merchant of record*, ikke Stripe direkte

Det er den anbefaling jeg er mest sikker på, og den handler ikke om gebyrer.

Sælger du et digitalt abonnement til en privatperson i et andet EU-land, skal
der afregnes moms **i købers land**. Det håndteres via EU's One Stop Shop, som
kræver registrering, kvartalsvise angivelser og styr på hvor hver kunde bor.
For et enkeltmandsprojekt til 30 kr./md. er den administration dyrere end
omsætningen.

En *merchant of record* — Paddle, Lemon Squeezy, Polar — bliver **sælger over
for kunden**. De opkræver, afregner moms i alle lande og udbetaler til dig.
Prisen er typisk omkring 5 % oveni transaktionsgebyret. Det er billigt for at
slippe for et momsregnskab i tyve lande.

Stripe direkte er billigere pr. transaktion, men efterlader momsen hos dig.
Stripe Tax kan beregne den; **angivelsen og registreringen er stadig din.**

> Tjek de aktuelle vilkår selv, før du vælger. Både gebyrer, hvilke
> betalingsmidler de understøtter i Danmark, og om de overhovedet tager kunder
> fra dit felt. Det ændrer sig, og jeg vil ikke have du disponerer efter min
> hukommelse.

**MobilePay** er værd at undersøge særskilt. Er de første kunder danske, er det
den betalingsmåde de forventer. Understøttelsen varierer mellem udbyderne — det
kan meget vel afgøre valget.

### Hvad du faktisk sælger

Ikke funktioner — koden er den samme og gratis. Du sælger:

**at det bare kører.** Backup, opdatering, HTTPS, en mailserver der virker, og
at Face ID fungerer uden at nogen skal forstå hvad en RP ID er.

**Mimir uden opsætning.** Det er dit egentlige kort. Du kører allerede en model
på egen hardware, så den variable omkostning er nær nul, hvor en konkurrent
betaler pr. token. Den selvhostende kan sætte sin egen model på — men skal selv
skaffe den.

### Model

| | Selvhostet | Hostet |
|---|---|---|
| Pris | 0 | et lille beløb pr. hold |
| Kode | den samme | den samme |
| Mimir | egen model eller egen nøgle | inkluderet |
| Backup, opdatering, mail | dit ansvar | vores |

**Pr. hold, ikke pr. bruger.** Folk træner sammen — et par, en makkergruppe,
en familie. "Op til 5 personer" passer til virkeligheden, og én pris er lettere
at forstå og at sælge end en der stiger for hver ven man inviterer. Det fjerner
også incitamentet til at dele én konto.

Om beløbet: hold det lavt nok til at ingen skal tænke over det. Det her bliver
ikke en levevej, og prissat som om det skulle, sælger det ikke. Et sted mellem
en kop kaffe og en frokost om måneden, pr. hold.

**Grandfather beta-holdene.** De første 50–100 har taget risikoen ved at bruge
noget der selv kalder sig tidlig udvikling. Lad dem beholde deres pris — også
hvis den er nul. Det koster næsten ingenting og køber velvilje der ikke kan
købes for penge.

---

## Det juridiske, der ikke kan springes over

To ting ændrer sig i det øjeblik der kommer penge ind.

### Ansvarsfraskrivelsen holder ikke længere

Der står i dag, på både site og README:

> *Provided as-is, with no warranty and no liability whatsoever*

Det er en rimelig ting at sige om noget man forærer væk. **Over for en betalende
forbruger i EU kan man ikke fraskrive sig alt** — købelovens mangelsregler og
forbrugeraftaleloven gælder uanset hvad der står i en tekst. Fraskrivelsen kan
blive stående for det åbne spor. Det hostede har brug for rigtige vilkår:
oppetid uden garanti, men med en ærlig beskrivelse; opsigelse; hvad der sker med
data bagefter.

### Træningsdata er tættere på helbredsdata end man tror

En træningslog med kropsvægt, skavanker og hvad Mimir har fået at vide om en
øm skulder er ikke almindelige kundedata. Under GDPR kan det falde i
**særlige kategorier** (artikel 9), hvor kravene er skarpere.

Det er til at håndtere, men det skal håndteres:

- en databehandleraftale, hvis hold bruger det i en klub- eller
  arbejdssammenhæng
- en privatlivspolitik der siger hvad der gemmes, hvor længe, og hvem der kan se
  det
- **hvad der sendes til AI'en.** Kører modellen på din egen hardware, er svaret
  "ingenting forlader huset" — det er et stærkt kort, og det bør stå tydeligt.
- sletning der virker. `/api/account/delete` findes allerede; det skal også
  gælde backup efter en rimelig frist.

Fysisk adskilte databaser pr. hold hjælper også her: der er ikke et fælles bord
hvor en fejl kan blande to kunders data.

---

## Rækkefølge

**Først, og uden det giver resten ingen mening**

1. Vælg og læg en **LICENS** i repoet
2. Skriv **flere haller pr. installation** færdig — de seks `getAnyHall()`-steder
3. En **tilmeldingsside** der opretter en hal og dens første admin

**Derefter — driften, uden for repoet**

4. Provisionering: opret container + subdomæne + backup fra én kommando
5. Flåde-opdatering med sundhedstjek og rulning tilbage
6. Overvågning: hvilke instanser kører, hvilken version, hvornår sidst set

**Så — beta**

7. Luk 50–100 hold ind, gratis, uden betaling overhovedet i systemet endnu
8. Find ud af hvad der i virkeligheden går galt i drift, før nogen har betalt

**Til sidst — penge**

9. Vælg udbyder, opret vilkår og privatlivspolitik
10. Abonnementstilstand i provisioneringslaget, ikke i appen
11. Åbn for betaling, og lad beta-holdene beholde deres pris

Betaling til sidst er ikke udskydelse. **Det er billigere at opdage at drift af
100 instanser er for besværligt, før nogen har betalt for et år.**

---

## Det jeg ville være mest nervøs for

**At driften bliver et andet job.** 100 containere der skal opdateres, backes op
og holdes i live er ikke en aften om måneden, hvis det gøres i hånden. Automatikken
skal findes *før* kunderne, ikke efter.

**At supporten kommer.** Det øjeblik nogen betaler 30 kroner, har de en mening om
hvornår du svarer. Sæt forventningen skriftligt og lavt fra begyndelsen.

**At det åbne spor sygner hen af sig selv.** Ikke ved en beslutning, men fordi
det haster mere når en betalende kunde skriver. Det er derfor én container pr.
hold er det rigtige svar: så *kan* de to spor ikke skilles ad.

**At Face ID stadig ikke er bekræftet på en rigtig iPhone.** Det står stadig
øverst på listen over uverificerede ting, og det er den slags der skal virke,
før nogen betaler for at slippe for at tænke over det.
