# UKD Grow Masterplan 2026 · Evidence-Guarded Operator Workspace

Modernes, statisch deploybares Webinterface für den forensisch auditierten UKD-Growplan. Die Anwendung verbindet Einsteigerführung und Expertenzugriff in derselben kanonischen Informationsarchitektur.

## Start

```powershell
pnpm install
pnpm dev
```

Produktionsprüfung:

```powershell
pnpm check
```

## Was enthalten ist

- Guided-, Advanced- und Expert-Linse ohne Änderung der fachlichen Ergebnisse
- 27 vollständig migrierte Workbook-Blätter und 55 Audit-Findings
- Cockpit, Tagesplan, 81-Tage-Timeline und Batch-Mischlabor
- Klima-, Licht-, Nährstoff-, Produkt-, Kompatibilitäts- und Diagnoseflächen
- globale Suche, kontextuelle Hilfe, Light/Dark, responsive Mobile-Navigation
- kuratierte Knowledge Base mit Claim-Status, Evidenzklasse, Scope, Unsicherheit und Quellen
- maschinenlesbare Agenten-Kontexte in `src/data/ai-context.json` und `src/data/skills.json`

Die Anwendung ist eine Planungs- und Dokumentationshilfe. Kalender- und Dosiswerte ersetzen keine Messung, Pflanzenbeobachtung, Herstelleranweisung oder aktuelle Rechtsprüfung.

## Kanonische Dateien

- `public/data/evidence-guarded-workbook-v6.json`: vollständiger v6-Workbook-Snapshot
- `public/data/data-manifest.json`: Version, Hashes, Provenienz und Importstatus
- `src/data/knowledge-base.json`: geprüfte High-impact Claims und Primärquellen
- `src/data/legacy-audit.json`: 55 forensische Findings
- `src/data/ai-context.json`: Invarianten und Antwortregeln für KI-Systeme
- `src/data/skills.json`: ausführbare fachliche Skill-Verträge
- `src/domain.ts`: geteilte Berechnungs- und Mappinglogik

Die unveränderten v6-Quellen liegen unter `sources/evidence-v6/`. Architektur, Deep-Research-Audit, Evidenzregeln, Faktencheck und Migration sind unter `docs/` dokumentiert.
