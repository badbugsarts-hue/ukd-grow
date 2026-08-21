# Remediation Analysis and Specification Report: `src/domain.ts`

**Author**: `explorer_m1_it2_r2`  
**Target File**: `src/domain.ts`  
**Working Directory**: `c:\Users\badbu\Documents\grow\.agents\explorer_m1_it2_r2`  
**Date**: 2026-08-14

---

## 1. Observation

Direct empirical evidence collected during investigation and test suite execution:

1. **Failing Test #1 — String Formatting Discrepancy on Fallback**:
   - **Test File**: `src/m1-challenger-stress.test.ts:170:33`
   - **Test Name**: `calculateBiologicalPlantAge > falls back to operational start when anchor event is missing`
   - **Failure Log**:
     ```text
     AssertionError: expected '2026-08-01T12:00:00.000Z' to be '2026-08-01T12:00:00Z'
     Expected: "2026-08-01T12:00:00Z"
     Received: "2026-08-01T12:00:00.000Z"
     ```
   - **Code Location**: `src/domain.ts` line 352
     ```typescript
     if (!anchorEvent) {
       return {
         biologicalAgeDays: operationalAgeDays,
         operationalAgeDays,
         anchorDateString: opDate.toISOString(),
       };
     }
     ```
   - **Mechanism**: When `anchorEvent` is missing, line 352 returns `opDate.toISOString()`. Converting a Date object created from `"2026-08-01T12:00:00Z"` back to ISO string introduces millisecond precision (`.000Z`), altering the original event string format. When `opEvent` exists, `opEvent.occurredAt` preserves the exact original string.

2. **Failing Test #2 — Unhandled RangeError on Invalid Date String**:
   - **Test File**: `src/m1-stress.test.ts:281:16`
   - **Test Name**: `calculateBiologicalPlantAge > handles growth event with invalid date string without throwing`
   - **Failure Log**:
     ```text
     FAIL src/m1-stress.test.ts > Adversarial Stress Suite — M1 Extensions > calculateBiologicalPlantAge > handles growth event with invalid date string without throwing
     RangeError: Invalid time value
      ❯ calculateBiologicalPlantAge src/domain.ts:352:29
         350|    biologicalAgeDays: operationalAgeDays,
         351|    operationalAgeDays,
         352|    anchorDateString: opDate.toISOString(),
     ```
   - **Code Location**: `src/domain.ts` lines 334-352
   - **Mechanism**: When `growthEvents` contains an event with `occurredAt: "invalid-date"`, `new Date("invalid-date")` produces an invalid Date object (`getTime()` returns `NaN`). Calling `.toISOString()` on an invalid Date object throws a native V8 `RangeError: Invalid time value`.

3. **Substrate Hydration 0L Volume Edge Case**:
   - **Code Location**: `src/domain.ts` line 387
     ```typescript
     const satMass =
       potProfile.saturatedMassGrams &&
       potProfile.saturatedMassGrams > emptyMass
         ? potProfile.saturatedMassGrams
         : emptyMass +
           (potProfile.actualFillLiters ??
             potProfile.nominalVolumeLiters ??
             10) *
             750;
     ```
   - **Mechanism**: Nullish coalescing (`??`) treats `0` as a defined number. If `actualFillLiters === 0`, `0 ?? 10` evaluates to `0`, resulting in a calculated substrate volume of `0` Liters instead of falling back to `nominalVolumeLiters`.

---

## 2. Logic Chain

1. **Fix 1 Logic Chain (`calculateBiologicalPlantAge` fallback string)**:
   - Observation: When `anchorEvent` is absent, the fallback `anchorDateString` should represent the operational start date.
   - Premise: `opEvent.occurredAt` contains the original date string formatting (e.g. `"2026-08-01T12:00:00Z"`).
   - Deduction: If `opEvent` exists, returning `opEvent.occurredAt` directly preserves the caller's string format without re-encoding through `opDate.toISOString()`. If `opEvent` is absent but `earliestEvent` exists, `earliestEvent.occurredAt` should be returned. If neither exists, fall back to ISO string generation.

2. **Fix 2 Logic Chain (`calculateBiologicalPlantAge` invalid Date protection)**:
   - Observation: `new Date("invalid-date").toISOString()` throws `RangeError`.
   - Premise: Input event timestamps are user-provided strings and may contain malformed values.
   - Deduction: Before evaluating age differences or calling `.toISOString()`, we must check `!Number.isNaN(opDate.getTime())`. If invalid, `operationalAgeDays` must be safe-guarded to `0` and fallback string formatting must bypass `.toISOString()`.

3. **Fix 3 Logic Chain (`calculateSubstrateHydration` 0L volume protection)**:
   - Observation: `potProfile.actualFillLiters: 0` is a valid JavaScript number but represents an unfilled or unmeasured pot volume.
   - Premise: A pot volume of 0L produces non-physical hydration capacity (0g water).
   - Deduction: A positive volume check `(potProfile.actualFillLiters && potProfile.actualFillLiters > 0)` ensures that 0 (and negative values) fall through to `nominalVolumeLiters` (or the 10L default).

---

## 3. Caveats

1. **Date Parsing Fallbacks**: When `now` or an event timestamp is invalid, returning `0` for biological/operational age days and using `now.toISOString()` or raw event strings guarantees non-throwing behavior while keeping numbers finite.
2. **Backward Compatibility**: Existing valid inputs retain identical outputs. Only edge cases (`occurredAt: "invalid"`, `actualFillLiters: 0`, missing `anchorEvent`) receive improved resilience.
3. **Read-Only Explorer Scope**: This report defines the remediation spec. Implementation must be carried out by `implementer` or designated role following `AGENTS.md` guidelines.

---

## 4. Conclusion & Proposed Code Remediation

### Target File: `src/domain.ts`

#### Proposed Change 1: Update `calculateBiologicalPlantAge` (Lines 313–367)

**Target Content**:

```typescript
export function calculateBiologicalPlantAge(
  dayZeroAnchor: DayZeroAnchor,
  growthEvents: GrowthEvent[],
  now = new Date(),
): {
  biologicalAgeDays: number;
  operationalAgeDays: number;
  anchorDateString: string;
} {
  const safeEvents = Array.isArray(growthEvents) ? growthEvents : [];

  // Find operational start event
  const opEvent = safeEvents.find(
    (e) => e.kind === "run-operational-start" || e.kind === "seed-started",
  );

  const sortedEvents = [...safeEvents].sort(
    (a, b) =>
      new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime(),
  );
  const earliestEvent = sortedEvents[0];

  const opDate = opEvent
    ? new Date(opEvent.occurredAt)
    : earliestEvent
      ? new Date(earliestEvent.occurredAt)
      : now;

  const operationalAgeDays = Math.max(
    0,
    Math.floor((now.getTime() - opDate.getTime()) / (1000 * 60 * 60 * 24)),
  );

  // Find anchor event
  const anchorEvent = safeEvents.find((e) => e.kind === dayZeroAnchor);

  if (!anchorEvent) {
    return {
      biologicalAgeDays: operationalAgeDays,
      operationalAgeDays,
      anchorDateString: opDate.toISOString(),
    };
  }

  const anchorDate = new Date(anchorEvent.occurredAt);
  const biologicalAgeDays = Math.max(
    0,
    Math.floor((now.getTime() - anchorDate.getTime()) / (1000 * 60 * 60 * 24)),
  );

  return {
    biologicalAgeDays,
    operationalAgeDays,
    anchorDateString: anchorEvent.occurredAt,
  };
}
```

**Replacement Content**:

```typescript
export function calculateBiologicalPlantAge(
  dayZeroAnchor: DayZeroAnchor,
  growthEvents: GrowthEvent[],
  now = new Date(),
): {
  biologicalAgeDays: number;
  operationalAgeDays: number;
  anchorDateString: string;
} {
  const safeEvents = Array.isArray(growthEvents) ? growthEvents : [];

  // Find operational start event
  const opEvent = safeEvents.find(
    (e) => e.kind === "run-operational-start" || e.kind === "seed-started",
  );

  const sortedEvents = [...safeEvents].sort(
    (a, b) =>
      new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime(),
  );
  const earliestEvent = sortedEvents[0];

  const opDate = opEvent
    ? new Date(opEvent.occurredAt)
    : earliestEvent
      ? new Date(earliestEvent.occurredAt)
      : now;

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
    const fallbackAnchorString = opEvent
      ? opEvent.occurredAt
      : earliestEvent
        ? earliestEvent.occurredAt
        : isOpDateValid
          ? opDate.toISOString()
          : !Number.isNaN(now.getTime())
            ? now.toISOString()
            : new Date().toISOString();

    return {
      biologicalAgeDays: operationalAgeDays,
      operationalAgeDays,
      anchorDateString: fallbackAnchorString,
    };
  }

  const anchorDate = new Date(anchorEvent.occurredAt);
  const isAnchorDateValid = !Number.isNaN(anchorDate.getTime());
  const biologicalAgeDays = isAnchorDateValid
    ? Math.max(
        0,
        Math.floor(
          (now.getTime() - anchorDate.getTime()) / (1000 * 60 * 60 * 24),
        ),
      )
    : 0;

  return {
    biologicalAgeDays,
    operationalAgeDays,
    anchorDateString: anchorEvent.occurredAt,
  };
}
```

---

#### Proposed Change 2: Update `calculateSubstrateHydration` (Lines 377–390)

**Target Content**:

```typescript
// Calculate or estimate saturated mass
const satMass =
  potProfile.saturatedMassGrams && potProfile.saturatedMassGrams > emptyMass
    ? potProfile.saturatedMassGrams
    : emptyMass +
      (potProfile.actualFillLiters ?? potProfile.nominalVolumeLiters ?? 10) *
        750;
```

**Replacement Content**:

```typescript
// Calculate or estimate saturated mass
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

---

## 5. Verification Method

To verify the remediation independently after applying the changes to `src/domain.ts`:

1. **Type Check**:

   ```bash
   npx tsc --noEmit
   ```

   _Expected Result_: Exit Code 0, 0 type errors.

2. **Unit Test Suite Execution**:

   ```bash
   npx vitest run
   ```

   _Expected Result_: Exit Code 0 across all 16 test files (210/210 tests passing, 0 failed).

3. **Targeted Stress Test Verification**:
   ```bash
   npx vitest run src/m1-challenger-stress.test.ts src/m1-stress.test.ts
   ```
   _Expected Result_:
   - `calculateBiologicalPlantAge > falls back to operational start when anchor event is missing` PASSED.
   - `calculateBiologicalPlantAge > handles growth event with invalid date string without throwing` PASSED.
   - `calculateSubstrateHydration > handles zero actualFillLiters edge case` PASSED.
