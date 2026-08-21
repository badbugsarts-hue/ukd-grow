# Project Plan: UKD App Product Science & Data Lineage (2026-08-14 Release)

## Architecture & Design Principles

- **Component Architecture**: Modular component library under `src/components/`, split into `common/` (primitives, tooltips, gauges), `panels/` (domain input panels), and `modals/` (dedicated data lineage modals).
- **State & Data Flow**: Unidirectional state flow using immutable `RunPackage` snapshots. Panels/Modals invoke pure domain state transitions in `src/run-state.ts` and pass updated snapshots to `onUpdateRun`.
- **Audit & Lineage**: Append-only event flow (`auditEvents` and `domainEvents`). Active run snapshots (`configurationSnapshot`) remain immutable.
- **2026 Master Class Elite UX**: CSS design tokens (`styles.css`), 44px min touch targets, WCAG 2.2 AA accessibility, German terminology with inline tooltips (`TermTooltip.tsx`).

## Feature Inventory (2026-08-14 Release)

| #   | Feature                                       | Description                                                                                      | Milestone | Source                      |
| --- | --------------------------------------------- | ------------------------------------------------------------------------------------------------ | --------- | --------------------------- |
| 11  | F11: PPFD 9-Point Mapping Math & Calculations | `calculatePpfdMapSummary`: Mean, Min, Max, Uniformity (min/mean) for 3x3 grid                    | M1        | ORIGINAL_REQUEST R1         |
| 12  | F12: Sensor Calibration Trust & Expiry Engine | `getSensorCalibrationStatus`: pH (30d) & EC (60d) expiration, `calibration-due` trust status     | M1        | ORIGINAL_REQUEST R1         |
| 13  | F13: Plant Identity Day Zero Anchor Engine    | `calculateBiologicalPlantAge`: 5 Day Zero anchors (`emergence`, `seed-planted`, etc.)            | M1        | ORIGINAL_REQUEST R2         |
| 14  | F14: Pot Weight & Dryback Calculation Model   | `calculateSubstrateHydration`: Moisture %, depletion %, dryback g/h, moisture category           | M1        | ORIGINAL_REQUEST R3         |
| 15  | F15: Equipment Manager Panel & Specs          | `EquipmentManagerPanel`: Hardware inventory, fixture specs, maintenance log (route `#equipment`) | M2        | ORIGINAL_REQUEST R1         |
| 16  | F16: 9-Point PPFD Mapping Modal UI            | `PpfdMappingModal`: 3x3 visual grid (NW..SE), height, dimmer %, live stats, color intensity      | M2        | ORIGINAL_REQUEST R1         |
| 17  | F17: Sensor Calibration Manager UI            | `SensorCalibrationModal`: pH/EC status cards, valid/expired badges, 3-step calibration flow      | M2        | ORIGINAL_REQUEST R1         |
| 18  | F18: Plant Identity & Biology Engine UI       | `PlantIdentityModal`: Breeder, seed lot, phenotype, Day Zero anchor picker, live age preview     | M3        | ORIGINAL_REQUEST R2         |
| 19  | F19: Interactive Pot Weight Dryback UI        | Interactive dryback widget in `DailyOperatorPanel`: TARA, saturated mass, current mass, gauge    | M4        | ORIGINAL_REQUEST R3         |
| 20  | F20: App Shell Routing & State Callbacks      | Route `#equipment` binding in `App.tsx`, state callbacks for all modals and panels               | M4        | ORIGINAL_REQUEST R2         |
| 21  | F21: Unit & Component Test Suite              | Tests for all domain math extensions and modal UI components (156+ passing tests)                | M5        | ORIGINAL_REQUEST Acceptance |
| 22  | F22: E2E Browser Visual UX & Audit Gate       | Browser subagent flow & visual screenshot verification, `pnpm check`, Forensic Audit CLEAN       | M5        | ORIGINAL_REQUEST R3         |

## Milestones Roadmap

| #   | Name                                                 | Scope                                                                             | Dependencies | Status      |
| --- | ---------------------------------------------------- | --------------------------------------------------------------------------------- | ------------ | ----------- |
| M1  | Domain & Data Lineage Engine Extensions              | `src/domain.ts`, `src/scientific-core.ts`, `src/domain.test.ts`                   | None         | PLANNED     |
| M2  | Equipment Manager & Sensor Calibration UI            | `EquipmentManagerPanel.tsx`, `PpfdMappingModal.tsx`, `SensorCalibrationModal.tsx` | M1           | PLANNED     |
| M3  | Plant Identity & Biology Engine UI                   | `PlantIdentityModal.tsx`, `RunConfigPanel.tsx` integration                        | M1           | DONE (PASS) |
| M4  | Pot Weight Tracking & App Shell Integration          | Pot weight widget in `DailyOperatorPanel.tsx`, route wiring in `App.tsx`          | M2, M3       | DONE (PASS) |
| M5  | Test Suite, E2E Browser UX Validation & Quality Gate | Vitest tests, `pnpm check`, Browser agent visual verification, Forensic Audit     | M4           | DONE (PASS) |

## Interface Contracts

### 9-Point PPFD Grid Summary Contract

```typescript
export interface PpfdMapSummary {
  mean: number;
  min: number;
  max: number;
  uniformity: number; // min / mean
}

export function calculatePpfdMapSummary(
  points: PpfdMapPoint[],
  fixtureHeightCm: number,
  dimmerPercent: number,
): PpfdMapSummary;
```

### Sensor Calibration Expiry Contract

```typescript
export type SensorCalibrationStatus =
  "valid" | "expired" | "failed" | "uncalibrated";

export function getSensorCalibrationStatus(
  deviceId: string,
  metric: MeasurementMetric,
  calibrations: CalibrationRecord[],
  now?: Date,
): SensorCalibrationStatus;
```

### Biological Plant Age Contract

```typescript
export function calculateBiologicalPlantAge(
  dayZeroAnchor: DayZeroAnchor,
  growthEvents: GrowthEvent[],
  now?: Date,
): {
  biologicalAgeDays: number;
  operationalAgeDays: number;
  anchorDateString: string;
};
```

### Substrate Hydration Contract

```typescript
export interface SubstrateHydration {
  hydrationPercent: number;
  depletionPercent: number;
  availableWaterGrams: number;
  category: "dry" | "light" | "medium" | "heavy" | "saturated";
  drybackRateGramsPerHour?: number;
}

export function calculateSubstrateHydration(
  currentMassGrams: number,
  potProfile: PotProfile,
): SubstrateHydration;
```

## Code Layout

- `src/domain.ts`: Scientific calculations & domain helpers.
- `src/scientific-core.ts`: Sensor calibration trust assessment & measurement validation.
- `src/components/common/`: Shared UI primitives (`TermTooltip.tsx`, `LensBadge.tsx`, `MetricGauge.tsx`).
- `src/components/panels/`: Domain panels (`EquipmentManagerPanel.tsx`, `RunConfigPanel.tsx`, `DailyOperatorPanel.tsx`).
- `src/components/modals/`: Overlay modals (`PpfdMappingModal.tsx`, `SensorCalibrationModal.tsx`, `PlantIdentityModal.tsx`).
- `src/App.tsx`: Navigation routing, modal overlay states, workspace callbacks.
