# Beslutninger (DECISIONS)

En løbende log over ikke-oplagte valg og antagelser truffet under bygningen af
Uruz, jf. instruktionen i afsnit 0 ("notér antagelsen i `DECISIONS.md`").
Nyeste øverst inden for hver fase.

## Tilføjelse — skavanker & ønsker (Mimir tilpasser træningen)

*(Ønsket undervejs: "man skal kunne skrive til AI og fortælle en skavank eller
et ønske, og den skal rette træningen til eller komme med forslag".)*

- **Mimir foreslår, mennesket bestemmer.** Et forslag ændrer aldrig noget af
  sig selv. Brugeren ser hver ændring (byt / justér / fjern) med begrundelse og
  godkender. Resultatet gemmes som en *kopi* — det oprindelige program
  overlever, så en tilpasning til en øm skulder ikke umærkeligt bliver den
  permanente plan.

- **Modellen må aldrig opfinde øvelser.** Den får en liste af id'er og må kun
  vælge derfra; hvert id valideres mod biblioteket før forslaget vises. Ukendte
  id'er kasseres — de gættes ikke.

- **Skavanker og ønsker huskes.** De gemmes i `user_constraints` og lægges ind i
  *alle* senere Mimir-kald. Verificeret: efter "min skulder gør ondt" fjernede
  Mimir skulderpres i en senere, helt urelateret forespørgsel om tid og ryg —
  med begrundelsen "grundet dine smerter". De kan ses og afmeldes i UI'et, for
  brugeren skal kunne se hvad coachen tager hensyn til.

- **Byt slår fjern.** Modellen udtrykker rutinemæssigt "erstat X" som *både* en
  bytning og en fjernelse af X. Læst bogstaveligt ville øvelsen bare forsvinde,
  fordi fjernelser anvendes først. Bytningen vinder — det var tydeligvis
  meningen. (Fanget i den første live-test.)

- **En træning kan aldrig tømmes helt.** Fjernelser der ville efterlade nul
  øvelser kasseres.

- **Smerte udløser altid lægehenvisningen**, uafhængigt af hvad modellen
  finder på: teksten flages server-side ud fra ordvalg, og UI'et viser noten.

## Fase 8 — Mimir (AI-coach)

*(Ønsket undervejs: "man skal kunne vælge AI-udbyder: alle de kendte + custom".)*

- **Én `chat()`-flade, mange udbydere.** Anthropic, OpenAI, Google, Ollama og
  enhver OpenAI-kompatibel server (llama.cpp/llama-swap, LM Studio, vLLM,
  OpenRouter …) — valgt udelukkende med `AI_PROVIDER`/`AI_BASE_URL`/`AI_MODEL`.
  Resten af appen ved ikke hvem der svarede. Kaldene er skrevet med `fetch`
  frem for udbyder-SDK'er, så alle udbydere behandles ens og en nøglefri,
  selvhostet server virker uden særbehandling.

- **Ingen API-nøgle er en gyldig opsætning.** En model på eget net har typisk
  ingen nøgle; `Authorization` sendes kun hvis der faktisk *er* en nøgle,
  fordi nogle lokale servere afviser en tom bearer-token.

- **Appen coacher også uden model.** `insights.ts` udleder konkrete forslag
  (plateau, ubalance, forsømt øvelse, stime, deload, smerte i noter) direkte af
  data. Det er både fallback ved model-fejl *og* den fulde oplevelse hvis man
  ikke ønsker AI. En model-nedbrud koster aldrig brugeren sin coaching.

- **Reasoning-modeller kræver særlig håndtering** (fundet i test mod Gemma-4
  26B): modellen brugte hele token-budgettet på skjult "tænkning" og
  returnerede tomt svar. Nu: budgettet er hævet, `<think>`-blokke strippes,
  tomt svar med `reasoning_content` giver en tydelig fejl i stedet for tavshed,
  og `chat_template_kwargs.enable_thinking=false` sendes til selvhostede
  servere — det bragte svartiden fra ~21 s til under 1 s. Feltet sendes *kun*
  til selvhostede endpoints, da OpenAI afviser ukendte felter.

- **Kun anonymiserede aggregater forlader serveren.** Modellen får tal og
  øvelsesnavne — aldrig navn, e-mail eller id'er.

- **Sikkerhedsreglerne står over tonen.** Uanset "blød/hård" coach-tone må
  Mimir ikke give kost-, kalorie- eller vægttabsråd, ikke love helbredelse, og
  skal henvise til læge ved smerte. Reglen om kost blev skærpet efter at
  modellen i test selv begyndte at rådgive om proteinindtag.

## Fase 7 — Reminders & notifikationer (Huginn & Muninn)

- **Ris må aldrig blive skam.** Ravnenes tekster ligger i faste banker med to
  toner. Selv "hård" tone er kontant og drillende — aldrig nedladende, og
  aldrig et ord om krop eller vægt. Der nudges tidligst efter 4 dage (2-3
  træninger om ugen betyder helt normale hviledage) og aldrig efter 21 dage:
  så tier appen hellere end at blive en dårlig samvittighed.

- **Ingen reminder til den der allerede har trænet i dag.** Verificeret: cron
  sprang reminderen over da dagens træning var logget, og sendte den da
  træningen var 5 dage gammel.

- **Har en hal-kammerat trænet, bruges rivalise-teksten i stedet.** Så bliver
  reminderen "Ib har lagt en træning i hallen. Skal den stå uimodsagt?" frem
  for en generisk påmindelse (afsnit 8).

- **Push først, e-mail som fallback.** Uden en registreret enhed går beskeden
  på e-mail, så en reminder aldrig forsvinder i stilhed. Beskeden gemmes
  desuden altid i appen, uanset om leveringen lykkes.

- **Beskeder vælges deterministisk ud fra et seed**, så samme dag ikke skifter
  tekst ved hver gengivelse.

- **Cron nægter at køre uden `CRON_SECRET`.** Endpointet sender beskeder til
  rigtige mennesker, så det fejler lukket frem for at defaulte til åbent.
  Alt arbejdet er idempotent — kører den for ofte, sker der intet.

- **iOS kræver installation før push.** `pushSupport()` skelner mellem "ikke
  understøttet" og "føj appen til hjemmeskærmen først", fordi det første ville
  være direkte misvisende på en iPhone.

## Fase 6 — Gamification

- **Badges genberegnes fra historikken, ikke ved hændelser.** I stedet for at
  tælle op når noget sker, evalueres alle mærker mod hele træningshistorikken.
  Så kan en offline-afspilning, et rettet sæt eller en overset hændelse aldrig
  efterlade en bruger med et forkert mærke — data er facit.

- **Kriterier ligger i data (`criteria_json`).** Koden kender kun kriterie-
  *typerne* (antal træninger, rekorder, uge-stime, før-kl-X, hele biblioteket),
  så nye mærker kan seedes uden en ny deploy.

- **Rang beregnes af historikken, også for andre i hallen.** Den gemte
  `rank_level`-kolonne opdateres kun når *den* bruger åbner appen; ranglisten
  ville derfor vise en hal-kammerat med forældet rang (fanget i browseren: Ib
  stod som "Thræl" med præcis samme tal som Kristians "Jarl"). Ranglisten
  udleder derfor rangen fra data.

- **Fremmøde vejer tungest i rang-point** (2 pr. træning, 1 pr. rekord, 3 pr.
  uge i stimen). At møde op er det appen belønner — ikke at være stærkest.

- **Ranglisten deler kun aggregater.** Kun totaler, stime og ugens antal
  forlader serveren, aldrig rå sæt-logs, så en privat profil stadig kan være
  med i den venlige kappestrid (afsnit 2).

## Fase 5 — Statistik

- **Al statistik er rene funktioner.** `src/lib/domain/stats.ts` kender hverken
  database eller React, så hvert tal brugeren ser er unit-testet (31 tests).
  UI-laget formaterer kun det, funktionerne returnerer.

- **Uger starter mandag, datoer er lokale.** ISO-uger er hvad danskere forventer,
  og dag-nøgler bygges af lokale felter — ellers ville en træning kl. 23:30
  lande på den forkerte dag i statistikken.

- **Stimen brydes ikke af en igangværende uge.** Har man trænet i sidste uge,
  men endnu ikke i denne, tæller stimen stadig: ugen er ikke forbi endnu. Det
  er en motivations-app, ikke en dommer.

- **Konsistens måles pr. uge og kan ikke "spares op".** Fem træninger i én uge
  udligner ikke syv tomme uger — hver uge bidrager højst sit mål. At møde op
  jævnt er pointen (afsnit 13).

- **Muskelvolumen krediteres hver primær muskel.** Det måler *eksponering*, ikke
  fysiologi, og er præcis nok til at gøre "meget pres, lidt træk" synligt.
  Ubalance flages først ved mindst 10 sæt, så tidlige tal ikke skræmmer.

- **Styrke-standarder er grove og vejledende.** Maskiner varierer voldsomt
  mellem fabrikanter, så niveauet vises som en indikation relativt til
  kropsvægt — aldrig som en facitliste.

- **Sjove enheder vælges så tallet kan forestilles.** Enheden skaleres til et
  tal mellem 1 og 100 ("9,8 × bybus" frem for "0,03 × blåhval").

- **Demo-historik som script.** `npm run db:seed:history` genererer ~12 ugers
  realistisk træning med deterministisk tilfældighed, så statistik, badges og
  Valhal kan ses og testes før der findes rigtige data.

- **CSV med semikolon og BOM.** Dansk Excel forventer semikolon som separator,
  og uden BOM bliver æ/ø/å til volapyk.

- **Recharts-fælder (fundet ved verifikation i browseren):** `<Line>` skal være
  *direkte* barn af `<LineChart>` — pakket i et React-fragment tegnes kurven
  ikke, helt uden fejlbesked. Og y-aksens `domain` beregnes eksplicit i stedet
  for `"dataMin - 5"`-strengformen, som gav et tomt plot.

## Tilføjelse — sprogvalg & øvelsesvisning

*(Ønsket undervejs: "valg af sprog eller kun engelsk" + "illustration eller
billeder af øvelsen".)*

- **Sprog er en brugerindstilling, ikke en build-flag.** Dansk og engelsk ligger
  som hver sin fil i `/locales`. Valget gemmes både på brugeren (`locale_pref`)
  og i en cookie, så login-, invitations- og installationssiderne — som vises
  *før* man er logget ind — også rammer det rigtige sprog. Brugerens gemte valg
  vinder over cookien når man er logget ind.

- **Øvelsesindholdet er også oversat, ikke kun knapperne.** Et engelsk UI med
  danske øvelsesnavne ville være halvt arbejde, så øvelser har `name_en`,
  `instructions_steps_en`, `cues_en` og `safer_variant_en`, og de syv+ færdige
  skabeloner har `name_en`/`description_en`. Alt falder tilbage til dansk hvis
  en oversættelse mangler — biblioteket viser aldrig blanke felter.
  Brugerens *egne* træninger oversættes ikke: de hedder det, brugeren skrev.

- **Illustration eller foto pr. bruger.** Øvelser har et valgfrit `image_url`;
  indstillingen `media_pref` vælger mellem stregtegning og foto. Illustrationen
  er altid fallback — den virker offline, kræver intet netværk og findes for
  hver øvelse. Et foto der ikke kan hentes falder lydløst tilbage til tegningen.

- **Aldrig importér en mappe fra en klientkomponent.** `@/lib/i18n` (mappen)
  gav en ubrugelig runtime-fejl (`Cannot read properties of undefined`), fordi
  mappen også indeholder `server.ts` med `server-only`. Delt i18n-kode ligger
  derfor i `@/lib/i18n/core` og importeres altid med fuld sti.

- **Service workeren registreres ikke i udvikling.** Den cacher `/_next/static/`
  cache-first; i dev skifter chunk-navne hele tiden, så en cachet chunk holder
  op med at passe til HTML'en og hydrering dør. En allerede installeret worker
  afregistreres aktivt i dev.

## Fase 3 — Kerne-logning

- **Klient-genererede id'er gør synk idempotent.** Hvert sæt får et uuid i
  browseren *før* det sendes. Serveren afviser dubletter på id, så en kø der
  afspilles to gange (offline → online, eller to faner) aldrig dobbeltlogger
  eller uddeler samme rekord igen. Verificeret i test og i browseren.

- **Offline-kø i IndexedDB, ikke i service workeren.** iOS Safari mangler
  Background Sync; køen ligger derfor i IndexedDB og tømmes af appen (ved
  mount, ved `online`, og efter hver skrivning). Rækkefølgen bevares: køen
  stopper ved første netværksfejl i stedet for at springe over.

- **4xx dropper en kø-post, 5xx prøver igen.** Et permanent afvist kald (fx
  slettet session) må ikke blokere alle senere sæt bag sig. Efter 8 forgæves
  forsøg opgives posten, så køen ikke bliver "forgiftet".

- **PR-detektion sker server-side i samme kald som indsættelsen.** Reglerne
  findes ét sted (`prCandidatesForSet`/`newRecords`), og klienten spørger
  bagefter kun "slog det en rekord?" — så fejring og data aldrig er uenige.
  En rekord skal slås *strengt*, så man ikke fejrer at gentage sin egen bedste.

- **Epley-formlen til estimeret 1RM.** Almindelig gym-standard og rimelig i
  det 1–12 reps-område Uruz sigter mod. Vises altid som *estimat*.

- **Vægtforslag rundes til noget der findes i centret.** 2,5 kg-spring over
  20 kg, 1 kg under — ellers foreslår appen 61,7 kg, som ingen maskine kan
  indstilles til.

## Fase 2 — Auth & brugere

- **Opake server-sessioner i httpOnly-cookie.** I stedet for JWT i klienten
  gemmes et tilfældigt token i `auth_sessions` og sættes som httpOnly,
  SameSite=Lax cookie (secure i produktion). Det gør "log ud på alle enheder"
  triviel (slet brugerens rækker) og holder tokens uden for JavaScript.

- **Passkeys via `@simplewebauthn` v13, ikke Supabase Auth.** Supabase' egen
  WebAuthn-understøttelse er ikke ensartet tilgængelig; `@simplewebauthn` virker
  ens på begge backends og holder auth bag vores egen `AuthProvider`-flade, som
  instruktionen kræver (afsnit 3). Magic-link er indbygget fallback.

- **Ingen lækage af kontoeksistens.** `/api/auth/magic/request` svarer altid
  `{ok:true}`, og passkey-login-options returnerer gyldige options selv for
  ukendte e-mails. Kun reelle, aktive brugere får faktisk sendt et link.

- **Magic-tokens er engangs.** Token markeres brugt ved indløsning; genbrug
  afvises (verificeret). Levetid 30 min, invitationer 14 dage.

- **Første kørsel seeder biblioteket.** `/api/auth/first-run` opretter hal +
  admin *og* kører indholds-seed, så en frisk produktionsopsætning har øvelser
  og skabeloner fra første login uden at køre scripts.

- **Passkey-registrering er valgfri ved onboarding.** Brugeren er allerede
  logget ind via session, så "Fortsæt" springer den over — ellers ville en
  enhed uden authenticator kunne låse sig selv ude.

## Fase 1 — Fundament

- **`Startprogram.html` fandtes ikke i mappen.** Instruktionen henviser til den
  som kilde til øvelsesindhold, men filen var ikke til stede. Øvelsesindholdet
  (trin, cues, sikre varianter) er derfor skrevet ud fra beskrivelsen i afsnit
  15 og almindelig, forsigtig træningsvejledning. Erstattes gerne med det
  faktiske indhold hvis filen dukker op.

- **To datalag bag én grænseflade.** Appen kører som standard på et indbygget
  **`node:sqlite`**-lager (Node 26) — nul eksterne afhængigheder, så appen
  virker med det samme og kan testes lokalt. Produktionsmålet er **Supabase
  Postgres med Row Level Security** (leveres som migrationer + policies +
  adapter). Al dataadgang går gennem `@/lib/db`, så backend kan skiftes uden at
  røre UI. Begrundelse: instruktionen kræver Supabase/RLS *og* at appen er
  triviel at køre for en ikke-tekniker — de to hensyn forenes ved at gøre
  backend'en udskiftelig.

- **RLS i produktion; repository-scoping i dev.** Row Level Security hører til
  Postgres/Supabase. Det lokale sqlite-lag har ikke RLS; i stedet håndhæver
  repository-laget samme adgangsregler (bruger ser kun egne rå-logs, admin ser
  hele hallen). DoD-kravet om RLS opfyldes af Postgres-policyerne.

- **Tailwind v4 (CSS-først).** Semantiske farve-variabler på to akser
  (mørk/lys × norse/plain) sat via `data-mode`/`data-theme` på `<html>`. Et
  inline-script sætter temaet før første paint for at undgå flash.

- **`tsx` til scripts.** Seed/reset/gen-scripts deler kode med appen (sti-alias
  `@/*`, extensionless `.ts`-imports). Node's rå type-stripping resolver ikke
  disse; `tsx` gør, og er standardværktøj.

- **Ikoner uden billed-afhængigheder.** PWA-ikonerne genereres af en lille,
  ren PNG-encoder (Node's indbyggede `zlib` + CRC) der rasteriserer ᚢ-runen.
  Ingen `sharp`/`canvas` native build-afhængighed.

- **Demobrugere i seed (valgfrit).** `npm run db:seed` lægger kun indhold
  (øvelser, skabeloner, badges). `npm run db:seed:demo` opretter desuden
  admin (Kristian) + en ventende invitation til Ib (kode `IBIBIBIB`), så appen
  kan udforskes straks (afsnit 15). En ren produktions­opsætning bruger i
  stedet admin-først-onboarding ved første kørsel.

- **Offline-kø klient-side.** iOS Safari mangler Background Sync, så
  sæt-logningens offline-kø lever i IndexedDB på klienten og tømmes når nettet
  er tilbage. Service workeren står kun for app-skal-caching. (Bygges i fase 3.)
