# Accessibility and Testing

## Release requirements

- logische Landmarken, Überschriften und native Buttons/Inputs
- Skip Link, sichtbarer Fokus, Tastaturkürzel und Escape-Verhalten
- keine kritische Hilfe nur im Hover-Tooltip
- Tabellen horizontal explorierbar; Rohwerte bleiben zugänglich
- responsive mobile Navigation und Touch-Bedienung
- `prefers-reduced-motion` und Druckansicht

## Automatisiert

`pnpm check` führt Lint, TypeScript, Unit-Tests, Inhalts-/Quellenprüfung, Security, Produktionsbuild, Bundlebudgets, Release-Metadaten und Playwright-E2E aus. Die Tests verifizieren DLI, Leaf-VPD, Excel-Datum, Batchskalierung, RunPackage-v4-Persistenz und v8-Export. Axe prüft 25 Ansichten in Dark und Light sowie mehrstufige Editierdialoge auf Desktop und Mobile gegen WCAG-2-A/AA-, WCAG-2.1- und WCAG-2.2-AA-Regelsätze. Der aktuelle Audit steht in [COMPLETE_APP_AUDIT_2026-08-16.md](COMPLETE_APP_AUDIT_2026-08-16.md).

Automatisierte Axe-Prüfungen sind ein Gate, aber kein vollständiger WCAG-Konformitätsnachweis. Tastatur, Fokusführung, Zoom/Reflow, verständliche Beschriftung und Screenreader-Nutzung bleiben manuelle Release-Prüfungen.

## Performance

FID ist kein aktueller Core Web Vital mehr. Die Capability-Roadmap verwendet LCP ≤2,5 s, INP ≤200 ms und CLS ≤0,1 am 75. Perzentil. Lokale Lighthouse-/Lab-Messungen dienen als Regression-Gate; reale p75-Felddaten werden erst nach datenschutzgerechtem Opt-in erhoben und nach Mobil/Desktop getrennt bewertet.

`pnpm test:budget` liest den tatsächlichen Modul-Einstieg und alle JavaScript-Assets aus `dist`. Der Gate liegt bei 450 kB initial, 950 kB pro Lazy Chunk und 2.400 kB gesamt. Dynamisch geladene PDF- und XLSX-Chunks werden damit nicht mehr vom Budget ignoriert.

## Manuell

Vor Release prüfen:

1. Ctrl/Cmd-K, `?`, Escape und Tab-Reihenfolge.
2. Guided/Advanced/Expert ohne Wertänderung.
3. Dark/Light und 200 % Browserzoom.
4. 390×844, Tablet, 1440×900 und breiter Desktop.
5. Cockpit, Mischlabor, Knowledge Claim, Raw Formula Toggle.
6. Browserkonsole ohne Fehler.
# UI-Readiness-Audit (20. August 2026)

- Gemeinsame Modal-Infrastruktur erzwingt Fokusfalle, Escape-Schließen, Scroll-Lock und explizite Fokusrückgabe.
- Ein statisches UI-Vertragsgate prüft CSS-Abdeckung sowie Concept-/Help-Metadaten aller globalen Aktionen.
- Playwright-Baselines decken alle 32 aktiven Routen in Dark/Light und Desktop/Mobile sowie Command Center, Quick Log und Live-Preflight ab. Die Testuhr und das Theme werden deterministisch vor dem Dokumentstart gesetzt.
- Quick Log ist global ausführbar und schreibt Messung, Beobachtung oder Aktion mit Domain-, Audit- und Timeline-Spur.
- Die horizontal scrollbare Fütterungsmatrix ist eine benannte, tastaturfokussierbare Region.
- Chromium Desktop/Mobile sowie die kritischen Live-, AI-, Backup-, Dialog- und Nährstoff-A11Y-Flows wurden zusätzlich in Firefox und WebKit geprüft.

Der monolithische Firefox-Gesamtlauf ist auf dem aktuellen Windows-Headless-Host noch kein Stable-Gate: Playwright protokollierte einen `RenderCompositorSWGL`-Framebuffer-Absturz. Der betroffene UKD-Test besteht isoliert; die CI sollte Firefox/WebKit deshalb in getrennten Jobs mit begrenzter Parallelität ausführen.
