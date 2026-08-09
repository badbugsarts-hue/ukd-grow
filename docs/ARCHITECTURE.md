# Architecture Decision Record

## Entscheidung

React 19.2, TypeScript 7 und Vite 8 bilden eine statisch deploybare Single-Page-Anwendung. Es gibt keinen Serverzwang, keine Authentifizierung, keine Telemetrie und keine Hostingspezialisierung. Der operative Einzelplatz-Run wird als versioniertes `RunPackage` lokal in IndexedDB gespeichert.

Next.js wurde nicht gewählt: Das Produkt ist ein lokaler/offline-naher Operator- und Referenzworkspace ohne serverseitige Datenmutation, SSR-Anforderung oder Server Actions. Die zusätzliche Server-/Routingkomplexität hätte keinen entsprechenden Produktwert.

Diese Entscheidung wird nicht über den Marktstatus eines Frameworks, sondern über Anforderungen geöffnet. Auslöser wären insbesondere Mehrbenutzerbetrieb, Authentifizierung, serverseitige Freigabelinks, Datenbank, Geräte-Gateway oder serverseitige Exportjobs. Der geprüfte 2026-Plan steht in `MASTERPLAN_2026_REVIEWED.md`.

Der zweite Architektur-Audit steht in `PLAN_AUDIT_ROUND2_2026.md`; die maschinenlesbaren Aktivierungskriterien liegen in `src/data/capability-roadmap.json`. Ein Backend wird nicht vorsorglich gebaut. Es benötigt einen benannten Use Case, Datenklassifikation, Offline-/Fehlermodell, Authentifizierung, Migration, Backup, Betrieb und Kostenfreigabe.

## Datenfluss

```text
Evidence-Guarded XLSX v6
  └─ scripts/extract-web-data.mjs
      ├─ public/data/evidence-guarded-workbook-v6.json (27 Blätter)
      ├─ public/data/data-manifest.json (Hashes/Provenienz)
      └─ src/data/legacy-audit.json (55 Findings)

knowledge-base.json ─┐
ai-context.json      ├─ React UI → Guided / Advanced / Expert
skills.json          ┘

RunPackage v1 ↔ IndexedDB
  ├─ Konfiguration, Messungen, Ereignisse und Checklisten
  ├─ Warnungsbestätigungen und Bestandsereignisse
  └─ validiertes JSON-Backup / CSV / XLSX / PDF / Druck
```

Ein persönliches Rechtsprofil ist ausdrücklich nicht Teil dieses eingecheckten Datenflusses. `legal-profile.schema.json` definiert nur die Struktur; konkrete Patienten-, Rezept- und Genehmigungsdaten bleiben in einer ignorierten lokalen Datei. Technischer Bruttoertrag und rechtlich zulässiger Bestand sind getrennte Domänen.

Der große Workbook-Snapshot wird zur Laufzeit separat geladen. Dadurch bleibt der initiale JS-Chunk klein und der Fachdatensatz unabhängig versionier- und cachebar.

## Zustandsklassen

- Shareable: `route`, `day`, `lens` über Hash/Query.
- Persistent preference: Lens, Tag, Theme, Kontrast und Textskalierung in Local Storage.
- Transient: Drawer, Navigation, Suchdialog, Tabellenfilter.
- Session-only sensitive context: importiertes Rechtsprofil ohne Dokumentinhalt.
- Local operational domain: RunPackage v1 in IndexedDB; vollständig als JSON sicher- und wiederherstellbar.
- Domain snapshot: `evidence-guarded-workbook-v6.json`, unveränderlich im Browser.

## Abhängigkeiten

React/ReactDOM bilden die interaktive Runtime. Diagramme sind zugängliche SVGs; UI-Primitives und Designsystem sind projektintern. PDF und XLSX werden erst beim jeweiligen Export dynamisch geladen und gehören nicht zum initialen JavaScript. Evidenz-, Audit- und KI-Kontextdaten liegen ebenfalls in separat cachebaren Chunks. Der initiale Produktions-Chunk liegt bei rund 259 kB minifiziert und damit unter dem 300-kB-Budget.
