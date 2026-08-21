# Handoff Report: Milestone 1 Domain & Scientific Core Empirical Challenge

**Agent**: `challenger_m1_2_r2`  
**Role**: Empirical Challenger (critic / specialist)  
**Target Milestone**: M1 (Domain & Scientific Core Engine Extensions)  
**Working Directory**: `c:\Users\badbu\Documents\grow\.agents\challenger_m1_2_r2`  
**Verdict**: **APPROVE**

---

## 1. Observation

Direct observations from empirical stress testing and codebase inspection:

1. **`src/domain.ts`**:
   - `calculatePpfdMapSummary(points, fixtureHeightCm, dimmerPercent)` (lines 283–311):
     - Safely handles `null`, `undefined`, or non-array `points` by returning zeroed summary `{ mean: 0, min: 0, max: 0, uniformity: 0 }`.
     - Dimmer factor is clamped via `Math.max(0, Math.min(100, dimmerPercent)) / 100` when `Number.isFinite(dimmerPercent)` is true, defaulting to `1` multiplier for `NaN` / `Infinity`.
     - Validates point values (`p && typeof p.ppfd === "number" && Number.isFinite(p.ppfd) && p.ppfd >= 0`), stripping negative or non-finite readings.
     - Computes rounded `mean` (1 decimal), `min` (1 decimal), `max` (1 decimal), and `uniformity` (`min / mean`, 3 decimals).
   - `calculateBiologicalPlantAge(dayZeroAnchor, growthEvents, now)` (lines 313–367):
     - Finds operational start (`run-operational-start` or `seed-started`) or falls back to earliest sorted event date or `now`.
     - Floors elapsed day calculations using `Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))`.
     - Prevents negative age for future event timestamps using `Math.max(0, ...)`.
     - Falls back to operational start age when requested `dayZeroAnchor` event is absent.
   - `calculateSubstrateHydration(currentMassGrams, potProfile)` (lines 377–413):
     - Calculates available water capacity `satMass - emptyMass`. Uses `potProfile.saturatedMassGrams` if > `emptyMass`, otherwise defaults to volumetric estimation `(actualFillLiters ?? nominalVolumeLiters ?? 10) * 750g/L`.
     - Math guard `availableWaterCapacity = Math.max(1, satMass - emptyMass)` prevents division by zero.
     - Clamps hydration percent between 0% and 100%. Handles dry pots (`currentMassGrams < emptyMassGrams`) cleanly (0% hydration, category `"dry"`).
     - Categorizes hydration into `"dry"` (<20%), `"light"` (<40%), `"medium"` (<70%), `"heavy"` (<90%), and `"saturated"` (>=90%).

2. **`src/scientific-core.ts`**:
   - `getSensorCalibrationStatus(deviceId, metric, calibrations, now)` (lines 39–78):
     - Filters calibrations by `deviceId` and `metric`, sorting descending by `performedAt` timestamp (`b - a`).
     - Returns `"failed"` if the most recent calibration attempt failed.
     - Enforces 30-day window for pH (`water.ph`, `drain.ph`), 60-day window for EC (`water.ec`, `drain.ec`), and 30-day default window.
     - Respects explicit `validUntil` override if provided.
   - `assessMeasurementTrust(...)` (lines 80–143):
     - Integrates `getSensorCalibrationStatus` into measurement trust assessment, mapping `"failed"` status to `"suspect"`, `"uncalibrated"` with required policy to `"unverified"`, and `"expired"` to `"calibration-due"`.

3. **Empirical Stress Test Harness (`src/m1-challenger-stress.test.ts`)**:
   - Authored 20 empirical stress tests covering property testing (1,000 randomized PPFD grids), dimmer boundaries (0%, 150%, -50%, NaN, Infinity), invalid PPFD point filtering, event chronological sorting, negative age clamping, dry pot mass, volumetric fill fallback, zero fill volume handling, and calibration interval sorting.

4. **Test Command Results**:
   - Executed `npx tsc --noEmit`: Exit code **0** (0 type errors).
   - Executed `npx vitest run`: Exit code **0** across **15 test files, 188 passed tests** (0 failed).

---

## 2. Logic Chain

1. **Numerical Stability & Property Invariants**:
   - For `calculatePpfdMapSummary`, property testing across 1,000 randomized grids confirmed that `min <= mean` and `0 <= uniformity <= 1.0` hold universally. Floating-point rounding to 1 decimal for min/mean and 3 decimals for uniformity preserves mathematical bounds.
2. **Boundary & Zero-Value Resilience**:
   - Edge case inputs (empty lists, negative numbers, NaN/Infinity, missing properties) execute cleanly without throwing unhandled exceptions or returning corrupt states.
   - Dry pot mass (`currentMassGrams < emptyMassGrams`) correctly yields 0% hydration and `"dry"` category instead of negative hydration percentages.
   - `availableWaterCapacity` uses `Math.max(1, satMass - emptyMass)` to protect against division by zero.
3. **Data Lineage & Calibration Window Compliance**:
   - Calibration status checks properly sort records descending by `performedAt`, ensuring the latest calibration attempt dictates sensor status. Metric validity windows (30 days pH, 60 days EC) are strictly enforced and properly block measurement trust when expired or failed.

---

## 3. Caveats

- **JavaScript `0 ?? 10` behavior**: In `calculateSubstrateHydration`, `potProfile.actualFillLiters ?? potProfile.nominalVolumeLiters` evaluates to `0` if `actualFillLiters` is explicitly set to `0` (since `0` is not nullish). In that extreme edge case, volumetric capacity becomes 0g, but `Math.max(1, ...)` prevents division by zero.
- **`fixtureHeightCm` parameter**: `fixtureHeightCm` is accepted by `calculatePpfdMapSummary` signature as context metadata but is not used in the 9-point grid summary calculation. This conforms with the specified function signature.

---

## 4. Conclusion

All 4 domain extension functions (`calculatePpfdMapSummary`, `calculateBiologicalPlantAge`, `calculateSubstrateHydration`, and `getSensorCalibrationStatus`) demonstrate robust numerical precision, strict type safety, correct boundary handling, and full compliance with scientific trust invariants.

Verdict: **APPROVE**.

---

## 5. Verification Method

To re-verify independently:

1. **Run TypeScript Compiler**:

   ```bash
   npx tsc --noEmit
   ```

   _Expected Result_: Exit code 0, no errors.

2. **Run Full Vitest Suite (including empirical stress harness)**:
   ```bash
   npx vitest run
   ```
   _Expected Result_: 15 test files passed, 188 tests passed.
