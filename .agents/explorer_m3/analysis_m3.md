# Technical Analysis & Specification Report: Milestone 3 — Plant Identity Modal & Biology Engine Integration

**Author**: Explorer M3 (teamwork_preview_explorer)  
**Date**: 2026-08-14  
**Target Component**: `src/components/modals/PlantIdentityModal.tsx`  
**Integration Targets**: `src/components/panels/RunConfigPanel.tsx`, `src/components/panels/DailyOperatorPanel.tsx`, `src/run-state.ts`  
**Status**: COMPLETE ANALYSIS & SPECIFICATION

---

## Executive Summary

This report establishes the full architecture, data model, mathematical integration, UI/UX specification, integration plan, and unit test strategy for **Milestone 3: Plant Identity Modal & Biology Engine Integration** in the UKD Web Application.

Previously, the application relied on generic fallback data (`defaultPlantIdentity` with `breeder: null`, `seedType: "unknown"`) and hardcoded "Day 0" assumptions. Milestone 3 introduces a dedicated, high-precision "2026 Master Class Elite" overlay modal (`PlantIdentityModal.tsx`) that decouples genetics from breeder, seed lot, pack batch, seed type, and phenotype notes, while introducing a dynamic **Day Zero Time Anchor** (`seed-started`, `seed-planted`, `emergence`, `first-true-leaves`, `run-operational-start`).

The modal directly connects with `calculateBiologicalPlantAge` in `src/domain.ts` to compute live biological age vs. operational run age, updates state immutably in `src/run-state.ts`, appends formal audit and domain events, and presents an accessible, touch-friendly (44px min target) German UI with interactive tooltips (`TermTooltip.tsx`).

---

## 1. Plant Identity Data Model & Props Specification

### 1.1 Existing Data Models (`src/types.ts`)

The existing codebase already defines the foundational TypeScript interfaces:

```typescript
// src/types.ts - PlantIdentity
export interface PlantIdentity {
  breeder: string | null;
  seedType: "regular" | "feminized" | "autoflower" | "clone" | "unknown";
  seedLot: string | null;
  packBatch: string | null;
  sourceDate: string | null;
  phenotypeNotes: string;
}

// src/types.ts - DayZeroAnchor
export type DayZeroAnchor =
  | "seed-started"
  | "seed-planted"
  | "emergence"
  | "first-true-leaves"
  | "run-operational-start";

// src/types.ts - GrowthEvent
export interface GrowthEvent {
  id: string;
  plantId: string;
  kind: GrowthEventKind;
  occurredAt: string;
  day: number | null;
  observedBy: "user" | "system";
  confidence: "confirmed" | "estimated" | "uncertain";
  notes: string;
  photoIds: string[];
}
```

### 1.2 Modal Props Interface (`PlantIdentityModalProps`)

The modal will follow established patterns from `PpfdMappingModal.tsx` and `SensorCalibrationModal.tsx`:

```typescript
// src/components/modals/PlantIdentityModal.tsx
import type React from "react";
import type { ExperienceLens, RunPackage } from "../../types";

export interface PlantIdentityModalProps {
  /** The current active or draft RunPackage snapshot */
  run: RunPackage;
  /** Active user experience lens for localized German tooltips */
  lens: ExperienceLens;
  /** Modal close request handler */
  onClose: () => void;
  /** Callback fired with the updated RunPackage snapshot upon saving */
  onSave: (updatedRun: RunPackage) => void;
}
```

### 1.3 Form State Structure

Inside `PlantIdentityModal`, state is managed for both general plant identity fields and the biological time anchor:

| Form Field             | State Variable   | Type                        | Initial Value Source                                                      |
| ---------------------- | ---------------- | --------------------------- | ------------------------------------------------------------------------- |
| **Genetik / Strain**   | `genetics`       | `string`                    | `run.config.genetics`                                                     |
| **Züchter / Breeder**  | `breeder`        | `string`                    | `run.plants[0]?.identity.breeder ?? ""`                                   |
| **Saatgut-Typ**        | `seedType`       | `PlantIdentity["seedType"]` | `run.plants[0]?.identity.seedType ?? "feminized"`                         |
| **Seed Lot ID**        | `seedLot`        | `string`                    | `run.plants[0]?.identity.seedLot ?? ""`                                   |
| **Pack/Batch ID**      | `packBatch`      | `string`                    | `run.plants[0]?.identity.packBatch ?? ""`                                 |
| **Bezugsdatum**        | `sourceDate`     | `string`                    | `run.plants[0]?.identity.sourceDate ?? ""`                                |
| **Phänotyp-Notizen**   | `phenotypeNotes` | `string`                    | `run.plants[0]?.identity.phenotypeNotes ?? ""`                            |
| **Day Zero Anker-Typ** | `dayZeroAnchor`  | `DayZeroAnchor`             | `run.config.dayZeroAnchor ?? "emergence"`                                 |
| **Anker-Datum**        | `anchorDate`     | `string` (YYYY-MM-DD)       | Existing `GrowthEvent` matching `dayZeroAnchor` or `run.config.startDate` |

---

## 2. Day Zero Time Anchor & Biological Age Math Integration

### 2.1 Domain Math Function (`src/domain.ts`)

The domain logic is provided by `calculateBiologicalPlantAge` in `src/domain.ts`:

```typescript
export function calculateBiologicalPlantAge(
  dayZeroAnchor: DayZeroAnchor,
  growthEvents: GrowthEvent[],
  now = new Date(),
): {
  biologicalAgeDays: number;
  operationalAgeDays: number;
  anchorDateString: string;
};
```

**Algorithm Mechanics**:

1. Filters `growthEvents` for valid events (`kind` and `occurredAt` present).
2. Determines **operational start date**: Looks for event with `kind === "run-operational-start"` or `kind === "seed-started"`. Fallback: earliest growth event date or `now`.
3. Computes `operationalAgeDays = Math.max(0, Math.floor((now - opDate) / 86400000))`.
4. Determines **anchor date**: Searches `growthEvents` for event with `kind === dayZeroAnchor`.
5. If anchor event exists, computes `biologicalAgeDays = Math.max(0, Math.floor((now - anchorDate) / 86400000))` and returns `anchorDate.toISOString()`.
6. If no anchor event exists, falls back to `operationalAgeDays` and `opDate.toISOString()`.

### 2.2 Live Preview Engine in `PlantIdentityModal`

As the user interacts with the modal (changing `dayZeroAnchor` dropdown or editing the `anchorDate` input field), `PlantIdentityModal` computes a live preview:

```typescript
// Live Preview Math inside PlantIdentityModal component
const candidateAnchorEvent: GrowthEvent = {
  id: "preview-anchor-event",
  plantId: run.plants[0]?.id ?? "plant-1",
  kind: selectedDayZeroAnchor,
  occurredAt: new Date(selectedAnchorDate).toISOString(),
  day: 0,
  observedBy: "user",
  confidence: "confirmed",
  notes: "Day Zero Anchor",
  photoIds: [],
};

const syntheticGrowthEvents = [
  ...run.growthEvents.filter((e) => e.kind !== selectedDayZeroAnchor),
  candidateAnchorEvent,
];

const agePreview = calculateBiologicalPlantAge(
  selectedDayZeroAnchor,
  syntheticGrowthEvents,
  new Date(),
);
```

### 2.3 Live Math Card UI

The preview card displays:

- **Biologisches Pflanzenalter**: `agePreview.biologicalAgeDays` Tage (calculated from chosen anchor date).
- **Operatives Run-Alter**: `agePreview.operationalAgeDays` Tage (calculated from setup/run operational start).
- **Alter-Delta**: `agePreview.biologicalAgeDays - agePreview.operationalAgeDays` Tage difference (e.g. "+3 Tage Vorentwicklung bei Sämling").
- **Klartext-Anker**: Displaying formatted German date (e.g., `Keimung / Durchstoß am 01.08.2026`).

---

## 3. UI/UX Design Specification (2026 Master Class Elite)

### 3.1 CSS Design Tokens & Palette

The component strictly consumes semantic design tokens from `src/styles.css`:

```css
/* Color & Surface Tokens */
background: var(--surface-0); /* Dialog background */
border: 1px solid var(--line-strong); /* Border header/actions */
color: var(--text); /* Primary text */
color: var(--text-2); /* Secondary text */
color: var(--muted); /* Muted captions */
color: var(--green); /* Primary action & highlight accent */
background: var(--green-dim); /* Active card background */
background: var(--surface-2); /* Input field background */
```

### 3.2 Overlay Dialog Architecture & Accessibility

- **Backdrop**: `<div className="palette-backdrop" role="dialog" aria-modal="true" aria-labelledby="plant-identity-modal-title" onClick={handleBackdropClick}>`
- **Modal Container**: `<div className="command-palette" style={{ width: "min(640px, calc(100vw - 24px))", maxHeight: "90vh", overflowY: "auto", padding: "24px" }}>`
- **Touch Target Size**: Every button (`<button>`), input (`<input>`), select (`<select>`), and close trigger features a minimum height of `44px` (`minHeight: "44px"`) and minimum touch width of `44px` (`minWidth: "44px"`).
- **Keyboard Navigation**:
  - Esc key listener closes modal (`useEffect` handling keydown `Escape`).
  - Form submit on Enter key press (`<form onSubmit={handleSave}>`).
  - Visible focus rings on input elements (`:focus-visible`).

### 3.3 German Terminology & `TermTooltip` Integration

All user-facing text is written in clear, precise German with inline tooltips:

| Term                | German UI Label     | `TermTooltip` Term & Concept Explanation                                                                                                                               |
| ------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Day Zero Anchor** | `Day Zero Anker`    | `<TermTooltip term="Day Zero Anchor" customText="Definiert den biologischen Nullpunkt (z.B. Keimung vs. Aussaat) für exakte Entwicklungsberechnungen." lens={lens} />` |
| **Phenotype**       | `Phänotyp`          | `<TermTooltip term="Phänotyp" customText="Erscheinungsbild und spezifische Merkmale der Pflanze (z.B. Wuchshöhe, Blattform, Aroma)." lens={lens} />`                   |
| **Breeder**         | `Züchter / Breeder` | `<TermTooltip term="Breeder" customText="Hersteller oder Zuchtbank der Genetik (z.B. Mephisto Genetics, Dutch Passion)." lens={lens} />`                               |
| **Seed Lot**        | `Saatgut-Lot`       | `<TermTooltip term="Saatgut-Lot" customText="Chargennummer der Samenverpackung zur lückenlosen Nachverfolgbarkeit (Data Lineage)." lens={lens} />`                     |

---

## 4. Integration Plan

### 4.1 Update Plan for `RunConfigPanel.tsx`

`RunConfigPanel.tsx` will be enhanced with a dedicated **Plant Identity Summary & Edit Card**:

1. **Location**: In Category 1 ("1. Run-Stammdaten & Substrat") or as a dedicated sub-card right next to the Readiness Gate.
2. **Display Elements**:
   - Genetik & Strain: `{config.genetics}`
   - Züchter (Breeder): `{run.plants[0]?.identity.breeder || "Nicht angegeben"}`
   - Saatgut-Typ: `{run.plants[0]?.identity.seedType || "Feminisiert"}`
   - Day Zero Anker: `{config.dayZeroAnchor}` (mit Badge & formatierter Datumsanzeige)
   - Biologisches Alter: Live preview indicator showing `{biologicalAgeDays} Tage`
3. **Action Button**:
   ```tsx
   <button
     type="button"
     onClick={() => setIsPlantIdentityModalOpen(true)}
     style={{
       minHeight: "44px",
       padding: "8px 16px",
       background: "var(--surface-2)",
       border: "1px solid var(--line-strong)",
       borderRadius: "var(--radius-sm)",
       color: "var(--green)",
       fontWeight: 700,
       cursor: "pointer",
       display: "flex",
       alignItems: "center",
       gap: "8px",
     }}
   >
     🌱 Pflanzen-Identität & Anker bearbeiten
   </button>
   ```
4. **State Handling**: State variable `const [isPlantIdentityModalOpen, setIsPlantIdentityModalOpen] = useState(false);` render modal conditionally when `isOpen` is `true`.

### 4.2 Update Plan for `DailyOperatorPanel.tsx`

`DailyOperatorPanel.tsx` will display biological vs. operational plant age:

1. **Header Cockpit Summary Bar**:
   - Next to `Tag {selectedDay} / 80 — {targets.phaseName}`, render a dual age badge:
   ```tsx
   const ageMath = calculateBiologicalPlantAge(
     run.config.dayZeroAnchor,
     run.growthEvents,
     new Date(),
   );

   <div
     style={{
       display: "flex",
       alignItems: "center",
       gap: "8px",
       marginTop: "4px",
     }}
   >
     <span
       style={{
         fontSize: "12px",
         background: "var(--surface-2)",
         padding: "2px 8px",
         borderRadius: "4px",
         border: "1px solid var(--line)",
       }}
     >
       ⚙️ Operativ: Tag {selectedDay}
     </span>
     <span
       style={{
         fontSize: "12px",
         background: "var(--green-dim)",
         color: "var(--green)",
         padding: "2px 8px",
         borderRadius: "4px",
         border: "1px solid var(--green)",
       }}
     >
       🌱 Biologisch: Tag {ageMath.biologicalAgeDays} (
       {run.config.dayZeroAnchor})
     </span>
   </div>;
   ```

### 4.3 Immutable State Transition Logic (`src/run-state.ts` / Save Handler)

When the user saves the modal, an updated `RunPackage` snapshot is created without mutating active objects:

```typescript
export function updatePlantIdentity(
  run: RunPackage,
  genetics: string,
  identity: PlantIdentity,
  dayZeroAnchor: DayZeroAnchor,
  anchorDate: string,
): RunPackage {
  const occurredAt = new Date().toISOString();
  const primaryPlant = run.plants[0];
  const plantId = primaryPlant?.id ?? crypto.randomUUID();

  // 1. Update plant identity across all plants in run
  const updatedPlants = run.plants.map((plant) => ({
    ...plant,
    genetics,
    identity: {
      ...plant.identity,
      ...identity,
    },
  }));

  // 2. Create or update GrowthEvent for dayZeroAnchor
  const existingEvents = run.growthEvents.filter(
    (e) => e.kind !== dayZeroAnchor,
  );
  const newAnchorEvent: GrowthEvent = {
    id: crypto.randomUUID(),
    plantId,
    kind: dayZeroAnchor,
    occurredAt: new Date(anchorDate).toISOString(),
    day: 0,
    observedBy: "user",
    confidence: "confirmed",
    notes: `Day Zero Anker gesetzt (${dayZeroAnchor})`,
    photoIds: [],
  };

  const updatedGrowthEvents = [newAnchorEvent, ...existingEvents];

  // 3. Update RunConfig
  const updatedConfig: RunConfig = {
    ...run.config,
    genetics,
    dayZeroAnchor,
  };

  // 4. Construct updated immutable RunPackage with Audit & Domain events
  return {
    ...run,
    updatedAt: occurredAt,
    config: updatedConfig,
    plants: updatedPlants,
    growthEvents: updatedGrowthEvents,
    auditEvents: [
      {
        id: crypto.randomUUID(),
        occurredAt,
        action: "configuration-changed",
        entityType: "plant-identity",
        entityId: plantId,
        detail: `Pflanzenidentität aktualisiert: Genetik '${genetics}', Breeder '${identity.breeder ?? "—"}', Day Zero Anker '${dayZeroAnchor}' am ${anchorDate}.`,
      },
      ...run.auditEvents,
    ],
    domainEvents: [
      {
        id: crypto.randomUUID(),
        schemaVersion: "1.0.0",
        aggregateType: "run",
        aggregateId: run.id,
        type: "configuration.changed",
        occurredAt,
        recordedAt: occurredAt,
        actor: "user",
        source: "ukd-plant-identity-modal",
        payload: {
          plantId,
          genetics,
          breeder: identity.breeder,
          seedLot: identity.seedLot,
          dayZeroAnchor,
          anchorDate,
        },
      },
      ...run.domainEvents,
    ],
  };
}
```

---

## 5. Unit Test Strategy

A co-located component test suite `src/components/modals/plant-identity.test.tsx` (and extensions in `src/components/panels/panels.test.ts`) will cover all functional and accessibility requirements:

### Test Suite Structure (`src/components/modals/plant-identity.test.tsx`)

```typescript
describe("Milestone 3 — PlantIdentityModal & Biological Age Integration", () => {
  it("1. renders modal with initial values from RunPackage and plant identity", () => {
    // Verifies Breeder, Seed Lot, Seed Type, Genetics, and Day Zero Anchor are correctly pre-filled.
  });

  it("2. updates form controls and computes biological age math live preview", () => {
    // Changes Day Zero Anchor to 'emergence' and sets date 10 days in the past.
    // Verifies live preview calculates biologicalAgeDays = 10.
  });

  it("3. validates Day Zero Anchor switching (seed-started vs emergence vs first-true-leaves)", () => {
    // Switches between 5 DayZeroAnchor options and verifies calculateBiologicalPlantAge output.
  });

  it("4. invokes onSave callback with updated RunPackage, growthEvents, and auditEvents", () => {
    // Simulates form submission. Verifies onSave is called with updated plant identity,
    // new growth event for dayZeroAnchor, updated config, and appended audit event.
  });

  it("5. complies with 2026 Master Class Elite accessibility & 44px min touch target sizes", () => {
    // Checks dialog role, aria-modal, aria-labelledby, close button 44px min size, and backdrop click handler.
  });
});
```

---

## 6. Verification Checklist for Milestone 3 Implementation

| Verification Item     | Target Standard                          | Status / Plan      |
| --------------------- | ---------------------------------------- | ------------------ |
| `npx tsc --noEmit`    | Clean zero error output                  | M5 Quality Gate    |
| `npx vitest run`      | All unit tests pass (156+ -> 170+ tests) | M5 Quality Gate    |
| `pnpm build`          | Production build success                 | M5 Quality Gate    |
| German Terminology    | 100% German UI with `TermTooltip.tsx`    | Enforced in design |
| 44px Min Touch Target | All inputs/buttons `>= 44px`             | Enforced in design |
| Audit Trail Integrity | Immutable append-only audit events       | Enforced in design |
