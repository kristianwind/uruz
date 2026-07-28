# Uruz — præsentationssite

Det statiske site bag **[uruz-training.com](https://uruz-training.com)**. Det
forklarer hvad Uruz er, viser rigtige skærmbilleder, og fortæller hvordan den
sås som en rune i [Yggdrasil Panel](https://yggdrasilpanel.com).

## Se det lokalt

Åbn `index.html` direkte i en browser — der er ingen build og ingen
afhængigheder. Alternativt:

```bash
npx serve website
```

## Filerne

| Fil | Hvad |
|---|---|
| `index.html` | Dansk udgave (forsiden) |
| `en.html` | Engelsk udgave |
| `styles.css` | Al styling, delt af begge sider |
| `img/` | Skærmbilleder af appen + favicon |

## To sprog, to dokumenter

Sproget skiftes ikke med JavaScript. Hver udgave er sin egen HTML-fil med sit
eget `lang`, sin egen `canonical` og et `hreflang`-link til den anden. Det er
hvad en skærmlæser og en søgemaskine har brug for, og det betyder at siden
virker helt uden JavaScript.

Prisen er at **de to filer skal holdes ens**. Ændrer du strukturen i
`index.html`, skal `en.html` med.

## Skærmbillederne

`img/*.png` er kopier af `docs/screenshots/` i roden af repoet. De tages af
appen selv med demo-data:

```bash
npm run gen:screenshots
```

Scriptet sår en midlertidig database med demo-brugere og tolv ugers træning,
starter appen på sin egen port, og fotograferer skærmene i iPhone-format. Det
rører hverken din rigtige database eller en dev-server du har kørende.
Kopiér dem herind bagefter:

```bash
cp docs/screenshots/*.png website/img/
```

## Hvordan det er bygget

- **To HTML-filer og én CSS-fil.** Ingen framework, ingen build, ingen
  node_modules. Det passer til projektets ånd og betyder at siden kan hostes
  hvor som helst.
- **Telefonerne i hero og showcases er bygget i HTML og CSS** med appens egne
  design-tokens. De er knivskarpe på ethvert skærm og kan rettes med tekst
  frem for et grafikprogram. Skærmbillederne i "Sådan ser den ud" er derimod
  ægte — det er dem der viser hvordan appen faktisk ser ud.
- **Responsivt og tilgængeligt.** Ét kolonnelayout på telefon, respekterer
  `prefers-reduced-motion`, og teksten har kontrast nok til WCAG AA.

## Husk at bumpe CSS-versionen

Begge sider linker til `styles.css?v=ÅÅÅÅMMDD`. **Ret datoen hver gang du ændrer
`styles.css`.**

Grunden: siden ligger bag Cloudflare, som cacher statiske filer i fire timer.
HTML'en slipper igennem med det samme, men en ny CSS gør ikke — så siden bliver
serveret med ny opbygning og gammelt udseende, hvilket ser ud som en fejl i
layoutet frem for en cache. En ny query-streng er en ny URL for cachen, og så
hentes filen forfra.

## Læg det på nettet

Alt er statisk, så det kan hostes hvor som helst — GitHub Pages, Netlify,
Vercel, eller som en statisk side bag Yggdrasils proxy.

```bash
gh repo edit --enable-pages --pages-branch main --pages-path /website
```
