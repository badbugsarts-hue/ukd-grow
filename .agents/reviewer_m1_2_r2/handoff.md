# Handoff Report: Review of Milestone 1 Domain & Data Lineage Extensions

**Agent**: `reviewer_m1_2_r2`  
**Role**: Reviewer / Critic  
**Working Directory**: `c:\Users\badbu\Documents\grow\.agents\reviewer_m1_2_r2`  
**Verdict**: **REQUEST_CHANGES**

---

## 1. Observation

Direct observations from codebase inspection, static type checking, unit test execution, and stress testing:

1. **Type Check (`npx tsc --noEmit`)**:
   - Command: `npx tsc --noEmit`
   - Result: Exit code **0** (0 type errors).

2. **Unit Test Execution (`npx vitest run`)**:
   - Command: `npx vitest run`
   - Result: Exit code **1**. Total 16 test files: 15 passed, 1 failed (209 passed tests, 1 failed test).
   - Verbatim failure output:
     ```
     FAIL  src/m1-stress.test.ts > Adversarial Stress Suite — M1 Extensions > calculateBiologicalPlantAge > handles growth event with invalid date string without throwing
     RangeError: Invalid time value
      ❯ calculateBiologicalPlantAge src/domain.ts:352:29
         350|    biologicalAgeDays: operationalAgeDays,
         351|    operationalAgeDays,
         352|    anchorDateString: opDate.toISOString(),
            |                             ^
         353|   };
         354|  }
      ❯ src/m1-stress.test.ts:281:16
     ```

3. **Code Inspection (`src/domain.ts:334-367`)**:
   - Lines 334-338:
     ```typescript
     const opDate = opEvent
       ? new Date(opEvent.occurredAt)
       : earliestEvent
         ? new Date(earliestEvent.occurredAt)
         : now;
     ```
   - Lines 340-353:
     ```typescript
     const operationalAgeDays = Math.max(
       0,
       Math.floor((now.getTime() - opDate.getTime()) / (1000 * 60 * 60 * 24)),
     );
     // ...
     if (!anchorEvent) {
       return {
         biologicalAgeDays: operationalAgeDays,
         operationalAgeDays,
         anchorDateString: opDate.toISOString(),
       };
     }
     ```
   - When `opEvent.occurredAt` contains an unparseable or invalid date string (e.g. `"invalid-date"`), `new Date("invalid-date")` constructs an invalid `Date` instance. Calling `opDate.toISOString()` on an invalid `Date` throws `RangeError: Invalid time value`. Furthermore, `opDate.getTime()` evaluates to `NaN`, causing `operationalAgeDays` to evaluate to `NaN`.

4. **Integrity Audit**:
   - Verified `src/domain.ts` and `src/scientific-core.ts` for integrity violations (hardcoded test returns, dummy facades, shortcuts, self-certifying work).
   - Findings: **No integrity violations found.** Algorithms and data transformers perform genuine calculations.

---

## 2. Logic Chain

1. **Step 1 (Observation 1 & 4)**: Static typing (`npx tsc --noEmit`) passes cleanly with no compilation issues or exported signature errors. The core algorithms in `src/domain.ts` and `src/scientific-core.ts` (PPFD mapping summary, sensor calibration status, measurement trust assessment, substrate hydration) implement real logic without hardcoding.
2. **Step 2 (Observation 2 & 3)**: Executing `npx vitest run` triggers a test failure in `src/m1-stress.test.ts` under `calculateBiologicalPlantAge`.
3. **Step 3 (Observation 3)**: `calculateBiologicalPlantAge` attempts to call `.toISOString()` on `opDate` without checking whether `opDate` represents a valid date (`!Number.isNaN(opDate.getTime())`). If an invalid date string is passed in `GrowthEvent.occurredAt`, `new Date(...)` creates an invalid date, causing `opDate.toISOString()` to throw an uncaught `RangeError: Invalid time value`.
4. **Step 4 (Conclusion)**: Because `npx vitest run` exits with code 1 due to an unhandled runtime error on invalid date inputs, the implementation does not meet the Definition of Done (`npx vitest run` passing cleanly with 0 failures). Therefore, the verdict must be **REQUEST_CHANGES**.

---

## 3. Caveats

- **Scope Limit**: As a reviewer, I am strictly restricted from editing implementation code in `src/domain.ts` or `src/scientific-core.ts`. The fix must be implemented by the worker/implementer agent.
- **Other Components**: All other M1 functions (`calculatePpfdMapSummary`, `getSensorCalibrationStatus`, `assessMeasurementTrust`, `calculateSubstrateHydration`) passed all unit tests and stress assertions without failure.

---

## 4. Conclusion & Review Findings

### Review Summary

**Verdict**: **REQUEST_CHANGES**

### Findings

#### [Major] Finding 1: Unhandled `RangeError` on invalid date strings in `calculateBiologicalPlantAge`

- **What**: `calculateBiologicalPlantAge` throws `RangeError: Invalid time value` when `occurredAt` contains an unparseable or invalid date string.
- **Where**: `src/domain.ts`, line 352 (and line 356 for `anchorDate`).
- **Why**: `new Date(invalidString)` creates an invalid Date object (`Date { NaN }`). Attempting to call `.toISOString()` on an invalid Date throws `RangeError`. Additionally, `opDate.getTime()` returns `NaN`, making `operationalAgeDays` evaluate to `NaN`.
- **Suggestion**: Guard `opDate` and `anchorDate` validation:
  ```typescript
  const isValidDate = (d: Date) => !Number.isNaN(d.getTime());
  const safeOpDate = isValidDate(opDate) ? opDate : now;
  const anchorDateString = isValidDate(opDate)
    ? opDate.toISOString()
    : now.toISOString();
  ```

---

## Verified Claims

- `npx tsc --noEmit` runs without type errors → **PASS**
- Integrity violation check (no hardcoded test outputs / facades) → **PASS**
- `calculatePpfdMapSummary` handles grid scaling, 0% dimmer, NaN values, empty arrays → **PASS**
- `getSensorCalibrationStatus` handles 30-day pH and 60-day EC calibration windows, failed calibrations → **PASS**
- `assessMeasurementTrust` integrates sensor calibration status into trust status decisions → **PASS**
- `calculateSubstrateHydration` computes hydration categories and volumetric fallbacks → **PASS**
- `npx vitest run` passes all unit and stress tests → **FAIL** (1 test failed in `src/m1-stress.test.ts`)

---

## 5. Verification Method

To independently verify:

1. **Run Typecheck**:

   ```bash
   npx tsc --noEmit
   ```

   _Expected_: Exit code 0.

2. **Run Unit Tests**:
   ```bash
   npx vitest run
   ```
   _Expected (Currently)_: Exit code 1 due to `src/m1-stress.test.ts > calculateBiologicalPlantAge > handles growth event with invalid date string without throwing`.
