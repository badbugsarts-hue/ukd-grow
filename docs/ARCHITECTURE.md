# Architecture Decision Record

## Entscheidung

React 19.2, TypeScript 7 und Vite 8 bilden eine statisch deploybare Single-Page-Anwendung. Es gibt keinen Serverzwang, keine Authentifizierung und keine Remote-Telemetrie. Operative Einzelplatz-Runs werden als `RunPackage v3` über eine austauschbare `RunRepository`-Schnittstelle lokal in IndexedDB gespeichert; ein expliziter lokaler Diagnoseexport bleibt datensparsam.

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

RunRepository ↔ IndexedDB v3
  └─ RunPackage v3
      ├─ immutable RunConfigurationSnapshot / Zonen / Pflanzen
      ├─ ScientificValue-Lineage / Geräte / Kalibrierungen
      ├─ Domain Events / formale Task-Transitions / Overrides / AuditEvents
      ├─ Timeline / Warnungsbestätigungen / Bestandsereignisse
      └─ SHA-256-Backup / Recovery / CSV / XLSX / PDF / Druck
```

Ein persönliches Rechtsprofil ist ausdrücklich nicht Teil dieses eingecheckten Datenflusses. `legal-profile.schema.json` definiert nur die Struktur; konkrete Patienten-, Rezept- und Genehmigungsdaten bleiben in einer ignorierten lokalen Datei. Technischer Bruttoertrag und rechtlich zulässiger Bestand sind getrennte Domänen.

Der große Workbook-Snapshot wird zur Laufzeit separat geladen. Dadurch bleibt der initiale JS-Chunk klein und der Fachdatensatz unabhängig versionier- und cachebar.

## Zustandsklassen

- Shareable: `route`, `day`, `lens` über Hash/Query.
- Persistent preference: Lens, Tag, Theme, Kontrast und Textskalierung in Local Storage.
- Transient: Drawer, Navigation, Suchdialog, Tabellenfilter.
- Session-only sensitive context: importiertes Rechtsprofil ohne Dokumentinhalt.
- Local operational domain: mehrere RunPackage-v3-Objekte in IndexedDB; v1/v2 werden kontrolliert migriert. Restore erfolgt erst nach Hash- und Schema-Gate.
- Domain snapshot: `evidence-guarded-workbook-v6.json`, unveränderlich im Browser.

## Domain-Grenzen

EvidenceStore und RunRepository sind getrennte Wahrheitsbereiche. Run-Daten referenzieren Evidenz, speichern sie aber nicht als veränderbare Kopie. Messkorrekturen löschen das Original nicht: Ein neues Measurement superseded das alte und erzeugt Audit- und Domain-Events. Die Eventprojektion ist reproduzierbar; der materialisierte Run bleibt für schnellen Offlinebetrieb erhalten. Nach Aktivierung bleibt der RunConfigurationSnapshot unveränderlich; spätere Profiländerungen wirken nicht rückwirkend.

Ungeprüfte Fremdanwendungen sind weder Backend noch Domain-Core. `THIRD_PARTY_INTEGRATION_GOVERNANCE.md` und `src/data/integration-epics.json` definieren den verpflichtenden Intake-Gate.

## Abhängigkeiten

React/ReactDOM bilden die interaktive Runtime. Diagramme sind zugängliche SVGs; UI-Primitives und Designsystem sind projektintern. PDF und XLSX werden erst beim jeweiligen Export dynamisch geladen und gehören nicht zum initialen JavaScript. Evidenz-, Audit- und KI-Kontextdaten liegen ebenfalls in separat cachebaren Chunks. Der initiale Produktions-Chunk liegt bei rund 259 kB minifiziert und damit unter dem 300-kB-Budget.
