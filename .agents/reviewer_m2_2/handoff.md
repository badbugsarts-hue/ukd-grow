# Handoff Report — Milestone 2 Reviewer 2 (Core Interactive Input Panels)

## 1. Observation

### System & Build Checks
- **TypeScript Typecheck**: `npx tsc --noEmit` executed with 0 errors (Exit code 0).
- **Vitest Unit Test Suite**: `npx vitest run` executed with 1 failed test file and 2 failed individual tests:
  ```
  FAIL  src/components/panels/climate-stress-test.test.ts > Milestone 2 - Interactive Climate Controls & Domain Stress Test Suite > VpdDliCalculatorPanel component props stress testing > instantiates VpdDliCalculatorPanel with extreme initial props without crashing
  TypeError: Cannot read properties of null (reading 'useState')
   ❯ process.env.NODE_ENV.exports.useState node_modules/.pnpm/react@19.2.8/node_modules/react/cjs/react.development.js:1263:33
   ❯ VpdDliCalculatorPanel src/components/panels/VpdDliCalculatorPanel.tsx:31:33
  ```

### Code Inspection Findings

#### Finding 1 [CRITICAL - FAIL-CLOSED SAFETY RULE VIOLATION / INTEGRITY]
- **File**: `src/components/panels/NutrientMixPanel.tsx`, lines 36–54 & lines 403–441.
- **Observed Code**:
  ```tsx
  // Line 36
  const isWaterProfileIncomplete =
    water.sourcePh === null ||
    water.sourceEc === null ||
    water.calciumMgL === null;

  // Line 42
  const mixItems = plan
    ? calculateMix(plan, batchLiters)
    : [ ... ];

  // Line 430
  {item.warning ? (
    <span style={{ color: "var(--amber)" }}>⚠️ {item.warning}</span>
  ) : (
    <span style={{ color: "var(--green)" }}>✓ Freigegeben</span>
  )}
  ```
- **Issue**: Although `isWaterProfileIncomplete` triggers a red warning banner at line 164, the panel **fails to block positive dose generation**. `mixItems` calculates and displays positive dosage values (e.g. 2.5 ml/L, 25.0 ml total) and marks items as `✓ Freigegeben` even when essential water chemistry (pH, EC, Ca/Mg) is missing. This violates the core fail-closed safety requirement ("Missing water chemistry shows warning alert and blocks positive dose generation").

#### Finding 2 [MAJOR - COSMETIC-ONLY CONFLICT DETECTION]
- **File**: `src/components/panels/NutrientMixPanel.tsx`, lines 28, 348–367, 403–441.
- **Observed Code**:
  ```tsx
  const [stackingBoosterConflict, setStackingBoosterConflict] = useState<boolean>(false);
  ...
  <input
    type="checkbox"
    checked={stackingBoosterConflict}
    onChange={(e) => setStackingBoosterConflict(e.target.checked)}
  />
  ```
- **Issue**: Checking the PK booster conflict checkbox displays a warning text box in Step 4, but **does not modify `mixItems` or block PK 13/14 dosage**. In the recipe table, PK 13/14 continues to show positive dosage values and remains approved (`✓ Freigegeben`), rendering the conflict enforcement non-functional.

#### Finding 3 [CRITICAL - TEST SUITE EXECUTION FAILURE]
- **File**: `src/components/panels/climate-stress-test.test.ts`, lines 167 & 182.
- **Observed Code**:
  ```ts
  const element = VpdDliCalculatorPanel(extremeProps);
  ```
- **Issue**: `VpdDliCalculatorPanel` is invoked directly as a plain JavaScript function rather than rendered as a React component. Because the component uses `useState`, calling it directly throws `TypeError: Cannot read properties of null (reading 'useState')`, causing the test suite to fail.

#### Verified Features
- **Readiness Score Calculation & Activation Gate**: `RunConfigPanel.tsx` (`calculateReadinessScore`) accurately scores 5 categories at 20% each (100% total). Below 100%, `isReady` is false, missing items are listed, and activation is disabled (`disabled={!readiness.isReady}`). Verified in `panels.test.ts`.
- **German Term Tooltips**: `TermTooltip` is properly rendered across `EnvironmentTargetsPanel.tsx`, `NutrientMixPanel.tsx`, `RunConfigPanel.tsx`, and `VpdDliCalculatorPanel.tsx`.

---

## 2. Logic Chain

1. **Safety Contract Requirement**: The user specification requires that missing water chemistry MUST show a warning alert AND block positive dose generation, and HESI PK 13/14 stacking conflicts MUST be detected and enforced.
2. **Implementation Verification**:
   - In `NutrientMixPanel.tsx`, when `isWaterProfileIncomplete` evaluates to `true`, the alert is rendered, but `mixItems` remains fully populated with non-zero dosages. The user is presented with positive dose values (e.g. 25 ml) for an incomplete water profile, which violates fail-closed safety principles.
   - The HESI PK 13/14 stacking conflict toggle does not impact dose calculation or table output.
3. **Test Suite Verification**:
   - `npx vitest run` yields 2 test failures in `climate-stress-test.test.ts` due to calling React component hooks outside of a React render context.
4. **Deduction**: Because core safety rules are violated (fail-closed dose generation not blocked) and the test suite has failing tests, the work product cannot be approved in its current state.

---

## 3. Caveats

- `src/components/panels/panels.test.ts` (10 tests) passes completely.
- `npx tsc --noEmit` passes without type errors.
- UI layout and visual styling follow project guidelines.

---

## 4. Conclusion

**Verdict**: `REQUEST_CHANGES`

### Summary of Required Changes
1. **Fix Fail-Closed Water Chemistry Gate**: In `NutrientMixPanel.tsx`, when `isWaterProfileIncomplete` is `true`, zero out or block all positive dose calculations in `mixItems` (or display `⛔ Gesperrt: Wasserprofil fehlt` instead of positive ml dosages and `✓ Freigegeben`).
2. **Enforce PK 13/14 Stacking Gate**: In `NutrientMixPanel.tsx`, when `stackingBoosterConflict` is checked, block/zero out PK 13/14 dosage in `mixItems` and update table status to `⛔ GESPERRT: Stacking-Konflikt`.
3. **Fix React Hook Invocation in Test Suite**: In `src/components/panels/climate-stress-test.test.ts`, remove direct function invocation of `VpdDliCalculatorPanel(...)` or test component rendering with `@testing-library/react`.

---

## 5. Verification Method

To verify the requested changes independently:

1. **TypeScript Typecheck**:
   ```bash
   npx tsc --noEmit
   ```
2. **Vitest Test Suite**:
   ```bash
   npx vitest run
   ```
   (Must pass with 0 failures across all test files including `climate-stress-test.test.ts` and `panels.test.ts`).
3. **Inspection of Water Profile Gate**:
   Inspect `src/components/panels/NutrientMixPanel.tsx` to confirm that when `isWaterProfileIncomplete` is true, dose generation is blocked (`dose: 0`, `amount: 0`, and status indicates blocked).
4. **Inspection of PK Stacking Gate**:
   Inspect `src/components/panels/NutrientMixPanel.tsx` to confirm that when `stackingBoosterConflict` is true, PK 13/14 dosage is set to 0 and flagged as blocked.
