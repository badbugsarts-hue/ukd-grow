# Review Handoff Report — Milestone 1 Remediation (Iteration 2)

**Reviewer**: `reviewer_m1_1_it2`  
**Target File**: `src/domain.ts`  
**Working Directory**: `c:\Users\badbu\Documents\grow\.agents\reviewer_m1_1_it2`  
**Date**: 2026-08-14  
**Verdict**: **APPROVE**

---

## 1. Observation

### Code Review of Modifications (`src/domain.ts`)

1. **`calculateBiologicalPlantAge` (`src/domain.ts:334-367`)**:

   ```typescript
   const isOpDateValid = !Number.isNaN(opDate.getTime());
   const operationalAgeDays = isOpDateValid
     ? Math.max(
         0,
         Math.floor((now.getTime() - opDate.getTime()) / (1000 * 60 * 60 * 24)),
       )
     : 0;

   // Find anchor event
   const anchorEvent = safeEvents.find((e) => e.kind === dayZeroAnchor);

   if (!anchorEvent) {
     const fallbackAnchorString = isOpDateValid
       ? opDate.toISOString()
       : opEvent
         ? opEvent.occurredAt
         : earliestEvent
           ? earliestEvent.occurredAt
           : !Number.isNaN(now.getTime())
             ? now.toISOString()
             : new Date().toISOString();

     return {
       biologicalAgeDays: operationalAgeDays,
       operationalAgeDays,
       anchorDateString: fallbackAnchorString,
     };
   }
   ```
   - **Observation**: Calling `.toISOString()` is guarded by `isOpDateValid`. If an event contains a malformed/unparseable date string (e.g., `"invalid-date"`), `isOpDateValid` evaluates to `false`, preventing `RangeError: Invalid time value`. Fallbacks cleanly return raw string dates or `now.toISOString()`.

2. **`calculateSubstrateHydration` (`src/domain.ts:377-388`)**:
   ```typescript
   const fillVolumeLiters =
     potProfile.actualFillLiters && potProfile.actualFillLiters > 0
       ? potProfile.actualFillLiters
       : potProfile.nominalVolumeLiters && potProfile.nominalVolumeLiters > 0
         ? potProfile.nominalVolumeLiters
         : 10;

   const satMass =
     potProfile.saturatedMassGrams && potProfile.saturatedMassGrams > emptyMass
       ? potProfile.saturatedMassGrams
       : emptyMass + fillVolumeLiters * 750;
   ```
   - **Observation**: `potProfile.actualFillLiters && potProfile.actualFillLiters > 0` prevents a `0` fill volume from being treated as a non-nullish 0L volume. When `actualFillLiters === 0` (unmeasured fill), it properly falls back to `nominalVolumeLiters` (or 10L default), ensuring `satMass` and `hydrationPercent` are calculated correctly.

### Tool Executions and Results

1. **TypeScript Type Check**:
   - Command: `npx tsc --noEmit`
   - Result: Exit code 0 (0 type errors).

2. **Vitest Unit Test Suite**:
   - Command: `npx vitest run`
   - Result: Exit code 0 (16/16 test files passed, 210/210 tests passed).

---

## 2. Logic Chain

1. **`calculateBiologicalPlantAge` Invalid Date Safety**:
   - **Step 1**: Parsing `occurredAt` with `new Date(string)` produces an invalid Date object when the string is malformed. `new Date("invalid").getTime()` evaluates to `NaN`.
   - **Step 2**: Calling `.toISOString()` on an invalid Date throws `RangeError`.
   - **Step 3**: Checking `!Number.isNaN(opDate.getTime())` guarantees `.toISOString()` is only called on valid dates.
   - **Step 4**: When `isOpDateValid` is false, returning the original string or a fallback timestamp avoids crashes while preserving data lineage.

2. **`calculateSubstrateHydration` Zero-Fill Volumetric Fallback**:
   - **Step 1**: In JavaScript, `0 ?? default` resolves to `0` because `0` is non-nullish.
   - **Step 2**: A user pot profile with `actualFillLiters: 0` represents an unmeasured fill level, not a physical 0-liter container.
   - **Step 3**: Using explicit positive check `potProfile.actualFillLiters && potProfile.actualFillLiters > 0` causes `0` to fall back to `nominalVolumeLiters` (or default 10L).
   - **Step 4**: `satMass` is accurately estimated as `emptyMass + fillVolumeLiters * 750`, restoring accurate hydration percentage and category classification.

3. **Integrity Audit**:
   - Analyzed code for hardcoded test results, facade logic, or shortcuts.
   - Confirmed all functions execute real mathematical calculations and handle edge cases deterministically. No integrity violations found.

---

## 3. Caveats

No caveats. All edge cases for invalid dates, missing anchors, unmeasured fill volumes, and boundary conditions were investigated and confirmed safe.

---

## 4. Conclusion

**Verdict**: **APPROVE**

The remediation changes in `src/domain.ts` fully fix the `RangeError` on invalid dates in `calculateBiologicalPlantAge` and the 0L fill volume issue in `calculateSubstrateHydration`. The codebase passes TypeScript type checking with 0 errors and passes all 210 unit tests across 16 test files.

---

## 5. Verification Method

To independently verify:

1. **Type Check**:

   ```bash
   npx tsc --noEmit
   ```

   _Expected Output_: Exit code 0.

2. **Unit Test Suite**:
   ```bash
   npx vitest run
   ```
   _Expected Output_: Exit code 0 (16 test files passed, 210/210 tests passed).
