# Empirical Adversarial Stress Test Report — Challenger 1

**Target**: UKD Grow Masterplan — Setup View, Dryback Tare, Live/Simulation Transitions, and Retroactive Plant Milestones
**Author**: Challenger 1 (Specialist / Critic)
**Date**: 2026-08-21
**Verdict**: **REQUEST_CHANGES** (Blocking Typecheck Failure in `RunConfigPanel.tsx:187`)

---

## 1. Executive Summary

As Challenger 1, an empirical, code-executing adversarial stress test suite was created and executed in `src/challenger-setup-stress.test.tsx`. The suite covers 32 targeted adversarial scenarios across 4 core pillars:
1. Extreme, zero, negative, and boundary inputs for tent geometry, ventilation, and lighting.
2. Substrate dryback tare calculations ($M_{sat} \le M_{empty}$, missing, equal, inverted tare weights, overflow).
3. Rapid mode oscillation (Simulation $\leftrightarrow$ Live) verifying audit trail integrity, event uniqueness, and configuration immutability.
4. Retroactive plant milestone adjustments (past, future, swapped potting/emergence dates, anchor revisions).

### Empirical Execution Results
- **Vitest Unit & Stress Suite**: **485/485 passing** across 41 test files (including 32/32 passing in `src/challenger-setup-stress.test.tsx`).
- **TypeScript Typecheck (`tsc -b`)**: **FAILED (1 error)**.
  - Location: `src/components/panels/RunConfigPanel.tsx:187:11`
  - Error: `error TS2339: Property 'currentDay' does not exist on type 'RunPackage'.`
- **Production Build (`npm run build`)**: **FAILED** (blocked by the `tsc -b` failure).

---

## 2. Findings & Adversarial Analysis

### 🚨 Finding 1 [BLOCKING]: Typecheck Error TS2339 in `RunConfigPanel.tsx`
- **Location**: `src/components/panels/RunConfigPanel.tsx`, line 187.
- **Code snippet**:
  ```typescript
  const activeDay =
    run.executionMode === "live"
      ? Math.max(0, biologicalAge.operationalAgeDays)
      : (run.currentDay ?? biologicalAge.biologicalAgeDays);
  ```
- **Root Cause**: `RunPackage` (in `src/types.ts:1386`) does not declare a `currentDay` property. The property is dynamically computed or managed as React local state in `App.tsx`.
- **Blast Radius**: Fails `npm run typecheck`, `npm run build`, and `npm run check`.
- **Recommended Fix**:
  ```typescript
  const activeDay =
    run.executionMode === "live"
      ? Math.max(0, biologicalAge.operationalAgeDays)
      : biologicalAge.biologicalAgeDays;
  ```

---

### 🛡️ Finding 2 [ROBUST]: Tent Geometry, Lighting & Ventilation Boundary Handling
- **Zero & Negative Dimensions**:
  - `tentWidthCm: 0, tentDepthCm: 0, tentHeightCm: 0` $\rightarrow$ correctly computes `tentAreaM2 = 0.00 m²`, `tentVolumeM3 = 0.00 m³`, plant density fallback `"—”`, turnover rate `0x/h` without throwing `NaN`, `Infinity`, or divide-by-zero errors.
  - Negative dimensions (`-60cm`) $\rightarrow$ correctly fail-closed in `calculateReadinessScore` (`isReady: false`, score $\le 80\%$, activation blocked).
- **Extreme Scale (10,000 cm / 100m)**:
  - Computes `10000.00 m²` and `500000.00 m³` safely without floating point overflow.
- **Plant Count & KCanG Compliance**:
  - $\le 3$ plants: `"✓ Konform (≤3)"`.
  - $> 3$ plants: `"⚠️ >3 Pflanzen"`.
  - Negative / 0 input: clamped to $\ge 1$ plant safely.
- **Photobiology**:
  - `0W` or `0h` photoperiod: `calculateDli` yields `0.0 mol/m²/d`; `calculateReadinessScore` flags missing lighting.
  - Extreme dimmer settings ($<0\%$ or $>100\%$): clamped to $[0, 1]$ in `calculatePpfdMapSummary`.
- **Water Ca:Mg Guidance**:
  - $Mg = 0$: renders `"60:0:1"` and warns `"⚠️ CalMag Ausgleich empfohlen"` without division by zero.
  - Inverted ratio ($Ca=20, Mg=60 \rightarrow 0.3:1$): triggers CalMag warning.
  - Ideal ratio ($Ca=60, Mg=20 \rightarrow 3.0:1$): marks `"✓ Ideal (3:1 bis 4:1)"`.

---

### 🛡️ Finding 3 [ROBUST]: Substrate Dryback Tare & Hydration Invariants
- **Missing Tares**:
  - `emptyMassGrams === null` $\rightarrow$ `state: "INSUFFICIENT_DATA"`, `reason: "EMPTY_MASS_MISSING"`, `hydrationPercent: null`.
  - `saturatedMassGrams === null` $\rightarrow$ `state: "INSUFFICIENT_DATA"`, `reason: "SATURATION_REFERENCE_MISSING"`.
- **Equal Tares ($M_{sat} == M_{empty}$)**:
  - Prevents divide-by-zero ($M_{sat} - M_{empty} = 0$) by returning `state: "INSUFFICIENT_DATA"`, `reason: "SATURATION_REFERENCE_MISSING"`.
- **Inverted Tares ($M_{sat} < M_{empty}$)**:
  - If $M_{curr} < M_{empty}$: returns `state: "UNKNOWN"`, `reason: "MASS_BELOW_TARE"`.
  - If $M_{curr} \ge M_{empty}$: returns `state: "INSUFFICIENT_DATA"`, `reason: "SATURATION_REFERENCE_MISSING"`.
- **Mass Below Tare ($M_{curr} < M_{empty}$)**:
  - Returns `state: "UNKNOWN"`, `reason: "MASS_BELOW_TARE"`.
- **Mass Exceeds Saturation ($M_{curr} > 1.05 \times M_{sat}$)**:
  - At $M_{sat} \times 1.05$ (5250g for 5000g sat): remains `VALID` and clamps hydration to $100\%$.
  - At $> 1.05 \times M_{sat}$ (5300g): returns `state: "UNKNOWN"`, `reason: "MASS_EXCEEDS_SATURATION"`.
- **Progression**:
  - Dry ($0\%$), Light ($25\%$), Medium ($50\%$), Heavy ($80\%$), Saturated ($100\%$) accurately map to categorical intervals.
- **Fuzz Testing**:
  - 500 randomized parameter configurations verified zero unhandled exceptions, zero NaN values, and strict $H\% + D\% = 100\%$ sum invariants.

---

### 🛡️ Finding 4 [ROBUST]: Rapid Live/Simulation Mode Toggling & Audit Trail
- **Idempotency**:
  - `updateExecutionMode(run, "simulation")` on a simulation run returns the exact same object reference without redundant audit logs.
- **Draft Activation**:
  - Transitioning draft run to `"live"` sets `status: "active"`, initializes `liveAnchor` (with `startedAtUtc`, `confirmedAtUtc`, `timeZoneAtConfirmation`), and sets `clockHealth` to `healthy`.
- **Rapid 10-Cycle Oscillation**:
  - Audit event list grew by exactly 10 events with globally unique UUIDs.
  - Domain event list grew by exactly 10 events.
  - Immutable configuration snapshot `run.configurationSnapshot.id` was never modified.
  - Setup parameters (genetics, tent dimensions, pot profiles, water profiles) remained 100% byte-for-byte identical.
- **Live Clock Health & Anti-Rollback**:
  - Clock rollback $> 5\text{min}$ triggers `blocked: true`, `status: "blocked-clock-rollback"`.
  - Future anchor ($T_{anchor} > T_{system}$) triggers `blocked: true`, `status: "blocked-before-anchor"`.

---

### 🛡️ Finding 5 [ROBUST]: Retroactive Plant Milestones & Chronology Edge Cases
- **Chronological Entry**:
  - Potting ($T_1$) and Emergence ($T_2 > T_1$) correctly record `seed-planted` and `emergence` growth events, deriving germination days ($T_2 - T_1$) and anchor date.
- **Swapped Dates ($T_{emergence} < T_{potting}$)**:
  - `calculateBiologicalPlantAge` protects against negative germination duration by clamping via `Math.max(0, ...)`, yielding `germinationDays = 0` and positive biological age without runtime exceptions.
  - UI displays `"—”` for germination duration gracefully.
- **Future Emergence Dates**:
  - Biological age and operational age are clamped to `0` (never negative).
- **Distant Past Emergence Dates (e.g. 200 days ago)**:
  - `getDayPlan(workbook, 200)` clamps row index to 81 (Day 80), preventing out-of-bounds array crashes.
- **Live Anchor Revisions**:
  - When modifying milestones on an active Live run, `run.anchorRevisions` accumulates immutable revision entries recording `previousStartedAtUtc`, `nextStartedAtUtc`, `reason`, and `correctedAtUtc`.

---

## 3. Test Suite Artifact

The adversarial test suite is located at:
`src/challenger-setup-stress.test.tsx`

### Test Breakdown (32/32 Passing)
- **Group 1: Tent Dimensions, Lighting & Ventilation** (8 tests)
  - `Stress 1.1`: Zero tent dimensions handling $\rightarrow$ PASS
  - `Stress 1.2`: Negative tent dimensions fail-closed $\rightarrow$ PASS
  - `Stress 1.3`: Massive tent dimensions scale $\rightarrow$ PASS
  - `Stress 1.4`: Plant count boundary & KCanG badge $\rightarrow$ PASS
  - `Stress 1.5`: Lighting photobiology & DLI $\rightarrow$ PASS
  - `Stress 1.6`: PPFD Map Summary boundary & dimmers $\rightarrow$ PASS
  - `Stress 1.7`: Ventilation turnover with zero volume $\rightarrow$ PASS
  - `Stress 1.8`: Water Ca:Mg ratio guidance $\rightarrow$ PASS
- **Group 2: Substrate Dryback Tare Calculations** (9 tests)
  - `Stress 2.1`: Missing tare weights $\rightarrow$ PASS
  - `Stress 2.2`: Equal tare weights ($M_{sat} = M_{empty}$) $\rightarrow$ PASS
  - `Stress 2.3`: Inverted tare weights ($M_{sat} < M_{empty}$) $\rightarrow$ PASS
  - `Stress 2.4`: Mass below empty tare $\rightarrow$ PASS
  - `Stress 2.5`: Mass exceeding 105% saturation $\rightarrow$ PASS
  - `Stress 2.6`: NaN and Infinity mass inputs $\rightarrow$ PASS
  - `Stress 2.7`: Strict mathematical hydration progression $\rightarrow$ PASS
  - `Stress 2.8`: Pot profile reducer clamping $\rightarrow$ PASS
  - `Stress 2.9`: 500-run fuzz test $\rightarrow$ PASS
- **Group 3: Rapid Mode Toggling & Audit Trail** (4 tests)
  - `Stress 3.1`: Same-mode idempotency $\rightarrow$ PASS
  - `Stress 3.2`: Draft to live activation $\rightarrow$ PASS
  - `Stress 3.3`: 10-cycle oscillation integrity $\rightarrow$ PASS
  - `Stress 3.4`: Anti-rollback & future anchor evaluation $\rightarrow$ PASS
- **Group 4: Retroactive Plant Milestones** (6 tests)
  - `Stress 4.1`: Chronological milestone update $\rightarrow$ PASS
  - `Stress 4.2`: Swapped date order handling $\rightarrow$ PASS
  - `Stress 4.3`: Future emergence date clamping $\rightarrow$ PASS
  - `Stress 4.4`: Distant past date handling $\rightarrow$ PASS
  - `Stress 4.5`: Live anchor revision tracking $\rightarrow$ PASS
  - `Stress 4.6`: Invalid date string handling $\rightarrow$ PASS
- **Group 5: Full UI Integration & Fail-Closed Gate** (5 tests)
  - `Stress 5.1 (guided)`: Guided lens rendering $\rightarrow$ PASS
  - `Stress 5.1 (advanced)`: Advanced lens rendering $\rightarrow$ PASS
  - `Stress 5.1 (expert)`: Expert lens rendering $\rightarrow$ PASS
  - `Stress 5.2`: Invariant 4 water profile gate $\rightarrow$ PASS
  - `Stress 5.3`: Run activation immutable snapshot $\rightarrow$ PASS

---

## 4. Final Verdict

**Verdict**: **REQUEST_CHANGES**

**Required Action before Merge**:
Fix the TypeScript compilation error in `src/components/panels/RunConfigPanel.tsx:187` by eliminating `run.currentDay`. Once fixed, `npx tsc -b` and `npm run build` will succeed cleanly.
