# Beslutninger (DECISIONS)

> Dansk originaltekst, frosset 30. juli 2026. Den vedligeholdte udgave er den
> engelske [DECISIONS.md](DECISIONS.md).

En løbende log over ikke-oplagte valg og antagelser truffet under bygningen af
Uruz, jf. instruktionen i afsnit 0 ("notér antagelsen i `DECISIONS.md`").
Nyeste øverst inden for hver fase.

## Tilføjelse — det første rigtige træningspas afslørede

Fundet ved at bruge appen i et center, ikke ved at læse koden.

- **Vægten går 0,5 ad gangen, ikke 2,5.** Ét trin var én skive, hvilket ikke kan
  udtrykke hvad maskinerne faktisk står på: de lander på halve, og på stakke med
  helt andre spring. Et tal man ikke kan indtaste, er et tal der bliver logget
  forkert. **Hold på knappen for at gentage**, hurtigere jo længere man holder —
  ellers ville 20 til 60 være firs tryk. Feltet kan stadig tastes direkte i.

- **Sæt-rækken havde altid kunnet rettes og slettes — den så bare ikke sådan ud.**
  Funktionen fandtes; der var ingen antydning af at rækken kunne trykkes på, og
  den første der brugte appen rigtigt kunne derfor ikke rette et fejl-logget sæt.
  Et blyant-ikon var hele forskellen. Værd at huske: en funktion uden en synlig
  vej ind findes ikke.

- **En træning skal ses før den startes.** Træn-siden linkede direkte til
  `/train/start`, som opretter en session med det samme. Man kunne altså ikke
  kigge på hvad der lå i en træning uden at have startet den — og ikke fortryde.
  Nu går linket til trænings-siden, hvor indholdet står, og hvor Start,
  Dublér og Redigér i forvejen lå. Tilbage-pilen følger hvor man kom fra.

- **Arkivet manglede helt.** Tallene blev lagt sammen til statistik og aldrig
  vist som sig selv, så en forkert logget træning forblev forkert — der var
  ingen skærm at finde den på igen. `/train/history` viser dem, og den enkelte
  kan rettes med de samme sæt-rækker som den levende skærm. Én opførsel, ét sted
  at få den rigtig.

- **Rotationslås kan ikke lade sig gøre på iPhone, og det siger appen så.**
  Manifestet beder om portrait (Android følger det), og `screen.orientation.lock()`
  findes i Chromium men afviser med `NotSupportedError` uden for en installeret
  app — målt, ikke antaget. iOS Safari har ingen af delene. Kontakten vises kun
  hvor den virker; ellers står der hvor iPhonens egen låseknap sidder. En kontakt
  der ikke gør noget, lærer folk at mistro appen.

## Tilføjelse — slet din passkey

Bygget efter Yggdrasils løsning, som Kristian bad om — men med tre af dens huller
lukket. Yggdrasil-sessionen pegede selv på dem som fejl, ikke som forskelle.

- **Sletning kræver at man siger hvem man er igen.** Yggdrasil nøjes med en levende
  session og en bekræftelses-dialog i browseren, hvilket er kosmetik. En ulåst
  telefon på en bænk skal ikke være vejen til at fjerne ejerens nøgler — samme
  begrundelse som at et kodeordsskift kræver det gamle kodeord. Er der et
  kodeord, spørges der om det; er der ikke, kræves en frisk passkey-assertion.

- **Den sidste vej ind kan ikke fjernes.** Yggdrasil har ingen sådan spærre, og
  det er forsvarligt *dér*, fordi alle brugere har et kodeord og passkeys er et
  tillæg. Uruz kan ikke antage det. Reglen ligger i `credential-removal.ts` som
  en ren funktion med seks tests: den sidste nøgle må kun gå, hvis der er et
  kodeord **eller** en mailserver der faktisk kan sende.

- **"Vi kan altid maile dig" er falsk uden mailserver.** Uden SMTP eller Resend
  skrives login-linket kun i serverens log, hvilket ikke er en vej ind for den
  der er låst ude. Derfor tæller e-mail kun med, når `emailProvider()` ikke er
  `dev`. Yggdrasil har præcis den fælde i sin glemt-kodeord-funktion.

- **Sessionerne lukkes.** Fjerner man en nøgle fordi enheden er væk, er det
  meningsløst hvis enhedens session lever videre. Vi sporer ikke hvilken session
  der kom fra hvilken nøgle, så alle lukkes og den nuværende udstedes igen.

- **Afvisningen kommer før udfordringen.** Først var rækkefølgen omvendt, så man
  kunne nå at bekræfte sig selv og *derefter* få at vide at det var ens eneste
  nøgle. Spærren røber intet en indlogget ejer ikke allerede ved om sin egen
  konto, så den hører øverst.

- **Ejerskab ligger i WHERE-klausulen**, ikke i et opslag efterfulgt af et tjek —
  så er der ingen luge imellem, og et fremmed id rammer bare nul rækker. Og
  `deleteCredential` returnerer om noget faktisk forsvandt, så et ukendt id
  giver 404 frem for et 200 der lyver.

- **Nøgler har navne.** Uden dem er listen tre ens rækker, og ingen tør fjerne
  nogen af dem. Navnet spørges der om ved oprettelse, og `last_used_at` sættes
  hvor tælleren i forvejen opdateres — det er samme øjeblik.

## Tilføjelse — engelsk som standardsprog

- **Engelsk er hvad en fremmed sandsynligvis læser.** Appen blev skrevet på dansk
  til to personer og er nu offentlig. En der ankommer uden et gemt valg, får
  engelsk; en der har valgt, beholder sit valg. Kun kolonnens standardværdi er
  ændret — ikke eksisterende rækker, for det ville skifte sproget under de to
  der har brugt appen på dansk hele tiden.

- **E-mails følger modtageren, ikke standarden.** En side der viser engelsk før
  nogen har sagt andet, er et rimeligt gæt. At skrive til en navngiven person i
  et sprog vedkommende ikke har valgt, er det ikke. Login- og
  nulstillingsmails slår brugerens `locale_pref` op ud fra e-mailadressen.
  Invitationer går til en uden konto, så der er intet valg at følge — de sendes
  i afsenderens sprog, som er det bedste bud på et fælles et.

- **Sidetitlerne var sytten danske strenge.** De er usynlige i appen selv, men
  browserfanen, historikken og navnet på et hjemmeskærms-bogmærke kommer derfra.
  De er nu `generateMetadata` med en nøgle, så de følger samme sprog som siden.

- **To sæt skærmbilleder.** Den danske forside skal ikke vise engelske skærme, og
  README — offentligt og engelsk-vendt — skal ikke vise danske. Scriptet tager
  et sprog og sætter demo-brugerens `locale_pref`, for appen følger den
  indloggede brugers valg. `npm run gen:screenshots` og `…:da`.

## Tilføjelse — appen på en skærm man ikke holder i hånden

- **Bundbjælken er svaret på tommelfingre, ikke på skærme.** På en telefon er den
  nederste tredjedel dét man kan nå; på en desktop er en bjælke klistret til
  bunden af et højt vindue strandet langt fra alt andet. Fra 768 px flytter de
  samme destinationer til en skinne i venstre side. Under 768 px sker der intet.

- **Grænsen går ved 768 px, altså iPad i portræt.** Man kan argumentere for at en
  tablet i hånden stadig er "mobil", men det er også dér indholdet bliver bredt
  nok til at bundbjælken ser forladt ud.

- **Bredden slippes ikke helt fri.** Indholdet får et loft på 1152 px. En
  tekstlinje på 1500 px er sværere at læse end en på 400. Sider der vil bruge
  mere plads, gør det ved at dele sig i spalter — ikke ved at strække sig.

- **Kortene flyder i to spalter frem for at stå i et gitter.** Et gitter
  efterlader et hul under det korte kort indtil det høje ved siden af slutter.
  Flydende spalter (`columns-2` med `break-inside-avoid`) fylder bare ud. Det
  koster at læserækkefølgen bliver spalte for spalte, hvilket er acceptabelt for
  et opslagsværk som statistik og admin.

- **Logge-skærmen beholder sit lodrette forløb — men guiden flyttede ud til
  siden.** Vægt, reps og "Log sæt" er tunet til at rammes uden at kigge, og de
  skal blive hvor tommelfingeren leder efter dem. Da instruktionerne stod
  ovenover, skubbede de knappen ned; fra 1024 px står de i en spalte ved siden
  af i stedet. Målt: knappen sidder øverst i sin spalte, uanset hvor lang
  vejledningen er.

- **Øvelseskøen findes kun når der er plads til den.** På telefonen er
  fremskridtsbjælkerne i toppen hele overblikket, og det er den rigtige handel
  når hver pixel ligger mellem en tommelfinger og et tal. På en bred skærm er
  der ingen handel: listen kan bare stå der og vise hvad der er gjort, hvad der
  mangler, og lade en springe direkte til en øvelse.

- **Telefonen er verificeret uændret, ikke antaget uændret.** Otte skærme
  fotograferet på 390 px før og efter og sammenlignet pixel for pixel: nul
  afvigende pixels. (Filernes kontrolsummer var forskellige — det er PNG-kodning,
  ikke indhold. Værd at vide, for det ligner en regression.)

## Tilføjelse — øvelsen skal kunne ses, og skærmen skal blive ved med at være tændt

- **Tegningen hører hjemme der hvor øvelsen laves.** At kende navnet på en
  bevægelse er ikke det samme som at kende bevægelsen, og at slå den op betød at
  forlade træningen, finde den i biblioteket og navigere tilbage — med
  hviletimeren kørende. Tegningen står nu ved siden af navnet, og trin og cues
  er ét tryk væk uden at gå nogen steder.

- **Guiden er foldet sammen som udgangspunkt.** Midt i en træning er vægten og
  reps det tommelfingeren rækker efter. En mur af instruktioner mellem dem og
  toppen af skærmen ville skubbe hele pointen med appen længere ned. Målt på
  390 px: "Log sæt" er stadig synlig med guiden åben.

- **Wake lock prøver igen ved første berøring.** Nogle browsere giver kun en
  lås under en brugerhandling. At komme hertil ved at trykke på en træning
  tæller med, men effekten kører et øjeblik senere, og det vindue er kort. Gik
  det galt, er næste tryk på skærmen en gratis chance til — og at logge et sæt
  *er* et tryk, så det koster brugeren ingenting. Låsen lyttes der desuden efter
  `release` på, for browseren slipper den på egne betingelser (et opkald, en
  notifikation), og uden det kom den aldrig igen.

- **iOS' strømbesparingstilstand nægter helt.** Det er dens ret, og der er intet
  at gøre ved det fra appens side. Værd at vide når skærmen alligevel slukker.

## Tilføjelse — e-mail, hallens navn og et offentligt repo

- **SMTP før Resend.** En selvhostet opsætning har som regel allerede en
  mailserver; at kræve en konto hos en tredjepart for at kunne sende et
  login-link er en unødig forhindring. Er begge sat, vinder SMTP: at taste en
  mailserver ind er bevidst arbejde, en glemt API-nøgle er det ikke. Uden nogen
  af delene skrives beskeden i loggen, hvilket er nok til at komme i gang og
  udtrykkeligt ikke nok til at blive ved med.

- **`nodemailer` er den ene nye afhængighed.** SMTP er en protokol med TLS,
  STARTTLS og autentificering; at skrive den selv for at undgå en afhængighed
  ville være dyrere end afhængigheden. Den har ingen egne runtime-afhængigheder
  og intet native build, hvilket er den linje projektet har holdt.

- **Hallen navngives af den der bygger den.** Standarden var to bestemte
  personers navne, hvilket mødte enhver anden installation med to fremmede. Nu
  spørges der ved første kørsel, med et neutralt fald-tilbage-navn, og en admin
  kan rette det bagefter — et navn valgt i en fart klokken seks om morgenen skal
  ikke være permanent.

- **Repoet er offentligt, og `CLAUDE.md` er ikke.** Arbejdsnoterne om
  produktions-værten indeholder server-id'er, interne adresser og ssh-detaljer.
  De ligger nu i `.gitignore`, så de ikke kan committes ved et uheld. HANDOFF.md
  er samtidig renset for den interne adresse og for opskriften på at logge ind
  via containerens log.

## Tilføjelse — skærmen skal blive tændt, og sitet skal kunne fylde en skærm

- **Wake lock lever præcis så længe logge-skærmen er åben.** Et hvil på halvfems
  sekunder er rigeligt til at telefonen låser, og at låse op med kalk på
  fingrene for at taste to tal er det mest irriterende ved at bruge en telefon i
  et center. Låsen tages når skærmen åbnes og slippes når man forlader den — en
  lås der overlevede træningen ville være et fladt batteri. Browseren dropper
  den selv når fanen skjules, så den tages igen ved `visibilitychange`; uden det
  holder den op med at virke efter første afbrydelse, uden at nogen opdager det.
  Ingen indstilling: det er den opførsel man vil have midt i en træning, og
  browsere der ikke kan det, gør ingenting.

- **Sitet var mobil-først og bare centreret.** På en stor skærm læste det som en
  smal spalte med to tomme marginer. Bredden, typografien og luften vokser nu
  med skærmen via `clamp()` frem for spring ved et breakpoint, så der ikke
  findes en bredde hvor layoutet synligt hopper.

- **Seks skærmbilleder på én række blev valgt fra.** De kan være der på en bred
  skærm, men hver telefon bliver så lille at tallene i den — hele pointen med at
  vise rigtige skærmbilleder — ikke kan læses. Tre store slår seks dekorative.

- **Websitet er to dokumenter, ikke en sprogknap.** `index.html` er dansk,
  `en.html` engelsk, hver med sit eget `lang`, sin `canonical` og et
  `hreflang`-link til den anden. Det er hvad en skærmlæser og en søgemaskine har
  brug for, og siden virker helt uden JavaScript. Prisen er at de to filer skal
  holdes ens — det står i `website/README.md`.

## Tilføjelse — kodeord som alternativ til passkey

*(Ønsket undervejs: "ikke alle kan bruge passkey".)*

- **Passkey forbliver anbefalingen; kodeord er alternativet.** Login-skærmen
  åbner stadig på passkey. Kodeord ligger ét tryk væk, fordi det er den
  eneste vej ind for en enhed eller browser der slet ikke kan passkeys — ikke
  fordi det er lige så godt.

- **Hashen ligger i sin egen tabel, ikke som kolonne på `users`.** Postgres-
  policyen "hall members visible" lader ethvert medlem læse hele *rækken* for
  alle andre i hallen — det er den der driver Valhal. En kodeords-hash på den
  række ville dermed være læsbar for ens egen træningsmakker. `user_passwords`
  har RLS slået til og *ingen* policies, hvilket gør den uopnåelig for
  `anon`/`authenticated` uanset hvad; kun serveren kan røre den. Afviger
  bevidst fra handoff-notens "password_hash på users".

- **Rate limiting fandtes ikke før nu.** En passkey kan ikke gættes; et kodeord
  kan. Grænsen er fem fejl pr. kvarter, talt både pr. e-mail og pr.
  kalder-adresse, så hverken én konto eller én maskine kan bruges til at male
  sig igennem. Et vellykket login nulstiller begge tællere, så almindelig brug
  aldrig nærmer sig loftet. Tilstanden ligger i hukommelsen — Uruz kører som
  én container mod én SQLite-fil, så der er præcis én proces at tælle i. Skal
  det skaleres vandret, skal tælleren i databasen.

- **Alle fejl ved login ser ens ud.** Ukendt e-mail, intet kodeord sat, forkert
  kodeord og deaktiveret konto giver samme 401. Der hashes også når der intet
  er at sammenligne med, så "findes ikke" ikke er målbart hurtigere end
  "forkert kodeord" — ellers ville de ens fejlbeskeder være til grin.

- **Et skift af kodeord kræver det gamle, og lukker alle andre sessioner.** En
  levende session er ikke bevis nok: en telefon der ligger ulåst på en bænk
  skal ikke være vejen til at låse ejeren ude. Og skifter man kodeord fordi en
  anden kender det, ville det være meningsløst at lade den andens session leve.

- **Glemt kodeord går gennem et engangslink med sit eget formål.** Linket
  erstatter det gamle kodeord som bevis, så det må ikke kunne bruges til noget
  andet: `consumeMagicToken` kræver nu et matchende formål, og et
  nulstillings-link afvises derfor af login-callbacket. Styrken tjekkes *før*
  linket bruges op — et afvist kodeord må ikke koste brugeren linket.

- **Samme styrkeregel i browser og server.** `checkPasswordStrength` er flyttet
  til `password-rules.ts` uden `server-only`, så formularen kan sige "for kort"
  med det samme. Serveren afgør stadig; klient-tjekket er en høflighed.

## Tilføjelse — appen udleder sin egen adresse

- **Forespørgslen slår en konfiguration der stadig siger localhost.**
  `NEXT_PUBLIC_APP_URL` vinder når den peger et rigtigt sted hen, men
  defaulten `http://localhost:3000` er ikke et svar — det er fraværet af et.
  Kom forespørgslen tydeligvis ikke fra localhost, læses `x-forwarded-host` /
  `x-forwarded-proto` i stedet. Det er dét der gør, at en selvhostet opsætning
  bag en proxy virker uden håndkonfiguration. Rækkefølge: konfiguration,
  forespørgsel, localhost.

- **At stole på forwarded-headere er et bevidst valg.** Operatøren ejer sin
  egen proxy, og en eksplicit sat adresse vinder altid, så en installation der
  bekymrer sig kan låse den fast. Admin-panelet siger nu når adressen er
  udledt frem for sat.

- **`rpConfig()` blev asynkron.** Adressen kommer nu fra forespørgslen, og
  `headers()` er async i Next 15. Det smitter af på `checkWebAuthnConfig()` og
  admin-siden, men holder passkey-domænet og login-links på én sandhed.

- **Passkey-understøttelse afgøres efter mount.** `passkeySupported()` kigger
  på `window` og var derfor falsk på serveren og sand i browseren — første
  paint var uenig med serveren, og React smed hele træet væk og byggede det
  igen. Fejlen var der før kodeords-arbejdet; den er rettet nu, fordi den nye
  knap arvede den.

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
