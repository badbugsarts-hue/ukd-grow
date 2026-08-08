# Accessibility and Testing

## Release requirements

- logische Landmarken, Überschriften und native Buttons/Inputs
- Skip Link, sichtbarer Fokus, Tastaturkürzel und Escape-Verhalten
- keine kritische Hilfe nur im Hover-Tooltip
- Tabellen horizontal explorierbar; Rohwerte bleiben zugänglich
- responsive mobile Navigation und Touch-Bedienung
- `prefers-reduced-motion` und Druckansicht

## Automatisiert

`pnpm check` führt Lint, TypeScript, Unit-Tests, Produktionsbuild und Playwright-E2E aus. Die Tests verifizieren DLI, Leaf-VPD, Excel-Datum und Batchskalierung gegen den Evidence-Guarded-v6-Snapshot sowie zentrale Desktop-/Mobilflüsse.

## Manuell

Vor Release prüfen:

1. Ctrl/Cmd-K, `?`, Escape und Tab-Reihenfolge.
2. Guided/Advanced/Expert ohne Wertänderung.
3. Dark/Light und 200 % Browserzoom.
4. 390×844, Tablet, 1440×900 und breiter Desktop.
5. Cockpit, Mischlabor, Knowledge Claim, Raw Formula Toggle.
6. Browserkonsole ohne Fehler.
