# Forensic Audit Report — Milestone 1 Iteration 2

**Work Product**: `src/domain.ts` and `src/scientific-core.ts`  
**Profile**: General Project  
**Integrity Mode**: Development / Demo  
**Auditor**: `auditor_m1_it2`  
**Date**: 2026-08-14  
**Verdict**: **CLEAN**

---

## 1. Observation

Direct empirical evidence gathered during the audit:

1. **`calculateBiologicalPlantAge` (`src/domain.ts:313-377`)**:
   - `opDate` validation check: `const isOpDateValid = !Number.isNaN(opDate.getTime());`
   - Operational age calculation: `Math.max(0, Math.floor((now.getTime() - opDate.getTime()) / (1000 * 60 * 60 * 24)))`
   - Fallback anchor date string resolution handles invalid date strings safely without throwing `RangeError: Invalid time value`, while outputting proper ISO date strings for valid dates.
   - Biological age calculation properly evaluates date difference from `anchorEvent.occurredAt`.

2. **`calculateSubstrateHydration` (`src/domain.ts:387-430`)**:
   - Fill volume resolution: `potProfile.actualFillLiters && potProfile.actualFillLiters > 0 ? potProfile.actualFillLiters : potProfile.nominalVolumeLiters && potProfile.nominalVolumeLiters > 0 ? potProfile.nominalVolumeLiters : 10`
   - Explicit positive volume check prevents `0` from overriding nominal volume.
   - Dynamic hydration percent calculation: `Math.min(100, Math.max(0, Math.round((currentWaterGrams / availableWaterCapacity) * 100)))`.

3. **TypeScript Compiler (`npx tsc --noEmit`)**:
   - Command: `npx tsc --noEmit`
   - Exit Code: `0`
   - Errors: `0`

4. **Vitest Unit Test Suite (`npx vitest run`)**:
   - Command: `npx vitest run`
   - Exit Code: `0`
   - Test Files Passed: 16 / 16
   - Individual Tests Passed: 210 / 210

---

## 2. Logic Chain

1. **Hardcoded Test Results Check**:
   - Source code analysis confirms zero embedded test output string literals or hardcoded return constants in `src/domain.ts` and `src/scientific-core.ts`.
   - Calculations vary dynamically based on input parameters (dates, pot profiles, measurements).

2. **Facade Implementation Check**:
   - All exported functions contain genuine, domain-accurate algorithms (DLI, Leaf VPD, PPFD map summary, substrate hydration, biological plant age, sensor calibration status, trust assessment).

3. **Pre-Populated Artifact Check**:
   - Search for pre-populated result files returned only Playwright standard runtime test output artifacts in `test-results/`. No fabricated attestation or result files present.

4. **Self-Certifying Test Check**:
   - Unit test suites (`src/domain.test.ts`, `src/m1-stress.test.ts`, `src/m1-challenger-stress.test.ts`, `src/scientific-core.test.ts`) test the functions against independently computed mathematical expected values and edge cases.

5. **Execution Delegation Check**:
   - Domain and scientific core routines execute purely using standard ES2022 language features with zero external runtime package dependencies.

---

## 3. Caveats

No caveats. All required forensic checks pass cleanly, all unit tests pass, and type checks are clean with exit code 0.

---

## 4. Conclusion

The remediation changes in `src/domain.ts` and `src/scientific-core.ts` represent clean, genuine, and robust code. No integrity violations or cheating patterns were detected.

**Final Verdict**: **CLEAN**

---

## 5. Verification Method

To independently re-verify this verdict:

1. **Type Check**:

   ```bash
   npx tsc --noEmit
   ```

   _Expected Output_: Exit Code 0.

2. **Test Suite Execution**:
   ```bash
   npx vitest run
   ```
   _Expected Output_: Exit Code 0 (16 test files passed, 210/210 tests passed).
