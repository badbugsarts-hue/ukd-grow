# Architecture Decision Record

## Entscheidung

React 19.2, TypeScript 7 und Vite 8 bilden eine statisch deploybare Single-Page-Anwendung. Es gibt keinen Serverzwang, keine Authentifizierung, keine Telemetrie und keine Hostingspezialisierung.

Next.js wurde nicht gewählt: Das Produkt ist ein lokaler/offline-naher Operator- und Referenzworkspace ohne serverseitige Datenmutation, SSR-Anforderung oder Server Actions. Die zusätzliche Server-/Routingkomplexität hätte keinen entsprechenden Produktwert.

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
```

Der große Workbook-Snapshot wird zur Laufzeit separat geladen. Dadurch bleibt der initiale JS-Chunk klein und der Fachdatensatz unabhängig versionier- und cachebar.

## Zustandsklassen

- Shareable: `route`, `day`, `lens` über Hash/Query.
- Persistent preference: Lens, Tag und Theme in Local Storage.
- Transient: Drawer, Navigation, Suchdialog, Tabellenfilter.
- Domain snapshot: `evidence-guarded-workbook-v6.json`, unveränderlich im Browser.

## Abhängigkeiten

Nur React/ReactDOM sind Runtime-Abhängigkeiten. Diagramme sind zugängliche SVGs; UI-Primitives und Designsystem sind projektintern, damit kein großer Chart- oder Komponenten-Stack nötig ist.
