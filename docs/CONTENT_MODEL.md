# Content Model

## Workbook schema

```ts
type Workbook = Record<
  string,
  {
    range: string;
    values: (string | number | boolean | null)[][];
    formulas: string[][];
  }
>;
```

`02_Daily_Master` ist die operative Tagesquelle. Spalten werden ausschließlich über `DAILY_COLUMNS` in `src/domain.ts` adressiert.

## RunPackage v2

Persönliche Run-Daten liegen außerhalb des EvidenceStore. Ein Run enthält einen unveränderlichen `RunConfigurationSnapshot`, Zonen, Pflanzen, typisierte `ScientificValue`-Messungen, strukturierte Beobachtungen, semantische Tasks, Overrides und append-only AuditEvents. Korrekturen superseden einen Messwert mit Referenz und Grund; das Original bleibt erhalten.

`RunRepository` abstrahiert Speicherung, Auflistung und Auswahl mehrerer Runs. Die aktuelle Implementierung nutzt IndexedDB v2. JSON v1 wird beim Lesen kontrolliert nach v2 migriert.

## Knowledge claim

Jeder Claim benötigt:

- stabile ID und verständlichen Titel
- klar abgegrenztes Statement
- Status und Evidenzklasse A–E
- Scope, Restunsicherheit und Source IDs
- Quellen mit Typ, Publisher, URL und `checkedAt`

Herstellerangaben sind Primärquellen für Label, Zusammensetzung und Gebrauchsanweisung, aber keine unabhängige Wirksamkeitsevidenz.

## AI context and skills

`ai-context.json` definiert kanonische Quellen, Invarianten, Risikoeingaben und Antwortregeln. `skills.json` definiert Trigger, benötigte Inputs, Outputs und Guardrails für Tagescheck, Mischung, Evidenzcheck, Deep-Research-Import, Rechtsstand, Diagnose-Triage und kontextuelle Erklärung. `public/data/data-manifest.json` bindet Release, Hashes und Provenienz der unveränderten Quellen.

Diese Dateien sind Kontextdaten, kein autonomes Dosier- oder Diagnosesystem.

## Legal profile

`legal-profile.schema.json` trennt drei Rechtsgrundlagen: privaten KCanG-Eigenanbau, MedCanG-Apothekenbezug und eine individuelle Erlaubnis nach § 4 MedCanG. Jede Autorisierung besitzt Dokumentstatus, Laufzeit, Tätigkeiten und ausdrücklich belegte Limits.

Das Profil speichert keine pauschal addierte „Gesamtfreigabe“. Der technische Ertrag wird ohne Grammdeckel prognostiziert; zulässige Bestände, Herkunft und Vernichtung werden über getrennte Übergänge geprüft. Das eingecheckte Example enthält keine persönlichen Werte. Reale Profile müssen `*.legal-profile.local.json` heißen und bleiben außerhalb von Git und Local Storage.

## Capability roadmap

`capability-roadmap.json` verhindert Architektur-Halluzinationen. Die Datei trennt implementierte, geplante und nur bei einem validierten Trigger aktivierbare Fähigkeiten. Sie ist kanonisch für Backend-, Datenbank-, Auth-, Sensor-, Export- und Next.js-Status sowie für Datenzustände und Performancebudgets.

Eine externe Planung oder ein Mockup darf einen `conditional`-Eintrag nicht als vorhandene Funktion darstellen. Der Wechsel zu `implemented` benötigt Code, Tests, Betriebsdokumentation und ein aktualisiertes Reviewdatum.

`integration-epics.json` ergänzt den Fremdcode-Intake und 20 Entwicklungs-Epics. Unverifizierte Kandidaten haben immer `codeImportAllowed=false`; Pattern-Studium ist keine Lizenz- oder Qualitätsfreigabe.
