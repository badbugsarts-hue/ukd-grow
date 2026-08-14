# Project: UKD App UI Master Class

## Architecture
- **Component Architecture**: Modular component library under `src/components/`, split into `common/` (primitives, tooltips, gauges) and `panels/` (domain-specific input panels).
- **State & Data Flow**: Unidirectional state flow. `App.tsx` (`Workspace`) owns the reactive `run: RunPackage` state, passing it and an `onUpdateRun` callback down to input panels. Panels invoke pure state transition functions (`addObservation`, `addStructuredObservation`, `updateRunConfig`) from `src/run-state.ts` and pass updated immutable snapshots to `onUpdateRun`.
- **Experience Lenses**: `guided`, `advanced`, and `expert` lenses adjust detail levels, tooltip guidance, and visual density without affecting domain calculations or scientific values.
- **Fail-Closed Safety Contract**: Missing or inconsistent setup/phase inputs block dosage outputs and present clear resolution steps.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | F1: Common UI Primitives & Term Tooltips | `TermTooltip`, `LensBadge`, `MetricGauge`, German term dictionary | M1 | .antigravitz term map |
| 2 | F2: Environment & Climate Targets Panel | `EnvironmentTargetsPanel`: Interactive PPFD, DLI, rF, VPD sliders & gauges | M2 | .antigravitz section map |
| 3 | F3: Nutrient Mix & Recipe Panel | `NutrientMixPanel`: 7-step batch calculator, EC/pH dosing, product status chips | M2 | .antigravitz poster / section map |
| 4 | F4: Run Config & Readiness Setup Panel | `RunConfigPanel`: Medium, light, tent, AKF, water profile setup & fail-closed readiness gate | M2 | .antigravitz decision flow |
| 5 | F5: VPD & DLI Calculator Panel | `VpdDliCalculatorPanel`: Standalone quick calculator with target matrix | M2 | .antigravitz section map |
| 6 | F6: Daily Operator Panel | `DailyOperatorPanel`: Interactive Tageskarten (Days 0-80), 3-step daily action flow | M3 | .antigravitz v10 PDF / posters |
| 7 | F7: Context Help & Knowledge Glossary Panel | `ContextHelpGlossaryPanel`: Searchable, filterable German glossary for all terms | M3 | .antigravitz v10 PDF |
| 8 | F8: App.tsx Shell Integration & Routing | Route integration into `App.tsx` navigation tabs, binding state to `RunPackage` | M4 | ORIGINAL_REQUEST R2 |
| 9 | F9: Component & Unit Test Suite | Co-located unit tests for panel calculations & tooltips (161/161 vitest tests passing) | M5 | ORIGINAL_REQUEST Acceptance |
| 10 | F10: Final Verification & Audit Gate | `npx tsc --noEmit`, `npx vitest run`, `npx vite build`, Forensic Audit CLEAN | M5 | ORIGINAL_REQUEST Acceptance |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Common UI Primitives & Terminology System | `src/components/common/` (`TermTooltip`, `LensBadge`, `MetricGauge`) | None | DONE |
| M2 | Core Interactive Input Panels | `src/components/panels/` (`EnvironmentTargetsPanel`, `NutrientMixPanel`, `RunConfigPanel`, `VpdDliCalculatorPanel`) | M1 | DONE |
| M3 | Daily Operator & Knowledge Glossary Panels | `src/components/panels/` (`DailyOperatorPanel`, `ContextHelpGlossaryPanel`) | M1 | DONE |
| M4 | App Shell Routing & State Integration | Integration in `src/App.tsx` navigation & state callbacks | M2, M3 | DONE |
| M5 | Test Suite, E2E & Final Quality Gate | Unit tests, E2E test verification, full audit, tsc/vitest/vite build check | M4 | DONE |

## Interface Contracts
### Panel Component Contract
```typescript
import { RunPackage, DayPlan, ExperienceLens, RouteId } from '../../types';

export interface PanelProps {
  run: RunPackage;
  plan?: DayPlan;
  lens: ExperienceLens;
  onUpdateRun: (updatedRun: RunPackage) => void;
  navigate?: (route: RouteId) => void;
}
```

### Term Tooltip Component Contract
```typescript
export interface TermTooltipProps {
  term: string; // e.g. "VPD", "DLI", "EC", "PPFD"
  children?: React.ReactNode;
  lens?: ExperienceLens;
  showIcon?: boolean;
}
```

## Code Layout
- `src/components/common/`: Shared UI primitives (`TermTooltip.tsx`, `LensBadge.tsx`, `MetricGauge.tsx`).
- `src/components/panels/`: Domain input panels (`EnvironmentTargetsPanel.tsx`, `NutrientMixPanel.tsx`, `RunConfigPanel.tsx`, `VpdDliCalculatorPanel.tsx`, `DailyOperatorPanel.tsx`, `ContextHelpGlossaryPanel.tsx`).
- `src/App.tsx`: App shell, navigation, workspace routing.
- `src/styles.css`: CSS tokens (`--green`, `--surface-1`, etc.).
