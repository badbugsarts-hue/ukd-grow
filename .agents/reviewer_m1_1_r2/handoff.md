# Handoff Report: Reviewer M1 (Domain & Data Lineage Extensions)

**Agent**: `reviewer_m1_1_r2`  
**Role**: Reviewer / Adversarial Critic  
**Target Milestone**: M1 (Domain & Data Lineage Engine Extensions)  
**Working Directory**: `c:\Users\badbu\Documents\grow\.agents\reviewer_m1_1_r2`  
**Verdict**: **APPROVE**

---

## 1. Observation

Direct observations from source inspection, command execution, and test runs:

1. **`src/domain.ts`**:
   - `calculatePpfdMapSummary` (lines 283–311): Calculates mean, min, max (rounded to 1 decimal place), and uniformity (`min / mean`, rounded to 3 decimal places). Handles dimmer scaling (`safeDimmer`), empty grids, NaN/Infinity inputs, and negative values gracefully.
   - `calculateBiologicalPlantAge` (lines 313–367): Accepts 5 `DayZeroAnchor` options. Looks up matching `GrowthEvent`. If present, calculates `biologicalAgeDays = Math.max(0, Math.floor((now - anchorDate) / 86400000))`. If absent, safely falls back to operational start event date / age.
   - `calculateSubstrateHydration` (lines 377–413): Computes hydration %, depletion %, available water grams, and substrate category (`dry`, `light`, `medium`, `heavy`, `saturated`). Fallback: uses 750g/L volumetric estimate if `saturatedMassGrams` is undefined.

2. **`src/scientific-core.ts`**:
   - `getSensorCalibrationStatus` (lines 39–78): Evaluates calibration validity window. Enforces 30-day window for pH (`water.ph`, `drain.ph`), 60-day window for EC (`water.ec`, `drain.ec`), and 30-day window default. Sorts records chronologically to inspect the latest event. Returns `"failed"` if latest calibration result is `"failed"`.
   - `assessMeasurementTrust` (lines 80–143): Integrated `getSensorCalibrationStatus` check into measurement trust evaluation. Maps `"failed"` status to `"suspect"`, `"uncalibrated"` with required policy to `"unverified"`, and `"expired"` to `"calibration-due"`.

3. **Independent Command Verifications**:
   - `npx tsc --noEmit`: Executed cleanly with exit code `0` (0 type errors).
   - `npx vitest run`: Passed **14 test files out of 14**, **168 tests out of 168** (0 failed).

4. **Integrity Check**:
   - No hardcoded test assertions embedded in production logic.
   - No dummy facade functions or stubbed outputs.
   - No bypassed rules or violations of `AGENTS.md` invariants.

---

## 2. Logic Chain

1. **`calculatePpfdMapSummary`**:
   - Observation 1.1 shows array inputs are filtered for `typeof p.ppfd === "number" && Number.isFinite(p.ppfd) && p.ppfd >= 0`.
   - Dimmer values outside `0..100` are clamped by `Math.max(0, Math.min(100, dimmerPercent)) / 100`.
   - Division by zero in uniformity is guarded (`mean > 0 ? Math.round((min / mean) * 1000) / 1000 : 0`).
   - Conclusion: Mathematical calculations are precise, robust, and edge-case resilient.

2. **`getSensorCalibrationStatus` & Measurement Trust**:
   - Observation 1.2 confirms calibration record sorting (`b.performedAt - a.performedAt`) ensuring the most recent calibration governs status.
   - Explicit metric window logic ensures pH sensors (high drift) expire at 30 days while EC sensors expire at 60 days.
   - Integration into `assessMeasurementTrust` enforces proper trust blocking before peer conflict checking, strictly upholding safety and trust boundaries.

3. **`calculateBiologicalPlantAge`**:
   - Observation 1.1 confirms operational start fallback when a specific `DayZeroAnchor` (e.g. `emergence`) has not been recorded yet.
   - Date subtraction uses timestamp arithmetic (`getTime()`), preventing timezone conversion bugs.

4. **`calculateSubstrateHydration`**:
   - Observation 1.1 confirms pot profile empty mass and saturated mass calculations.
   - Volumetric fallback calculates `emptyMass + fillLiters * 750` when saturated mass is missing, preventing divide-by-zero or NaN output.

5. **Independent Execution**:
   - Observation 1.3 shows all 168 vitest unit tests pass and TypeScript check completes cleanly without errors.

---

## 3. Caveats

- **Date string formats**: `getSensorCalibrationStatus` and `calculateBiologicalPlantAge` rely on standard ISO date strings (`YYYY-MM-DDTHH:mm:ssZ`) parseable by `new Date()`. Standardized ISO strings should be used across all state machines.

---

## 4. Conclusion

The code modifications in `src/domain.ts`, `src/scientific-core.ts`, `src/domain.test.ts`, and `src/scientific-core.test.ts` fulfill all Milestone 1 requirements, maintain complete strict typing, enforce robust domain invariants, and include comprehensive test coverage.

**Final Verdict**: **APPROVE**

---

## 5. Verification Method

To re-verify this assessment:

1. **Type Check**:

   ```bash
   npx tsc --noEmit
   ```

   _Expected result_: Exit code 0, 0 type errors.

2. **Unit Tests**:

   ```bash
   npx vitest run
   ```

   _Expected result_: 14 test files passed, 168 tests passed (0 failed).

3. **Inspect Core Extensions**:
   - Inspect `src/domain.ts` lines 283–413 for `calculatePpfdMapSummary`, `calculateBiologicalPlantAge`, `calculateSubstrateHydration`.
   - Inspect `src/scientific-core.ts` lines 39–143 for `getSensorCalibrationStatus` and `assessMeasurementTrust`.
