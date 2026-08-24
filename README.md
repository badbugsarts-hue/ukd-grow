# UKD Grow Masterplan 2026 · Evidence-Guarded Operator Workspace

Modernes, statisch deploybares Webinterface für den forensisch auditierten UKD-Growplan. Die Anwendung verbindet Einsteigerführung und Expertenzugriff in derselben kanonischen Informationsarchitektur.

[![Quality Gate](https://github.com/badbugsarts-hue/ukd-grow/actions/workflows/ci.yml/badge.svg)](https://github.com/badbugsarts-hue/ukd-grow/actions/workflows/ci.yml)
[![Security Gate](https://github.com/badbugsarts-hue/ukd-grow/actions/workflows/security.yml/badge.svg)](https://github.com/badbugsarts-hue/ukd-grow/actions/workflows/security.yml)

**Aktueller App-Release:** v11.5.0 · **RunPackage:** v6 · **Kanonischer Workbook-Snapshot:** v11.5 / 56 Blätter

## Start

Einfachster Start unter Windows: `START_UKD.cmd` im Projektordner doppelklicken. Das Skript startet den benötigten lokalen Webserver und öffnet die Anwendung automatisch.

`index.html` darf nicht direkt als `file://` geöffnet werden: Browser können die TypeScript-Module und den kanonischen JSON-Datensatz in diesem Modus nicht als Vite-Anwendung ausführen.

Manuell im Terminal:

```powershell
pnpm install
pnpm start:local
```

Produktionsprüfung:

```powershell
pnpm check
```

## Was enthalten ist

- Guided-, Advanced- und Expert-Linse ohne Änderung der fachlichen Ergebnisse
- 56 kanonische Workbook-Blätter und 55 Audit-Findings
- 32 Arbeitsbereiche inklusive Run-Setup, Mess-/Ereignislog, P0 Operations, Scientific Operations, Profilen, Medien und Datei-Connector
- Klima-, Licht-, Nährstoff-, Produkt-, Kompatibilitäts- und Diagnoseflächen
- globale Suche, kontextuelle Hilfe, Light/Dark, responsive Mobile-Navigation
- lokales Multi-Run-Repository mit RunPackage v6, getrennten Simulation-/Live-Aggregaten, UTC-Aussaatanker, gemeinsamem Command-Gateway, Domain Events, unveränderlichen Setup-Snapshots, State Machines, Overrides und Audit-Protokoll
- globales Command Center, manueller datenschutzbereinigter AI-Austausch mit quarantänisiertem Rückimport sowie zentraler Tooltip-/Guidance-Registry
- resilienter IndexedDB-Speicher mit Read-only-Degraded-Mode, verschlüsseltem rotierendem Checkpoint-Vault, SHA-256-Readback, externem Backup-Ordner/Download-Fallback und atomarem Restore
- Geräte-/Kalibrierungsmodelle, read-only Connector-Vertrag, Capability Negotiation und Sensor-Trust-Gate ohne Fake-Live-Daten
- lokales datensparsames Diagnose-Bundle, Product-Science-Journeys, Hazard Register, Failure UX und lokale SLOs
- Secure-SDLC-Gates, gepinnte CI-Actions, Dependabot, CodeQL, Dependency Review, SPDX-SBOM, Lizenzbericht und Build-Provenienz
- Implementierungsvorschau für Fastify/Postgres/Magic-Link/Sync und guarded Copilot; nicht als deployte Produktfähigkeit aktiviert
- installierbare Offline-Shell, Manifest-/Hashdiagnose, Hochkontrast und Textskalierung
- kuratierte Knowledge Base mit Claim-Status, Evidenzklasse, Scope, Unsicherheit und Quellen
- maschinenlesbare Agenten-Kontexte in `src/data/ai-context.json` und `src/data/skills.json`
- lokales, datensparsames Rechtsprofil-Schema mit getrennten KCanG-/MedCanG-Pfaden
- maschinenlesbare Capability-Roadmap für Ist-Stand, Backend-/Sensor-Trigger und Web-Vitals-Budgets

Die Anwendung ist eine Planungs- und Dokumentationshilfe. Kalender- und Dosiswerte ersetzen keine Messung, Pflanzenbeobachtung, Herstelleranweisung oder aktuelle Rechtsprüfung.

## Kanonische Dateien

- `public/data/evidence-guarded-workbook-v11_5.json`: kanonischer v11.5-Workbook-Snapshot mit 56 Blättern
- `public/data/data-manifest.json`: Version, Hashes, Provenienz und Importstatus
- `src/data/knowledge-base.json`: geprüfte High-impact Claims und Primärquellen
- `src/data/legacy-audit.json`: 55 forensische Findings
- `src/data/ai-context.json`: Invarianten und Antwortregeln für KI-Systeme
- `src/data/skills.json`: ausführbare fachliche Skill-Verträge
- `src/data/legal-profile.schema.json`: Schema für lokale, nicht eingecheckte Rechtsprofile
- `src/data/capability-roadmap.json`: implementierte, geplante und bedingt aktivierbare Fähigkeiten
- `src/data/integration-epics.json`: 28 Epics und verpflichtender Intake-Gate für ungeprüften Fremdcode
- `src/data/platform-quality.json`: User-Journeys, Hazard Register, Failure UX, SLOs, Recovery und Privacy-Klassen
- `src/run-state.ts`: versioniertes Run-Modell, Warnlogik, Importvalidierung und Exportabbildung
- `src/run-storage.ts`: resilientes lokales Multi-Run-Repository, v1→v6-Migration, Sync-Outbox, verschlüsselte Medien und atomarer Workspace-Restore
- `docs/LIVE_AI_RECOVERY.md`: Live-Uhr, AI-Dateiverträge, Backup-Rotation, Recovery und Stable-Gates
- `src/run-commands.ts`: atomare fachliche Commands mit DomainEvent, AuditEvent und Timeline
- `apps/api/`: nicht aktivierte Fastify/Postgres-Implementierungsvorschau für Auth, Sync, Copilot und serverseitige OpenTelemetry-Diagnostik
- `src/scientific-core.ts`: Trust/Calibration/Capability-Vertrag für spätere read-only Sensoradapter
- `src/backup.ts`: kanonisch gehashte Backup- und Recovery-Gates
- `src/domain.ts`: geteilte Berechnungs- und Mappinglogik

Die aktuelle operative v11.5-XLSX, der v11.3-Forensik-Audit und alle PDF-/Legacy-Planartefakte liegen gesammelt unter `plan/`. Die unveränderten v6-Quellen bleiben als forensische Vorgänger unter `sources/evidence-v6/` erhalten. Architektur, Deep-Research-Audit, Evidenzregeln, Faktencheck und Migration sind unter `docs/` dokumentiert.

## Dokumentation und Zusammenarbeit

- [Dokumentationsindex](docs/README.md)
- [GitHub Wiki](https://github.com/badbugsarts-hue/ukd-grow/wiki)
- [Architektur](docs/ARCHITECTURE.md) und [Content-Modell](docs/CONTENT_MODEL.md)
- [Release-Checkliste](docs/RELEASE_CHECKLIST.md) und [Operations Runbook](docs/OPERATIONS_RUNBOOK.md)
- [Security Policy](SECURITY.md), [Support](SUPPORT.md) und [Governance](GOVERNANCE.md)
- [Beitragen](CONTRIBUTING.md) und [Verhaltenskodex](CODE_OF_CONDUCT.md)

Das Repository ist derzeit privat. Eine Änderung der Sichtbarkeit ist eine separate Governance-Entscheidung und erfolgt nicht automatisch durch einen Release.
