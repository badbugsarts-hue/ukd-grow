# Accessibility and Testing

## Release requirements

- logische Landmarken, Überschriften und native Buttons/Inputs
- Skip Link, sichtbarer Fokus, Tastaturkürzel und Escape-Verhalten
- keine kritische Hilfe nur im Hover-Tooltip
- Tabellen horizontal explorierbar; Rohwerte bleiben zugänglich
- responsive mobile Navigation und Touch-Bedienung
- `prefers-reduced-motion` und Druckansicht

## Automatisiert

`pnpm check` führt Lint, TypeScript, Unit-Tests, Inhalts-/Quellenprüfung, Produktionsbuild und Playwright-E2E aus. Die Tests verifizieren DLI, Leaf-VPD, Excel-Datum und Batchskalierung gegen den Evidence-Guarded-v6-Snapshot sowie die vollständige Funktionsmatrix auf Desktop und Mobil. Axe prüft alle zwölf Ansichten in Dark und Light gegen WCAG-2-A/AA-, WCAG-2.1- und WCAG-2.2-AA-Regelsätze. Der letzte vollständige Lauf ist in [FUNCTION_TEST_REPORT_2026-08-09.md](FUNCTION_TEST_REPORT_2026-08-09.md) dokumentiert.

Automatisierte Axe-Prüfungen sind ein Gate, aber kein vollständiger WCAG-Konformitätsnachweis. Tastatur, Fokusführung, Zoom/Reflow, verständliche Beschriftung und Screenreader-Nutzung bleiben manuelle Release-Prüfungen.

## Performance

FID ist kein aktueller Core Web Vital mehr. Die Capability-Roadmap verwendet LCP ≤2,5 s, INP ≤200 ms und CLS ≤0,1 am 75. Perzentil. Lokale Lighthouse-/Lab-Messungen dienen als Regression-Gate; reale p75-Felddaten werden erst nach datenschutzgerechtem Opt-in erhoben und nach Mobil/Desktop getrennt bewertet.

`pnpm test:budget` liest den tatsächlichen Modul-Einstieg aus `dist/index.html` und bricht bei mehr als 300 kB minifiziertem initialem JavaScript ab. Dynamisch geladene Fach-, PDF- und XLSX-Chunks zählen nicht als initialer Chunk und werden nur bei Bedarf übertragen.

## Manuell

Vor Release prüfen:

1. Ctrl/Cmd-K, `?`, Escape und Tab-Reihenfolge.
2. Guided/Advanced/Expert ohne Wertänderung.
3. Dark/Light und 200 % Browserzoom.
4. 390×844, Tablet, 1440×900 und breiter Desktop.
5. Cockpit, Mischlabor, Knowledge Claim, Raw Formula Toggle.
6. Browserkonsole ohne Fehler.
