# Handoff Report: Adversarial Challenge M1-1 (Domain & Data Lineage Engine)

**Agent**: `challenger_m1_1_r2`  
**Role**: Empirical Challenger (critic, specialist)  
**Target Milestone**: M1 (Domain & Data Lineage Engine Extensions)  
**Verdict**: **REQUEST_CHANGES**  
**Working Directory**: `c:\Users\badbu\Documents\grow\.agents\challenger_m1_1_r2`

---

## 1. Observation

1. **Test Execution Result**:
   - Command: `npx vitest run`
   - Output snippet:
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

2. **Source Code Inspection (`src/domain.ts`)**:
   - Line 334-338:
     ```ts
     const opDate = opEvent
       ? new Date(opEvent.occurredAt)
       : earliestEvent
         ? new Date(earliestEvent.occurredAt)
         : now;
     ```
   - Line 352:
     ```ts
     anchorDateString: opDate.toISOString(),
     ```
   - When `opEvent.occurredAt` or `earliestEvent.occurredAt` contains an invalid date string (e.g. `"invalid-date"`), `new Date("invalid-date")` constructs an `Invalid Date` instance where `.getTime()` is `NaN`. Calling `.toISOString()` on an `Invalid Date` throws `RangeError: Invalid time value`.

3. **Secondary Substrate Hydration Observation (`src/domain.ts:387`)**:
   - Line 387:
     ```ts
     potProfile.actualFillLiters ?? potProfile.nominalVolumeLiters ?? 10;
     ```
   - When `potProfile.actualFillLiters` is explicitly set to `0`, the nullish coalescing operator (`0 ?? 10`) evaluates to `0` instead of falling back to nominal volume or 10L. This sets saturated mass equal to empty mass, reducing `availableWaterCapacity` to `1` gram and skewing hydration calculations.

4. **Passing Stress Tests**:
   - `calculatePpfdMapSummary`: Passes all stress cases (negative PPFD values, Infinity/NaN, missing position tags, 0% dimmer, >100% dimmer, negative dimmer, non-finite dimmer, null/undefined inputs).
   - `getSensorCalibrationStatus`: Passes all stress cases (out-of-order calibration records, 30-day pH, 60-day EC, failed status priority, validUntil override).

---

## 2. Logic Chain

1. Observation #1 demonstrates an uncaught `RangeError: Invalid time value` thrown during `calculateBiologicalPlantAge`.
2. Observation #2 traces the root cause to `src/domain.ts:352`: `opDate.toISOString()` is invoked without checking if `opDate` is a valid date (i.e. `!Number.isNaN(opDate.getTime())`).
3. If an end-user or storage migration provides an unparseable or corrupted `occurredAt` string in `growthEvents`, invoking `calculateBiologicalPlantAge` crashes the React render tree or domain calculation pipeline.
4. Observation #3 reveals that `0 ?? 10` evaluates to `0` because JavaScript treats `0` as non-nullish. A 0L fill volume sets available water capacity to 1g, corrupting hydration calculations.
5. Therefore, the implementation in `src/domain.ts` does not meet the robustness requirements for production deployment under adversarial/malformed inputs, requiring remediation.

---

## 3. Caveats

- `calculatePpfdMapSummary` and `getSensorCalibrationStatus` proved completely resilient across all tested edge cases and property tests (1,000 random grid iterations).
- No issues were found in `src/scientific-core.ts`.

---

## 4. Conclusion

**Verdict**: **REQUEST_CHANGES**

The M1 domain extensions in `src/domain.ts` require the following fixes before approval:

1. **Fix `RangeError` in `calculateBiologicalPlantAge`**: Validate `opDate` and `anchorDate` with `Number.isNaN(date.getTime())` before calling `.toISOString()`, defaulting to `now` or safe ISO string if invalid.
2. **Fix Nullish Coalescing in `calculateSubstrateHydration`**: Use `potProfile.actualFillLiters && potProfile.actualFillLiters > 0 ? potProfile.actualFillLiters : (potProfile.nominalVolumeLiters ?? 10)` to prevent 0L fill volume from collapsing capacity to 1g.

---

## 5. Verification Method

To verify the failure and subsequent fix:

1. **Run Vitest**:
   ```bash
   npx vitest run src/m1-stress.test.ts
   ```
2. **Expected Output Before Fix**:
   - `calculateBiologicalPlantAge > handles growth event with invalid date string without throwing` fails with `RangeError: Invalid time value`.
3. **Expected Output After Fix**:
   - All 16 test files pass (210+ tests passing, 0 failing).
