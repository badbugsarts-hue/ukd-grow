# UKD Grow Masterplan 2026 · Evidence-Guarded Operator Workspace

Modernes, statisch deploybares Webinterface für den forensisch auditierten UKD-Growplan. Die Anwendung verbindet Einsteigerführung und Expertenzugriff in derselben kanonischen Informationsarchitektur.

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
- 27 vollständig migrierte Workbook-Blätter und 55 Audit-Findings
- 18 Arbeitsbereiche inklusive Run-Setup, Mess-/Ereignislog, Run-Historie, Cockpit, Tagesplan, 81-Tage-Timeline und Batch-Mischlabor
- Klima-, Licht-, Nährstoff-, Produkt-, Kompatibilitäts- und Diagnoseflächen
- globale Suche, kontextuelle Hilfe, Light/Dark, responsive Mobile-Navigation
- lokales Multi-Run-Repository mit RunPackage v2, immutable Setup-Snapshots, typisierten Messwerten, semantischen Tasks, Overrides und Audit-Protokoll
- validiertes JSON-Backup/Restore sowie CSV-, XLSX-, PDF- und Druckexport
- installierbare Offline-Shell, Manifest-/Hashdiagnose, Hochkontrast und Textskalierung
- kuratierte Knowledge Base mit Claim-Status, Evidenzklasse, Scope, Unsicherheit und Quellen
- maschinenlesbare Agenten-Kontexte in `src/data/ai-context.json` und `src/data/skills.json`
- lokales, datensparsames Rechtsprofil-Schema mit getrennten KCanG-/MedCanG-Pfaden
- maschinenlesbare Capability-Roadmap für Ist-Stand, Backend-/Sensor-Trigger und Web-Vitals-Budgets

Die Anwendung ist eine Planungs- und Dokumentationshilfe. Kalender- und Dosiswerte ersetzen keine Messung, Pflanzenbeobachtung, Herstelleranweisung oder aktuelle Rechtsprüfung.

## Kanonische Dateien

- `public/data/evidence-guarded-workbook-v6.json`: vollständiger v6-Workbook-Snapshot
- `public/data/data-manifest.json`: Version, Hashes, Provenienz und Importstatus
- `src/data/knowledge-base.json`: geprüfte High-impact Claims und Primärquellen
- `src/data/legacy-audit.json`: 55 forensische Findings
- `src/data/ai-context.json`: Invarianten und Antwortregeln für KI-Systeme
- `src/data/skills.json`: ausführbare fachliche Skill-Verträge
- `src/data/legal-profile.schema.json`: Schema für lokale, nicht eingecheckte Rechtsprofile
- `src/data/capability-roadmap.json`: implementierte, geplante und bedingt aktivierbare Fähigkeiten
- `src/data/integration-epics.json`: 20 Epics und verpflichtender Intake-Gate für ungeprüften Fremdcode
- `src/run-state.ts`: versioniertes Run-Modell, Warnlogik, Importvalidierung und Exportabbildung
- `src/run-storage.ts`: lokaler IndexedDB-Speicher für den aktiven Run
- `src/domain.ts`: geteilte Berechnungs- und Mappinglogik

Die unveränderten v6-Quellen liegen unter `sources/evidence-v6/`. Architektur, Deep-Research-Audit, Evidenzregeln, Faktencheck und Migration sind unter `docs/` dokumentiert. Die geprüfte 2026-Planrevision steht in `docs/MASTERPLAN_2026_REVIEWED.md`; die zweite Architektur-/UX-Prüfung in `docs/PLAN_AUDIT_ROUND2_2026.md`; Rechtsgrundlagen und Bestandskonten beschreibt `docs/LEGAL_PROFILES.md`.
