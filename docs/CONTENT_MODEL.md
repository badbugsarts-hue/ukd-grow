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
