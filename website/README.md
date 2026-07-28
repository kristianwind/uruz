# Uruz — præsentationssite

Et selvstændigt, statisk site der forklarer hvad Uruz er, viser skærmene og
dokumenterer opsætningen.

## Se det lokalt

Åbn `index.html` direkte i en browser — der er ingen build og ingen
afhængigheder. Alternativt:

```bash
npx serve website
```

## Hvordan det er bygget

- **Én HTML-fil og én CSS-fil.** Ingen framework, ingen build, ingen
  node_modules. Det passer til projektets ånd og betyder at siden kan
  hostes hvor som helst.
- **Skærmbillederne er ikke billeder.** Telefonerne er bygget i HTML og CSS
  med appens egne design-tokens (samme baggrund, samme rune-guld). Derfor er
  de knivskarpe på ethvert skærm, vejer ingenting, og kan rettes med tekst
  frem for et grafikprogram.
- **Responsivt og tilgængeligt.** Ét kolonnelayout på telefon, respekterer
  `prefers-reduced-motion`, og teksten har kontrast nok til WCAG AA.

## Læg det på nettet

Alt er statisk, så det kan hostes hvor som helst. Fx GitHub Pages:

```bash
gh repo edit --enable-pages --pages-branch main --pages-path /website
```

…eller træk mappen ind på Netlify eller Vercel.

> Bemærk: repoet er privat. Slås GitHub Pages til på et privat repo, kræver
> det en betalt plan for at siden er tilgængelig — ellers gør den offentlig
> først, eller host den et andet sted.
