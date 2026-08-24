# Project: UKD Grow Masterplan Setup View & Autoflower Cockpit Integration

## Architecture

- **App Shell & Routing (`src/App.tsx`)**: Hosts global Topbar with Live/Simulation toggle, manages route navigation, handles active `RunPackage` persistence to IndexedDB (`ukd-operator-workspace` v8), and propagates global plan/current day state to all panels.
- **State & Domain Engine (`src/run-state.ts`, `src/run-storage.ts`, `src/domain.ts`, `src/live-run.ts`)**:
  - `RunPackage`: Versioned schema (`6.0.0`), `executionMode: "simulation" | "live"`, `run.config` with complete setup parameters and pot profile.
  - `GrowthEvents & Milestones`: Records `seed-planted` (potting) and `emergence` (Day Zero) events in `run.growthEvents`, calculating biological age vs operational age and recalculating `currentDay` in Live mode.
  - `Domain Recalculation`: Dynamic recalculation of daily DLI, VPD, and nutrient targets via `getDayPlan(workbook, calculatedDay)`.
- **Autoflower Cockpit (`src/data/autoflower-cockpit.json`, `src/components/panels/AutoflowerCockpitPanel.tsx`, `src/components/modals/AutoflowerCockpitModal.tsx`)**:
  - 61-strain verified dataset extracted from Autoflower-Cockpit v3 reference.
  - Full interactive browser with facets (breeder, cycle time, difficulty, cannabinoid profile, mold/feed sensitivity, yield projection).
  - Cultivar selection mechanism that populates `run.config.genetics` and `run.plantIdentity`.
- **Comprehensive Setup View (`src/components/panels/RunConfigPanel.tsx`)**:
  - 8-card categorized setup interface (Genetics & Cockpit, Timeline & Milestones, Lighting & PPFD, Tent & Geometry, Water Chemistry, Pot & Substrate / Dryback, Ventilation & Exhaust, Nutrient & Irrigation System).
  - Full visibility and direct editing with validation of all configured parameters.
  - Live vs Simulation mode toggle with instant persistence and audit tracking.

## Feature Inventory

| #   | Feature                                     | Description                                                                                                                                                                                                                                        | Milestone | Source                  | Status |
| --- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ----------------------- | ------ |
| F1  | Setup Parameters Visibility & Editing       | Display and allow direct editing of all `RunConfig` and `PotProfile` parameters in `RunConfigPanel.tsx` (including `plantCount`, `startDate`, `endDay`, `mediumProduct`, `pot.type`, `nominalVolumeLiters`, `nutrientSystem`, `irrigationSystem`). | M3        | User R1, Explorer Setup | DONE   |
| F2  | Ventilation & Exhaust Persistence           | Persist `exhaustM3h` into `run.equipment` / `run.config` instead of transient React local state.                                                                                                                                                   | M3        | Explorer Setup          | DONE   |
| F3  | Substrate Dryback Tare Weights              | Add `emptyMassGrams` and `saturatedMassGrams` inputs to Pot & Substrate card to satisfy `calculateSubstrateHydration` domain requirements.                                                                                                         | M3        | User R5, Explorer Setup | DONE   |
| F4  | Autoflower Cockpit 61-Strain Dataset        | Integrate the verified 61-strain plant dataset with 44 fields into `src/data/autoflower-cockpit.json` and TypeScript types.                                                                                                                        | M1        | User R2, Spec Miner     | DONE   |
| F5  | Autoflower Cockpit Browser & Selector Modal | Create interactive 2026-design browser and modal selector with multi-facet filters, search, drawer detail, and direct selection into active `run.config`.                                                                                          | M2        | User R2, Spec Miner     | DONE   |
| F6  | Global Live vs Simulation Mode Toggle       | Implement global Live/Simulation switch in header/topbar with status indicator, anti-rollback protection, and instant IndexedDB persistence.                                                                                                       | M1, M4    | User R3, Explorer State | DONE   |
| F7  | Retroactive Plant Milestone Tracking        | Support retroactive entry of potting (`seed-planted`) and emergence (`emergence` / Day Zero) dates in Setup with dynamic calendar and biological age recalculation.                                                                                | M1, M3    | User R4, Explorer State | DONE   |
| F8  | Dynamic Global Plan Recalculation           | Dynamically compute operational `currentDay` from retroactive milestones in Live mode, updating all downstream panels (`Cockpit`, `Today`, `MixLab`, `Climate`, `Timeline`).                                                                       | M4        | User R4, Explorer State | DONE   |
| F9  | Missing UKD Setup Elements & Validation     | Implement complete setup elements: tent geometry volume calculations, target VPD ranges, fan turnover CFM, substrate mix ratios, base water ions, KCanG compliance checks.                                                                         | M3        | User R5, Explorer Setup | DONE   |
| F10 | Comprehensive Test Verification & Full Gate | Maintain 100% passing tests (485/485 passing), typecheck, build, and forensic audit CLEAN.                                                                                                                                                         | M4        | Acceptance Criteria     | DONE   |

## Milestones

| #   | Name                                                            | Scope                                                                                                                                                                                                                                      | Dependencies | Status |
| --- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------ | ------ |
| M1  | Data Models, Storage & State Engine                             | Update `src/types.ts`, `src/data/autoflower-cockpit.json`, `src/run-state.ts`, `src/run-storage.ts`, and `src/live-run.ts` with Live/Simulation toggle helpers, 61-strain types, and retroactive milestone mutation/audit functions.       | none         | DONE   |
| M2  | Autoflower Cockpit Browser & Selector                           | Build/update `src/components/panels/AutoflowerCockpitPanel.tsx` and create `src/components/modals/AutoflowerCockpitModal.tsx` matching 2026 dark emerald aesthetics, multi-facet filtering, sliding drawer, and strain selection callback. | M1           | DONE   |
| M3  | Setup View Parameter Visibility, Editing & Missing Elements     | Revamp `src/components/panels/RunConfigPanel.tsx` with 8 modular cards, full editing, dryback tare weights, persistent ventilation, retroactive milestone date pickers, and missing UKD elements.                                          | M1, M2       | DONE   |
| M4  | App Shell Global Integration, Dynamic Plan Recalculation & Gate | Wire Global Live/Sim toggle into `src/App.tsx`, mount Autoflower Cockpit in library/selector routes, ensure dynamic plan updates across panels, run full test suite, typecheck, build, and forensic audit.                                 | M1, M2, M3   | DONE   |

## Interface Contracts

### Data & State Model (`src/run-state.ts`, `src/types.ts`)

```typescript
export interface AutoflowerStrain {
  id: string;
  name: string;
  breeder: string;
  genetics: string;
  type: string;
  cycleWeeksMin: number;
  cycleWeeksMax: number;
  expectedYieldMinG: number;
  expectedYieldMaxG: number;
  thcPercentMin: number;
  thcPercentMax: number;
  cbdPercentMin: number;
  cbdPercentMax: number;
  terpenes: string[];
  moldResistance: string;
  feedTolerance: string;
  difficulty: string;
  heightMinCm: number;
  heightMaxCm: number;
  description: string;
  provenance: string;
  evidenceRating: number;
}

export function updateExecutionMode(
  run: RunPackage,
  mode: "simulation" | "live",
): RunPackage;
export function updatePlantMilestones(
  run: RunPackage,
  milestones: { pottingDateIso?: string; emergenceDateIso?: string },
  reason?: string,
): RunPackage;
```

## Code Layout

- `src/types.ts`: Type definitions for RunPackage, PotProfile, EquipmentProfile, AutoflowerStrain, Milestones.
- `src/data/autoflower-cockpit.json`: Verified 61-strain canonical plant database.
- `src/run-state.ts`: Reducers, milestone helpers, execution mode toggle, domain events, and audit events.
- `src/run-storage.ts`: IndexedDB persistence and recovery.
- `src/domain.ts`: Biological age calculation, dynamic day calculation, substrate hydration, DLI/VPD calculations.
- `src/live-run.ts`: Live clock evaluation with anti-rollback.
- `src/components/panels/AutoflowerCockpitPanel.tsx`: Full standalone Autoflower Cockpit browser.
- `src/components/modals/AutoflowerCockpitModal.tsx`: Modal dialog for selecting genetics into setup.
- `src/components/panels/RunConfigPanel.tsx`: Comprehensive 8-card setup view.
- `src/App.tsx`: App shell, topbar Live/Sim toggle, routing, state coordination.
