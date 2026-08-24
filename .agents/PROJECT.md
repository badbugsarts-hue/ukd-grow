# Project: UKD-Frontend Usability Review & In-Place Editing Implementation

## Architecture

- **Domain & Engine Layer**: `src/prediction-engine.ts`, `src/domain.ts`, `src/run-state.ts`
- **UI Components & Primitives**: `src/components/common/InlineEditable.tsx`, `src/components/common/InlineMetricCard.tsx`
- **Panels & Workspaces**: `src/components/panels/`, `src/App.tsx`
- **Styles & Layout**: `src/styles.css` (semantic tokens, responsive media queries, safe area insets)
- **Documentation**: `ux_audit_report.md` at workspace root

## Feature Inventory

| #   | Feature                                | Description                                                                                                                                                                                                  | Milestone | Source                               |
| --- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | ------------------------------------ |
| 1   | Prediction Engine Expansion            | Expand `prediction-engine.ts` to support live fuzzy search, environmental corridors, VPD/titration/dryback calculations, and live input suggestions                                                          | M1        | ORIGINAL_REQUEST §R2                 |
| 2   | In-Place Editing UI Primitives         | Create `InlineEditable` and `InlineMetricCard` with keyboard support (Enter/Esc/Tab), suggestion popovers, validation, and >=44px touch targets                                                              | M1        | ORIGINAL_REQUEST §R2                 |
| 3   | Prediction Engine & Primitives Tests   | Add exhaustive unit tests in `prediction-engine.test.ts` and `InlineEditable.test.tsx` verifying suggestions, bounds, and immutability                                                                       | M1        | ORIGINAL_REQUEST Acceptance Criteria |
| 4   | Mobile Layout & Bottom Clearance       | Fix mobile bottom padding collision at <=680px in `styles.css` to prevent floating command center from obscuring save actions                                                                                | M2        | ORIGINAL_REQUEST §R1                 |
| 5   | Touch Target Remediation (>=44px)      | Upgrade all sub-44px buttons, toggles, chips, inputs across panels (`EnvironmentTargets`, `VpdDli`, `Cockpit`, `NutrientMix`, `BatchResolver`, `Masterplan`)                                                 | M2        | ORIGINAL_REQUEST §R1                 |
| 6   | Dashboard In-Place Editing Integration | Replace static read-only cards in `App.tsx` Cockpit and panels with In-Place Editable fields backed by prediction suggestions and immutable audit events (`addObservation`, `addRunOverride`)                | M2        | ORIGINAL_REQUEST §R2                 |
| 7   | UI Contracts & A11y Fixes              | Fix missing CSS classes (`.batch-resolver-dashboard`, `.run-list`), fix anchor a11y in `MasterplanOverviewPanel`, sticky table headers                                                                       | M2        | ORIGINAL_REQUEST §R1                 |
| 8   | UX Audit Report Creation               | Write comprehensive `ux_audit_report.md` documenting larger architectural and UX issues (navigation consolidation, virtualized tables, reactive store)                                                       | M3        | ORIGINAL_REQUEST §R3                 |
| 9   | Full Gate Verification (`pnpm check`)  | Fix existing test suite fixture discrepancies (`AppIntegration.test.tsx`, `AppM4Integration.test.tsx`, `plant-identity-adversarial-challenger.test.tsx`, secret scanner) and ensure `pnpm check` passes 100% | M3        | ORIGINAL_REQUEST Acceptance Criteria |

## Milestones

| #   | Name                                                    | Scope                                                                                                        | Dependencies | Status  |
| --- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------ | ------- |
| M1  | Core Prediction Engine & In-Place Editing Primitives    | Expand `prediction-engine.ts`, create `InlineEditable`, `InlineMetricCard`, write unit test suites           | none         | PLANNED |
| M2  | Mobile Usability Fixes & Dashboard In-Place Integration | Fix mobile padding, touch targets >=44px, integrate In-Place Editing in `App.tsx` & panels, fix UI contracts | M1           | PLANNED |
| M3  | Full Gate Cleanliness & `ux_audit_report.md`            | Create `ux_audit_report.md`, resolve all test suite failures, ensure `pnpm check` passes 100%                | M1, M2       | PLANNED |

## Interface Contracts

### `prediction-engine.ts`

- `getLiveFieldSuggestions(fieldKey: string, partialInput: string, context?: PredictionContext): PredictionSuggestion[]`
- `predictGeneticsMetadata(strainName: string): GeneticsMetadataPrediction`
- `predictEmergenceDate(pottingDateStr: string): string`
- `predictEnvironmentalCorridor(growthStage: string, lightIntensityPpfd?: number): CorridorPrediction`
- `calculateLiveVpd(airTempC: number, relativeHumidityPct: number, leafTempOffsetC?: number): number`

### `InlineEditable.tsx` & `InlineMetricCard.tsx`

- Props: `value: T`, `label: string`, `unit?: string`, `fieldKey: string`, `context?: PredictionContext`, `onSave: (newValue: T, reason?: string) => void`, `validator?: (val: T) => boolean | string`, `minTouchTarget?: boolean` (defaults to true: min-height 44px)
- Keyboard shortcuts: `Enter` to commit, `Escape` to cancel, `Tab` to commit and blur.
- Live suggestion dropdown displaying prediction badge `⚡ Vorhersage` with one-click adoption.

### State & Event Contracts

- In-Place observation updates must invoke `addObservation` from `run-state.ts`.
- In-Place target parameter overrides must invoke `addRunOverride` with explicit override reason.
- Never directly mutate canonical EvidenceStore or active RunPackage snapshots.

## Code Layout

- `src/prediction-engine.ts`: Live prediction and auto-suggestion functions.
- `src/prediction-engine.test.ts`: Unit tests for prediction engine.
- `src/components/common/InlineEditable.tsx`: In-place input primitive.
- `src/components/common/InlineMetricCard.tsx`: Metric display card with in-place edit mode.
- `src/components/common/InlineEditable.test.tsx`: Unit tests for in-place edit components.
- `src/components/panels/`: Specialized panels updated with >=44px touch targets and inline edits.
- `src/App.tsx`: Cockpit dashboard integrating metric in-place editing.
- `src/styles.css`: Semantic CSS variables, mobile media query clearances, touch target utility classes.
- `ux_audit_report.md`: Markdown report in workspace root.
