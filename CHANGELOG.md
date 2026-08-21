# Changelog

Alle relevanten Änderungen an UKD werden hier dokumentiert. Versionierung folgt Semantic Versioning; wissenschaftliche Daten- und Evidenzänderungen benötigen zusätzlich den Evidence-Review-Prozess.

## [Unreleased] — Cultivation Intelligence Platform foundation

### Added

- RunPackage v5, v1→v5-Migration und ein atomarer `applyRunCommand()`-Gateway mit DomainEvent, AuditEvent und Timeline.
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
# Unreleased — Live, AI Exchange und Recovery Vault

- RunPackage v6 mit strikt getrennten Simulation-/Live-Aggregaten, UTC-Aussaatanker, automatischem 24-Stunden-Tag, Clock-Health, Ankerkorrektur und Abschluss.
- Globales Command Center mit Heute, Quick Log, Alerts, globaler Hilfe, Backup sowie AI-Export/-Rückimport.
- Datenschutzbereinigtes `ukd-ai-exchange/1`, quarantänisiertes `ukd-ai-proposal/1`, Reparaturassistent und auditierte Einzelentscheidung.
- Verschlüsselter Workspace-Checkpoint-Vault mit Readback, Rotation, externem Ordner, Download-Fallback, Persistent-Storage-/Quota-Status und Restore-Drill.
- Zentrales Guidance-Schema, globale Aktionsregistry, Feldtooltips und direkt übernehmbarer validierter Setup-Baseline-Preset mit Undo.
