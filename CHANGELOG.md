# Changelog

Alle relevanten Änderungen an UKD werden hier dokumentiert. Versionierung folgt Semantic Versioning; wissenschaftliche Daten- und Evidenzänderungen benötigen zusätzlich den Evidence-Review-Prozess.

## [Unreleased]

- Noch keine Änderungen.

## [11.5.0] — 2026-08-24

### Added

- RunPackage v6, v1→v6-Migration und ein atomarer `applyRunCommand()`-Gateway mit DomainEvent, AuditEvent und Timeline.
- Resilienter IndexedDB-Speicher mit typisierten Fehlern, Read-only-Degraded-Mode, Sync-Outbox und atomarem Workspace-Restore.
- IPM, Incident/Recovery, Equipment/Maintenance, Produktinventar, Reservoir/Lung Room, Energie, Post-Harvest, Mix-Applikationen, Medien und Profile/Templates als lokale UI-Slices.
- Manifestiertes `ukd-workspace-backup/2`, verschlüsselte Medien und passphrasengeschütztes Recovery-Kit.
- CSV/JSON-Datei-Connector mit Probe, Mapping, Validierung, Vorschau, Dublettenschutz und unverified Trust-Status.
- Monorepo-Contracts sowie nicht aktivierte Fastify/Postgres/Magic-Link/Sync/Copilot-Implementierungsvorschau mit Docker Compose und OpenTelemetry.
- CodeQL- und Dependency-Review-Workflows sowie SPDX-SBOM, Lizenz- und Provenienz-Gates.

### Changed

- Glossar, Tooltips und Hilfetexte beziehen Definitionen nur noch aus der validierten Knowledge Base.
- Workspace-Backup exportiert den realen Workspace, alle Runs und referenzierten verschlüsselten Medien.
- Mix-Chargen werden nur mit expliziten Ist-Dosen angelegt und vollständig über das Command-Gateway protokolliert.
- WCAG-Tests laufen route-isoliert in Dark/Light auf Desktop und Mobile.

### Security

- Transitive `uuid`-Abhängigkeit auf eine gegen GHSA-w5hq-g745-h8pq gepatchte Version festgelegt.
- Copilot bleibt schreibunfähig, verwendet `store:false`, Structured Outputs, grounding checks und pseudonyme Safety-Identifier.

### Live, AI Exchange und Recovery Vault

- RunPackage v6 mit strikt getrennten Simulation-/Live-Aggregaten, UTC-Aussaatanker, automatischem 24-Stunden-Tag, Clock-Health, Ankerkorrektur und Abschluss.
- Globales Command Center mit Heute, Quick Log, Alerts, globaler Hilfe, Backup sowie AI-Export/-Rückimport.
- Datenschutzbereinigtes `ukd-ai-exchange/1`, quarantänisiertes `ukd-ai-proposal/1`, Reparaturassistent und auditierte Einzelentscheidung.
- Verschlüsselter Workspace-Checkpoint-Vault mit Readback, Rotation, externem Ordner, Download-Fallback, Persistent-Storage-/Quota-Status und Restore-Drill.
- Zentrales Guidance-Schema, globale Aktionsregistry, Feldtooltips und direkt übernehmbarer validierter Setup-Baseline-Preset mit Undo.

### App-aligned Masterclass und Veröffentlichung

- v11.5-Workbook mit 56 Blättern als kanonischen Snapshot integriert und v11.6-App-Alignment als reviewpflichtiges Planartefakt ergänzt.
- Live-Tag an den im Setup gewählten Aussaat-/Emergence-Anker gebunden; Cockpit und globaler Status aktualisieren Datum, Tag und nächsten Tageswechsel automatisch.
- Autoflower-Cockpit, In-Place Editing, Prediction Engine, Mixed-Batch-Resolver und geführte Plan-/Nährstoffflächen erweitert.
- GitHub Community Health, versionierte Wiki-Quelle, Release-Runbook, Release-Workflow und getrennte Core-/Browser-/Windows-Visual-Gates ergänzt.
- Sämtliche Plan-, PDF-, XLSX- und Legacy-Artefakte unter `plan/` konsolidiert; ein lokales 2,8-GB-Workspace-Archiv bleibt bewusst außerhalb von Git.
