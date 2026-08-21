# Milestone 4 Handoff Report: Pot Weight Dryback Tracking & State Management Adversarial Review

## 1. Observation

Direct observations from codebase inspection and empirical command executions:

1. **Gravimetric Dryback Math & Category Classification (`src/domain.ts:389-432`)**:
   - `calculateSubstrateHydration(currentMassGrams, potProfile)` correctly computes:
     - `availableWaterCapacity = Math.max(1, satMass - emptyMass)`
     - `currentWaterGrams = Math.max(0, currentMassGrams - emptyMass)`
     - `hydrationPercent = Math.min(100, Math.max(0, Math.round((currentWaterGrams / availableWaterCapacity) * 100)))`
     - `depletionPercent = 100 - hydrationPercent`
     - Clamps categories cleanly into 5 zones: `dry` (<20%), `light` (20–39%), `medium` (40–69%), `heavy` (70–89%), and `saturated` (≥90%).
   - Inverted calibration (where `saturatedMassGrams <= emptyMassGrams`) is safely guarded: if `saturatedMassGrams > emptyMass` fails, it falls back to `emptyMass + fillVolumeLiters * 750`, preventing zero/negative divisions.
   - Volume fallback: If `nominalVolumeLiters <= 0` or null, it falls back to 10L without throwing or producing NaN.

2. **Historical Dryback Rate Calculation (`src/components/panels/DailyOperatorPanel.tsx:592-610`)**:
   - Historical dryback rate filters only strictly preceding observations (`obs.day < selectedDay` with `potMassGrams > 0`), taking the latest preceding observation.
   - Delta time is calculated as `deltaHours = (selectedDay - prev.day) * 24`.
   - If `massLoss <= 0` (e.g. re-watering occurred) or no previous observation exists, `historicalDrybackRate` returns `null` and renders fallback string `" — "`.

3. **Pure State Transitions & Audit Trail (`src/run-state.ts:415-470`)**:
   - `updatePotProfile(run, pot)` immutably copies state, creates a `configuration-changed` audit event, and appends a `configuration.changed` domain event.
   - Zero mutation verified on original `RunPackage` instance.

4. **Dynamic German Recommendations across 3 Experience Lenses (`src/components/panels/DailyOperatorPanel.tsx:252-330, 2420-2478`)**:
   - Comprehensive German recommendation titles and descriptions tailored to `guided`, `advanced`, and `expert` lenses without hardcoded assumptions or broken terminology.

5. **Typecheck & Full Test Suite Execution**:
   - `npx tsc --noEmit` exited with code 0 (0 type errors).
   - `npx vitest run` executed 26 test files, 339 tests passing (100% pass rate, 0 failures).

---

## 2. Logic Chain

1. **Assumption Verification**:
   - _Hypothesis 1_: Extreme boundary inputs (current mass = tare, mass > saturated, mass < tare, negative mass, 0L volume, inverted tare/sat) could cause division by zero or NaN.
     - _Empirical test_: Tested in `src/components/panels/pot-weight-dryback.adversarial.test.tsx` (16 test cases + 1,000 randomized Monte Carlo fuzz runs).
     - _Inference_: Math bounds `[0, 100]` for hydration and depletion strictly hold; `availableWaterGrams >= 0` always; category is always valid. Hypothesis refuted.
   - _Hypothesis 2_: Missing historical observations or non-contiguous days could lead to negative rates or NaN crashes.
     - _Empirical test_: Evaluated Day 0 standalone, Day 3 -> Day 5 (48h delta = 25.0 g/h), and watering increase (4800g > 2000g).
     - _Inference_: Accurately computes `g/h` rate for valid loss across multi-day spans and safely returns `null` for watering events without negative numbers or NaN. Hypothesis refuted.
   - _Hypothesis 3_: Rapid consecutive calibration updates could cause state mutation or audit event drift.
     - _Empirical test_: Executed 20 rapid sequential calls to `updatePotProfile`.
     - _Inference_: State remained fully immutable; all 20 events recorded in audit and domain event streams; no race condition or data corruption. Hypothesis refuted.

2. **Compliance with AGENTS.md & ORIGINAL_REQUEST.md**:
   - UI components respect 44px minimum touch targets and accessible `role="meter"` semantics.
   - Zero mutation on active Run snapshots preserved.
   - Full German localization and terminology consistent across all lenses.

---

## 3. Caveats

- **No live hardware scale connection**: This implementation gravimetrically tracks user-entered pot weights and estimates substrate hydration without direct Bluetooth/Wi-Fi scale hardware polling (as aligned with `capability-roadmap.json` live-sensor invariants in AGENTS.md).
- **Substrate composition density**: The fallback density heuristic is calibrated to 750 g/L (typical for peat/coco mixes at field capacity). Users are encouraged to calibrate actual empty tare and saturated mass for non-standard substrates.

---

## 4. Conclusion

### **VERDICT: APPROVE**

The Milestone 4 Pot Weight Dryback Tracking Widget and state management implementation is robust, mathematically sound, resilient against extreme and malformed inputs, adheres to pure immutable state transitions with full audit lineage, and passes all 339 tests and TypeScript checks.

---

## 5. Verification Method

Independent reproduction commands:

1. **TypeScript Typecheck**:

   ```bash
   npx tsc --noEmit
   ```

   _Expected result_: Exit code 0, no errors.

2. **Adversarial Stress Test Suite**:

   ```bash
   npx vitest run src/components/panels/pot-weight-dryback.adversarial.test.tsx
   ```

   _Expected result_: 16/16 tests passing, including 1,000-run Monte Carlo fuzz test.

3. **Full Project Test Suite**:
   ```bash
   npx vitest run
   ```
   _Expected result_: 26/26 test files passing, 339/339 tests passing.
