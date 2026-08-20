# Geprüfter Web- und Migrationsmasterplan 2026

Stand: 8. August 2026

## Executive Decision

Die Zielidee — eine zugängliche UI mit Guided-, Advanced- und Expert-Linse auf denselben kanonischen Daten — ist richtig und im vorhandenen Projekt bereits umgesetzt. Eine sofortige Migration von Vite zu Next.js ist dagegen **kein Qualitätsmerkmal an sich**. Der aktuelle Workspace ist statisch, lokal/offline-nah, benötigt weder SSR noch Server Actions, Authentifizierung oder serverseitige Mutation. Deshalb bleibt React + TypeScript + Vite die freigegebene Architektur.

Next.js App Router wird neu bewertet, sobald mindestens ein echter Server-Use-Case vorliegt: Mehrbenutzerbetrieb, authentifizierte Freigabelinks, serverseitige PDF/XLSX-Jobs, Datenbank, Geräte-Gateway oder regulatorisch erforderliches Audit-Backend. Bei einer späteren Migration lautet die Route `src/app`, nicht `src/pages`.

Offizielle Referenzen: [Next.js App Router](https://nextjs.org/docs/app), [Next.js Installation](https://nextjs.org/docs/app/getting-started/installation), [Tailwind mit Next.js](https://tailwindcss.com/docs/installation/framework-guides/nextjs).

## Audit des eingereichten Plans

| Aussage                                              | Urteil                                    | Verbindliche Korrektur                                                                                                                                                                                                    |
| ---------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Next.js sei 2026 zwingend „State of the Art“         | zu absolut                                | Framework nach Produktanforderung wählen; aktueller statischer Vite-Build bleibt kleiner und vendor-neutral.                                                                                                              |
| Tailwind v4 + shadcn/Radix/Base UI                   | mögliche Option                           | Nur einführen, wenn ein Komponenten-Audit messbaren Nutzen zeigt. Bestehende semantische Tokens und zugängliche Projektkomponenten nicht ohne Paritätstest ersetzen.                                                      |
| `src/pages` beim App Router                          | falsch                                    | Ein künftiger App-Router-Build verwendet `src/app`.                                                                                                                                                                       |
| Athena Balance erst nach pH- und Ca/Mg-Messung       | teilweise richtig                         | Ausgangs- und Ziel-pH sowie Endmix müssen gemessen werden. Ca/Mg/Alkalinität sind wichtige Wasserchemie-Daten, aber keine nachgewiesene universelle Hersteller-Voraussetzung für das Produkt. Keine fixe Kalenderdosis.   |
| Tropf-Blumat nur außen „zulässig“                    | falsch formuliert                         | Der Hersteller definiert Tropf-Blumat bestimmungsgemäß für außen. Indoor ist daher nicht UKD-Reference/off-label zum dokumentierten Scope, aber kein gesetzliches Indoor-Verbot.                                          |
| 25 g als Besitzgrenze zuhause                        | falsch                                    | KCanG unterscheidet 25 g allgemein und 50 g am Wohnsitz/gewöhnlichen Aufenthalt. MedCanG-Pfade und individuelle Erlaubnisse separat behandeln.                                                                            |
| Individuell behauptete Patienten-/Genehmigungsmengen | nicht aus einer Share-Seite verifizierbar | Nicht hardcoden. Originalrezept/-bescheid prüfen und als lokales Rechtsprofil abbilden. Verschreibung und Anbauerlaubnis nicht gleichsetzen.                                                                              |
| Ertragsplan braucht eine Grammobergrenze             | fachlich unnötig                          | Technische Kapazität unbeschränkt modellieren; Besitz, Herkunft und Vernichtung separat gaten.                                                                                                                            |
| WCAG 2.2 AA mit 4,5:1 Kontrast                       | richtig mit Scope                         | 4,5:1 gilt für normalen Text; Ausnahmen und weitere Kriterien beachten. 44×44 px ist ein gutes Projektziel, aber WCAG 2.2 AA 2.5.8 fordert grundsätzlich 24×24 CSS-px mit Ausnahmen; 44×44 gehört zum Enhanced-Kriterium. |
| 80-stellige Fließkommagenauigkeit                    | unbegründet                               | Domänen-Toleranzen und Referenzfixtures definieren. `decimal.js` nur dort einsetzen, wo Dezimalarithmetik tatsächlich fachlich relevant ist; Sensorsicherheit ist nicht durch 80 Stellen gegeben.                         |
| Jest oder Vitest; Playwright oder Cypress            | doppelt                                   | Im Projekt bleiben Vitest und Playwright. Einen zweiten gleichartigen Runner nur bei belegter Lücke einführen.                                                                                                            |
| ESLint, Prettier und TSLint                          | veraltet/dupliziert                       | TSLint ist deprecated. Das Repository verwendet Biome fürs Linting und Prettier nur für unterstützte Formate.                                                                                                             |
| Storybook/Percy zwingend                             | optional                                  | Erst Komponenten-Katalog und visuelle Risikoflächen bestimmen. Playwright-Screenshots können die erste Visual-Regression-Stufe liefern.                                                                                   |

Quellen: [Athena Water Conditioners](https://www.athenaag.com/water-conditioners), [Tropf-Blumat-Handbuch](https://www.blumat.com/storage/app/media/tropf/manual/Tropf-Blumat_user_manual_DE.pdf), [WCAG 2.2](https://www.w3.org/TR/WCAG22/), [TSLint-Migrationshinweis](https://typescript-eslint.io/users/what-about-tslint/), [KCanG § 3](https://www.gesetze-im-internet.de/kcang/__3.html), [MedCanG](https://www.gesetze-im-internet.de/medcang/BJNR06D0C0024.html).

## Zielarchitektur

```text
Evidence-Guarded XLSX/PDF
  -> reproduzierbare Extraktion + Hashmanifest
  -> kanonischer Workbook-Snapshot
  -> Domain-Funktionen + versionierte Claims
  -> React Operator Workspace
       Guided / Advanced / Expert
       Cockpit / Heute / Timeline / Mix / Evidenz / Rohdaten

Amtliche Gesetze + Primärquellen
  -> Research Import Gate
  -> Knowledge Base + AI Context + Skills

Lokales, nicht versioniertes Rechtsprofil
  -> Tätigkeits- und Bestands-Gate
  -> technische Ertragsprognose bleibt davon getrennt
```

Der vorhandene Stack bleibt:

- React 19 + strict TypeScript + Vite;
- kanonische JSON-Inhalte getrennt von UI und Berechnung;
- interne semantische Design-Tokens;
- Vitest, Playwright, Biome und Content-/Hash-Gate;
- statischer, offline-naher und telemetriefreier Build.

## UX-Zielbild

Alle drei Erfahrungsstufen verwenden dieselben Werte und Formeln:

- **Guided:** aktuelle Lage, nächste sichere Aktion, fehlende Messung, Stop-Regel.
- **Advanced:** Parameter, Beziehungen, Vergleichswerte und editierbare Annahmen.
- **Expert:** Rohdaten, Formeltrace, Scope, Unsicherheit, Quelle und Export.

Progressive Offenlegung darf nur Informationsdichte ändern. Sie darf nie andere Sollwerte oder fachliche Ergebnisse erzeugen.

## Safety Gates

1. **Athena:** Ausgangswasser und Ziel-pH erfassen; kleineren Testbatch mischen; Balance vor Nährstoffen; Endmix erneut messen; keine erfundene Dosis und kein pH-Ping-Pong.
2. **Bewässerung:** Innen nur ein dafür vorgesehenes Referenzsystem. Bei automatischer Bewässerung Leckage, maximal verfügbares Volumen und Fail-safe-Zustand prüfen.
3. **Recht:** KCanG, Apothekenbestand und §-4-Erlaubnis als getrennte Konten. Individuelle Werte nur aus geprüftem Originaldokument.
4. **Ertrag:** Bruttoertrag technisch modellieren; zulässige Aufbewahrung und tatsächlich dokumentierte Vernichtung separat bewerten.
5. **Diagnose:** Keine Dosiserhöhung ohne aktuelle pH-/EC-/Wasser-/Pflanzendaten; nur eine Variable gleichzeitig ändern.

## Test- und Release-Gate

Pflicht vor Release:

- Biome-Lint und TypeScript;
- deterministische Unit-Tests für jede portierte Formel;
- Inhalts-, Quellen- und Provenienz-Hashprüfung;
- Playwright für Guided/Advanced/Expert, Desktop/Mobile und Exporte;
- automatisierte axe-Prüfung plus manuelle Tastatur-, Fokus-, Zoom- und Screenreader-Stichprobe;
- gezielte Screenshot-Baselines für kritische Flächen;
- aktueller Rechtsquellen-Prüftag;
- keine personenbezogenen Rechts-/Gesundheitsdaten in Repository, Logs oder Local Storage.

## Migrationsreihenfolge

1. Rechtsprofil und Bestandskonten als rein lokale, schema-validierte Domäne.
2. Vollständiges persistentes Run-Log mit Import/Export und Migrationsversion.
3. XLSX/PDF-Roundtrip-Fixtures und numerische Paritätstests.
4. axe- und Screenshot-Gates in CI ergänzen.
5. Erst danach Server-/Next.js-ADR anhand realer Anforderungen neu öffnen.

Der ursprüngliche 10-Wochen-Gantt ist keine belastbare Schätzung ohne Teamgröße, Definition of Done und Abhängigkeitsanalyse. Meilensteine werden deshalb outcome-basiert freigegeben statt über Scheingenauigkeit datiert.

Der nachfolgende Architektur-/UX-Entwurf mit Backend-, Sensor- und 1–10-Lens-Vorschlägen wurde separat in `PLAN_AUDIT_ROUND2_2026.md` geprüft. Sein maschinenlesbares Ergebnis liegt in `src/data/capability-roadmap.json`.
