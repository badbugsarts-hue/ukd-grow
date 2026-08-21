# Handoff Report — Test & Quality Strategy for P0/P1 Science & Data Lineage UI

**Agent**: `explorer_r1_testing`  
**Working Directory**: `c:\Users\badbu\Documents\grow\.agents\explorer_r1_testing`  
**Date**: 2026-08-14

---

## 1. Observation

### Existing Test Runner & Configuration

- **Configuration File**: `vite.config.ts` (Lines 10-13)

  ```ts
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  }
  ```

  _(Note: The project uses `vite.config.ts` for Vitest configuration via `import { defineConfig } from "vitest/config"`)._

- **Test Suite Execution Baseline**:
  - Command: `npx vitest run`
  - Result: **14 Test Files passed**, **156 Tests passed** (0 failures).
  - Test files cataloged:
    1. `src/domain.test.ts` (10 tests)
    2. `src/run-state.test.ts` (13 tests)
    3. `src/backup.test.ts` (3 tests)
    4. `src/components/common/common.test.ts` (18 tests)
    5. `src/components/panels/nutrient-runconfig-stress.test.ts` (19 tests)
    6. `src/components/panels/daily-operator-glossary.test.ts` (17 tests)
    7. `src/components/panels/panels.test.ts` (12 tests)
    8. `src/components/common/lens-badge-tooltip-m4.test.tsx` (5 tests)
    9. `src/AppIntegration.test.tsx` (12 tests)
    10. `src/m4-empirical-challenge.test.ts` (14 tests)
    11. `src/components/panels/climate-stress-test.test.ts` (17 tests)
    12. `src/AppRoutingStress.test.tsx` (8 tests)
    13. `src/components/common/interactive-verification.test.tsx` (5 tests)
    14. `src/scientific-core.test.ts` (3 tests)

- **Existing Domain Types & Interfaces (`src/types.ts`)**:
  - `PpfdMapPosition`: `"NW" | "N" | "NE" | "W" | "C" | "E" | "SW" | "S" | "SE"` (Lines 268-277)
  - `PpfdMap`: `{ id, dimmerPercent, powerWatts, fixtureHeightCm, points: PpfdMapPoint[], mean, min, max, uniformity, measurementDevice, measuredAt }` (Lines 284-296)
  - `CalibrationRecord`: `{ id, deviceId, metric, performedAt, validUntil, method, referenceStandard, uncertainty, unit, result }` (Lines 768-778)
  - `PlantIdentity`: `{ breeder, seedType, seedLot, packBatch, sourceDate, phenotypeNotes }` (Lines 223-230)
  - `DayZeroAnchor`: `"seed-started" | "seed-planted" | "emergence" | "first-true-leaves" | "run-operational-start"` (Lines 234-240)
  - `PotProfile`: `{ type, nominalVolumeLiters, actualFillLiters, diameterCm, heightCm, emptyMassGrams, saturatedMassGrams }` (Lines 213-221)
  - `IrrigationEvent`: `{ id, runId, plantId, day, occurredAt, potMassBeforeGrams, potMassAfterGrams, timeSinceLastIrrigationMin, waterAppliedLiters, drainVolumeLiters, drainPercent, drainPh, drainEc, rootZoneMoisture, mixBatchId, notes }` (Lines 312-329)

- **Existing Measurement Trust & Calibration Logic (`src/scientific-core.ts`)**:
  - `assessMeasurementTrust(...)` checks `validUntil` date window and returns `status: "calibration-due"` when `validUntil < now` (Lines 77-81).

---

## 2. Logic Chain

From the observed domain interfaces, existing test execution patterns, and requirements in `ORIGINAL_REQUEST.md` (R1 Equipment & Data Lineage, R2 Plant Identity, R3 Usability & Validation), we derive the required test specifications across unit tests, component tests, and visual UX workflows.

### 2.1 Unit Test Requirements for Domain Extensions

#### A. 9-Point PPFD Mapping Grid Calculations (`src/domain.ts` / `src/scientific-core.ts`)

_Function Specification_: `calculatePpfdMapMetrics(points: PpfdMapPoint[]): { mean: number; min: number; max: number; uniformity: number }`

- **Test Case 1.1 — Standard 9-Point Grid Calculation**:
  - Input: Grid of 9 points (`NW`: 450, `N`: 500, `NE`: 460, `W`: 520, `C`: 650, `E`: 530, `SW`: 440, `S`: 490, `SE`: 450).
  - Expected: `mean` = 498.89 (rounded to 1 decimal place), `min` = 440, `max` = 650, `uniformity` = 0.677 (min/mean ratio or min/max ratio).
- **Test Case 1.2 — Perfect Uniform Light Source**:
  - Input: All 9 points equal to 600 µmol/m²/s.
  - Expected: `mean` = 600, `min` = 600, `max` = 600, `uniformity` = 1.000.
- **Test Case 1.3 — Incomplete or Non-Standard Grid Validation**:
  - Input: Array with fewer than 9 positions (e.g. 5 points) or missing central/corner position.
  - Expected: Function returns fallback status / throws explicit `Error("9-Punkt PPFD Raster unvollständig")` or calculates partial stats with warning flag.
- **Test Case 1.4 — Out-of-Bounds & Negative Value Clamping**:
  - Input: PPFD value < 0 (e.g. -50) or non-finite values (`NaN`).
  - Expected: Values clamped to 0 or rejected during validation gate.
- **Test Case 1.5 — Fixture Metadata Validation**:
  - Input: Fixture height = 45cm, Dimmer % = 80%, Rated power = 240W.
  - Expected: `PpfdMap` object generated retains metadata, height > 0 required.

#### B. pH/EC Sensor Calibration Valid / Expired Logic (`src/scientific-core.ts`)

_Function Specification_: `assessCalibrationState(calibration: CalibrationRecord | undefined, metric: MeasurementMetric, now: Date): "valid" | "expired" | "failed" | "unverified"`

- **Test Case 2.1 — Active Calibration Window**:
  - Input: `performedAt` = "2026-08-01T00:00:00Z", `validUntil` = "2026-09-01T00:00:00Z", `result` = "passed", `now` = "2026-08-14T00:00:00Z".
  - Expected: Returns `"valid"`.
- **Test Case 2.2 — Expired Calibration Window**:
  - Input: `validUntil` = "2026-08-10T00:00:00Z", `now` = "2026-08-14T00:00:00Z".
  - Expected: Returns `"expired"` / triggers `"calibration-due"` trust status in `assessMeasurementTrust`.
- **Test Case 2.3 — Failed Calibration Result**:
  - Input: `result` = "failed", `validUntil` in future.
  - Expected: Returns `"failed"`, blocks measurement trust assessment regardless of `validUntil`.
- **Test Case 2.4 — Metric & Device Specificity**:
  - Input: Calibration record exists for `water.ph` on `device-1`. Assessment requested for `water.ec` on `device-1` or `water.ph` on `device-2`.
  - Expected: Returns `"unverified"`, preventing cross-device or cross-metric calibration leakage.
- **Test Case 2.5 — Standard Buffer Reference Matching**:
  - Input: pH calibration with standard buffers 4.01 and 7.00; EC calibration with 1.413 mS/cm.
  - Expected: Verification of reference standard string in calibration history record.

#### C. Plant Identity & Day Zero Anchor Math (`src/domain.ts`)

_Function Specification_: `calculateCurrentDayFromAnchor(anchorType: DayZeroAnchor, anchorDate: string, currentDate: string): { currentDay: number; stageName: string }`

- **Test Case 3.1 — Day Zero Emergence Anchor Math**:
  - Input: Anchor = `emergence`, `anchorDate` = "2026-08-01", `currentDate` = "2026-08-14".
  - Expected: `currentDay` = 13 (Day 0 = emergence day).
- **Test Case 3.2 — Pre-Emergence / Seed Planted Math**:
  - Input: Anchor = `seed-planted` on "2026-07-28", `currentDate` = "2026-08-01" (`emergence`).
  - Expected: `currentDay` calculated deterministically without hardcoded default "Day 0" fallback.
- **Test Case 3.3 — Timezone-Safe Date Difference**:
  - Input: Dates across DST changes or UTC boundary ("2026-03-28" to "2026-03-30").
  - Expected: Exact day count without +1/-1 day rounding errors due to local timezone offsets.
- **Test Case 3.4 — Genetics vs Breeder Isolation**:
  - Input: Updating `PlantIdentity` with Breeder: "Mephisto Genetics", Seed Lot: "LOT-2026-X", Phenotype: "Pink Pheno #2".
  - Expected: `RunConfig.genetics` ("Double Grape Auto") remains distinct from breeder/phenotype identity object.

#### D. Pot Weight & Hydration Status Logic (`src/domain.ts`)

_Function Specification_: `calculatePotHydration(currentMassGrams: number, potProfile: PotProfile): { hydrationPercent: number; moistureCategory: "dry" | "light" | "medium" | "heavy" | "saturated"; availableWaterGrams: number }`

- **Test Case 4.1 — Hydration Percentage & Category Mapping**:
  - Input: `emptyMassGrams` = 800g (TARA), `saturatedMassGrams` = 4800g (100% Field Capacity), `currentMassGrams` = 3400g.
  - Calculation: Available water = (3400 - 800) / (4800 - 800) = 2600 / 4000 = 65%.
  - Expected: `hydrationPercent` = 65.0%, `moistureCategory` = `"medium"` ("Optimal").
- **Test Case 4.2 — Dry & Saturated Threshold Boundaries**:
  - Input A: Current mass = 1200g (Available water = 10%). Expected: `hydrationPercent` = 10%, `moistureCategory` = `"dry"` ("Trocken / Giessbedarf").
  - Input B: Current mass = 4700g (Available water = 97.5%). Expected: `hydrationPercent` = 97.5%, `moistureCategory` = `"saturated"` ("Vollständig gesättigt").
- **Test Case 4.3 — Invalid Weight Protection**:
  - Input: Current mass < empty mass (e.g. 600g < 800g TARA).
  - Expected: Hydration clamped to 0%, warning flag generated ("Messwert unter Topf-Eigengewicht").
- **Test Case 4.4 — Dryback Rate (g/h) & Trend Calculation**:
  - Input: Irrigation events with pot mass before/after over 24h.
  - Expected: Dryback rate in g/h calculated matching `calculateDrybackRate` in `domain.ts`, trend = `"stable" | "increasing" | "decreasing"`.

---

### 2.2 Component Test Requirements for New Modals

Component tests must follow the project's existing Vitest pattern (`React.isValidElement`, prop contract validation, and immutable state callback execution).

#### A. `PpfdMappingModal.test.tsx`

- **Test 1 — Grid Inputs Rendering**: Renders 9 input fields corresponding to positions `NW`, `N`, `NE`, `W`, `C`, `E`, `SW`, `S`, `SE`, fixture height input, and dimmer % slider.
- **Test 2 — Live Statistics Calculation**: Verifies that updating grid values recalculates displayed Mean PPFD, Min, Max, and Uniformity ratio dynamically.
- **Test 3 — Form Validation**: Blocks submission when fixture height <= 0 or any grid PPFD value is negative. Displays German error message.
- **Test 4 — Save Callback & Immutability**: Clicking "Speichern" calls `onUpdateRun` with updated `light.ppfdMaps` array containing new `PpfdMap` record, leaving original `RunPackage` unmutated.
- **Test 5 — German Terminology & Tooltips**: Verifies presence of `TermTooltip` for "PPFD", "Uniformität", and "Hängeabstand".

#### B. `SensorCalibrationManager.test.tsx`

- **Test 1 — History Table Rendering**: Renders past calibration records for pH and EC sensors with date, metric, method, and result.
- **Test 2 — New Calibration Form**: Form fields for Metric selection (`water.ph` / `water.ec`), Calibration Buffer (pH 4.01 / 7.00 / 10.01 or EC 1.413 mS/cm), Raw Reading, and Target Temperature.
- **Test 3 — Status Indicator Badges**: Displays green "Gültig" badge for active calibrations and red "Abgelaufen" / "Fehlgeschlagen" badge for expired/failed records.
- **Test 4 — Save & State Integration**: Submitting valid calibration calls `onUpdateRun` appending a new `CalibrationRecord` to `run.calibrations`.
- **Test 5 — Accessibility & Focus**: Verifies modal aria attributes (`role="dialog"`, `aria-labelledby`).

#### C. `PlantIdentityModal.test.tsx`

- **Test 1 — Plant Identity Form Rendering**: Input fields for Breeder, Seed Lot, Pack Batch, Phenotype Notes, and Seed Type dropdown (`regular`, `feminized`, `autoflower`, `clone`).
- **Test 2 — Day Zero Anchor Selection**: Radio group for 5 Day Zero anchors (`seed-started`, `seed-planted`, `emergence`, `first-true-leaves`, `run-operational-start`) and anchor date picker.
- **Test 3 — Live Day Preview**: Live preview text showing "Berechneter Tag 0: [Datum]" and "Aktueller Kulturtag: Tag X".
- **Test 4 — Empty Value Validation**: Prevents saving when Breeder or Anchor Date is empty.
- **Test 5 — Immutability Assertion**: Verifies `run.config.dayZeroAnchor` and `run.plants[0].identity` updated without mutating existing `RunPackage`.

#### D. `PotWeightTracker.test.tsx`

- **Test 1 — Weight Profile & Current Reading**: Inputs for Empty Pot Mass (TARA), Saturated Mass, and Current Measured Pot Weight.
- **Test 2 — Live Hydration Bar**: Visual gauge displaying current hydration % (0-100%) and German status text ("Trocken", "Leicht", "Optimal", "Schwer", "Gesättigt").
- **Test 3 — Dryback Summary Display**: Renders dryback rate (g/h) and trend icon based on previous irrigation measurements.
- **Test 4 — Mass Input Validation**: Blocks submission if current weight < empty pot mass.
- **Test 5 — Save Callback**: Submitting updates `run.observations` / `run.config.pot` immutably.

---

### 2.3 UX Verification Workflow for Browser Subagent Visual Testing

To satisfy Acceptance Criteria R3 & Browser Agent Verification in `ORIGINAL_REQUEST.md`, the `browser` subagent must execute an automated visual testing workflow:

```
[Start Dev Server / Preview]
       │
       ▼
1. Navigation & Route Opening
   ├─ Navigate to http://127.0.0.1:4173#setup (or #equipment / #today)
   ├─ Click Modal Trigger Buttons ("PPFD Mapping", "Sensor kalibrieren", "Pflanzenidentität", "Topfgewicht")
   └─ Take Screenshot #1 (Modal Opened State)
       │
       ▼
2. Visual Layout & 2026 Elite Design Verification
   ├─ Verify Modal Centering, Backdrop Blur/Overlay, Spacing, Typography
   ├─ Check CSS Variable Compliance (var(--green), var(--surface-1), var(--border-subtle))
   ├─ Check Touch Target Sizes (Min 44x44px for buttons/inputs on Mobile 375x812)
   └─ Take Screenshot #2 (Viewport Responsiveness: 1920x1080 & 375x812)
       │
       ▼
3. Form Validation & Error Handling (Negative Testing)
   ├─ Click "Speichern" with empty mandatory fields -> Verify form submit blocked
   ├─ Enter out-of-bounds input (e.g. PPFD = -10, pH = 15, Pot Mass = 10g < 800g TARA)
   ├─ Check German Error Tooltips / Alert Boxes (`role="alert"`)
   └─ Take Screenshot #3 (Validation Error State)
       │
       ▼
4. Valid Data Entry & State Persistence Workflow
   ├─ Fill valid test data into all fields
   ├─ Click "Speichern" -> Verify Modal Closes smoothly
   ├─ Verify parent view summary card updates with newly entered values immediately
   ├─ Perform Page Refresh (`browser_navigate` or reload)
   └─ Take Screenshot #4 (Persisted State Verification after Reload)
```

---

## 3. Caveats

1. **Vitest Environment Configuration**: The test runner is configured with `environment: "node"` in `vite.config.ts`. React component integration tests in Vitest verify JSX element validity (`React.isValidElement`), prop structures, and handler invocations without requiring a full DOM emulation library (jsdom/happy-dom).
2. **Browser Subagent Prerequisite**: Automated visual testing requires the local dev server running (`npx vite` or `npx vite preview` on port 4173/5173).
3. **Data Lineage Invariants**: All state updates must pass through `onUpdateRun` returning a fresh immutable `RunPackage` object (zero mutation rule).

---

## 4. Conclusion

The testing framework and current test suite (156 passing tests) provide a solid baseline. By implementing the specified unit tests for the 4 domain math extensions, component tests for the 4 new modals, and executing the 4-step browser visual UX verification workflow, the project will achieve complete coverage and pass all acceptance criteria in `ORIGINAL_REQUEST.md`.

---

## 5. Verification Method

### Independent CLI Verification Commands

1. **Run Unit & Component Tests**:

   ```powershell
   npx vitest run
   ```

   _Expected_: All 156 existing tests + new unit/component tests pass (0 failures).

2. **TypeScript Compilation & Type Checking**:

   ```powershell
   npx tsc --noEmit
   ```

   _Expected_: Zero TypeScript compilation errors.

3. **Vite Production Build**:

   ```powershell
   npx vite build
   ```

   _Expected_: Successful bundle output in `dist/`.

4. **Full Project Verification Gate**:
   ```powershell
   pnpm check
   ```
   _Expected_: All linting, typechecking, unit tests, budget, security, and e2e checks pass cleanly.

### Invalidation Conditions

- Any mutation of existing `RunPackage` state objects during modal save callbacks.
- Hardcoded default "Day 0" fallback values instead of user-selected Day Zero anchor dates.
- Missing German terminology tooltips on scientific metrics.
- Touch target sizes < 44px or hardcoded color hex values bypassing CSS design tokens.
