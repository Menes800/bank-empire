# Bank Empire

[![Build Bank Empire](https://github.com/Menes800/bank-empire/actions/workflows/build.yml/badge.svg)](https://github.com/Menes800/bank-empire/actions/workflows/build.yml)

Et nettleserbasert strategispill der du bygger en bank fra lokal oppstart til et internasjonalt finanskonsern. Spillet er laget med React, TypeScript og Vite, og lagrer kampanjen lokalt i nettleseren.

## Spill i StackBlitz

Åpne prosjektet direkte:

https://stackblitz.com/github/Menes800/bank-empire

StackBlitz henter alltid prosjektet fra `main`. Når `main` oppdateres i GitHub, holder det derfor å laste StackBlitz-siden på nytt.

## Dette er med i v0.4

- opprettelse av grunnlegger, bank, land, by og vanskelighetsgrad
- kampanje med mål, nivåer og progresjon
- dag-, uke- og månedsbasert økonomisk simulering
- produkter, renter, kunder, kredittsøknader og aktive lån
- filialnettverk, byggeprosjekter, ansatte og ledergruppe
- styre, finansrapporter, risiko, likviditet og konkurrenter
- rådgiverpanel, hendelser, mørk modus og automatisk lokal lagring

## Prosjektstruktur

- `src/game` – spilltilstand, handlinger og simuleringsmotor
- `src/game/v4` – kampanje, rådgiver og utvidet spillmekanikk
- `src/ui` – felles grensesnitt og sider
- `src/ui/v4` – de nyeste ledelses- og kampanjesidene
- `src/App.tsx` – navigasjon og sammensetting av spillet

## Lokal utvikling

```bash
npm install
npm run dev
```

Kontroller produksjonsbygget med:

```bash
npm run build
```

GitHub Actions kjører samme byggtest automatisk ved endringer i `main` og i pull requests.
