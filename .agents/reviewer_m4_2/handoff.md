# Hard Handoff Report — Reviewer 2 (Milestone 4)

**Agent:** Reviewer 2 (`reviewer_m4_2` / `teamwork_preview_reviewer`)  
**Roles:** Reviewer, Adversarial Critic  
**Task:** Independent Review of Milestone 4 (Gravimetric Dryback Tracking, State Immutability, App Shell Routing)  
**Date:** 2026-08-14  
**Verdict:** **`APPROVE`**

---

## 1. Observation

1. **State Immutability & Audit Lineage (`src/run-state.ts`)**:
   - `updatePotProfile(run: RunPackage, pot: PotProfile): RunPackage` is purely functional and creates a new `RunPackage` instance without mutating the input `run` argument.
   - Input fields are safely sanitized and clamped (`nominalVolumeLiters` clamped to $\ge 0.1$, `emptyMassGrams` clamped to $\ge 0$, `saturatedMassGrams` clamped to $\ge 0$).
   - `run.configurationSnapshot` is **never mutated**. When `run.status !== "draft"`, `run.configurationSnapshot` is preserved intact, and audit log entries explicitly record `Topfprofil geändert; Snapshot ${run.configurationSnapshot.id} nicht verändert.`
   - Generates typed `AuditEvent` (`action: "configuration-changed"`, `entityType: "pot-profile"`, `entityId: run.id`) and `DomainEvent` (`aggregateId: run.id`, `type: "configuration.changed"`, `payload: { pot: updatedPot, activeSnapshotPreserved: run.status !== "draft" }`).
   - Appends a new `RunEvent` to `run.events`.

2. **Gravimetric Mathematical Model & Boundary Handling (`src/domain.ts`)**:
   - `calculateSubstrateHydration(currentMassGrams: number, potProfile: PotProfile): SubstrateHydration` computes:
     - `availableWaterCapacity = Math.max(1, satMass - emptyMass)` (strictly prevents division-by-zero).
     - `currentWaterGrams = Math.max(0, currentMassGrams - emptyMass)` (strictly prevents negative water grams).
     - `hydrationPercent` clamped to $[0, 100]\%$.
     - `depletionPercent = 100 - hydrationPercent`.
     - Saturation fallback heuristic: `emptyMass + fillVolumeLiters * 750` when `saturatedMassGrams` is undefined/null.
     - Accurate category classification: `< 20%` $\to$ `dry`, `< 40%` $\to$ `light`, `< 70%` $\to$ `medium`, `< 90%` $\to$ `heavy`, $\ge 90\%$ $\to$ `saturated`.

3. **DailyOperatorPanel UI & Accessibility Integration (`src/components/panels/DailyOperatorPanel.tsx`)**:
   - Implements the complete "🪴 Topfgewicht & Substrat-Hydratation (Dryback Tracking)" card with responsive grid layout and semantic CSS tokens.
   - Inputs for `potMassG` (step 50, min 0, max 30000), `potTaraInput`, `potSatInput`, and `potVolInput` with minimum 44px touch targets.
   - Interactive calibration quick-save button `handleSavePotCalibration` dispatching `updatePotProfile` via `onUpdateRun`.
   - Real-time Substrat-Hydratation meter bar (`role="meter"`, `aria-label="Substrat-Hydratation"`, `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"`, `aria-valuetext`) with 5 visual color zones and needle indicator.
   - Dynamic German watering recommendations (`HYDRATION_CATEGORY_DETAILS`) covering all 5 categories (`dry`, `light`, `medium`, `heavy`, `saturated`) tailored to 3 experience lenses (`guided`, `advanced`, `expert`).
   - Inline `<TermTooltip>` components for agronomic terminology ("Topfgewicht", "TARA", "Vollsättigung", "Substrat-Feuchte", "Dryback").

4. **Independent Verification Execution**:
   - `npx vitest run`: **310 tests passed across 24 test suites** (0 failures).
   - `npx tsc --noEmit`: **0 TypeScript errors** (exit code 0).
   - `npx vite build`: **Production build succeeded** in 15.13s (exit code 0).

---

## 2. Logic Chain

1. **Immutability Contract Verification**:
   - We inspected `updatePotProfile` line-by-line (lines 415–493 in `src/run-state.ts`). The function uses the spread operator `{ ...run, config: updatedConfig }` wrapped in `touch()`. No in-place mutations of `run` or `run.configurationSnapshot` occur.
   - Unit tests in `src/components/panels/pot-weight-dryback.test.tsx` (lines 263–311) assert `expect(initialRun).not.toBe(updatedRun)` and confirm that `initialRun.config.pot` retains its original state after `updatePotProfile` executes.

2. **Moisture Category & Recommendation Coverage**:
   - `HYDRATION_CATEGORY_DETAILS` in `src/components/panels/DailyOperatorPanel.tsx` contains complete record definitions for all 5 states: `dry`, `light`, `medium`, `heavy`, and `saturated`.
   - Each state provides distinct, scientifically grounded German recommendations for `guided`, `advanced`, and `expert` lenses (e.g., permanent wilting point and matrix potential in expert mode vs. simple actionable advice in guided mode).
   - Unit tests in `pot-weight-dryback.test.tsx` test each of the 5 categories individually at defined water capacity points (18% `dry`, 30% `light`, 55% `medium`, 80% `heavy`, 95% `saturated`) and verify text contents.

3. **Adversarial Edge Case Analysis**:
   - _Gross weight below empty tare weight ($currentMass < emptyMass$)_: `currentWaterGrams` resolves to `0`, `hydrationPercent` resolves to `0%`, category maps to `dry`.
   - _Gross weight above saturated weight ($currentMass > satMass$)_: `hydrationPercent` is capped at `100%`, category maps to `saturated`.
   - _Empty mass equal to saturated mass ($satMass == emptyMass$)_: `availableWaterCapacity` is guarded by `Math.max(1, 0) = 1`, eliminating `NaN` / `Infinity` division errors.
   - _Unconfigured pot profile_: Defaults cleanly to 10L volume and 750g/L substrate water capacity heuristic.

4. **App Shell Routing Integrity**:
   - App routing stress suites (`src/AppRoutingStress.test.tsx` and `src/m4-empirical-challenge.test.ts`) confirm that all 22 navigation routes (including `#equipment` and `#today`) resolve deterministically without route drift or state pollution.

---

## 3. Caveats

1. **Historical Dryback Rate Prerequisite**:
   - The hourly dryback rate ($g/h$) calculation requires at least two measurements with positive `potMassGrams` on different days. On the initial day or when prior observations are absent, the UI gracefully renders `—`.
2. **Substrate Density Variability**:
   - When the user has not calibrated a custom `saturatedMassGrams`, the system applies the canonical 750g/L heuristic for saturated substrate. Once calibrated via the inline UI, the user-defined saturation mass supersedes the heuristic.

---

## 4. Conclusion

**Verdict: `APPROVE`**

The Milestone 4 implementation meets all functional, architectural, and quality criteria:

- Pure immutable state updates adhering to `AGENTS.md`.
- Complete audit logging and domain event generation.
- Gravimetric calculation accuracy and edge-case clamping.
- Comprehensive unit test coverage across all 5 moisture categories and 3 user lenses.
- Zero TypeScript compilation errors and 100% passing test suites (310/310).

---

## 5. Verification Method

To reproduce and independently verify this evaluation:

1. **Execute Vitest Test Suite**:

   ```powershell
   npx vitest run
   ```

   _Expected Result:_ 310 passed in 24 test suites.

2. **Execute TypeScript Static Type Check**:

   ```powershell
   npx tsc --noEmit
   ```

   _Expected Result:_ Clean exit with code 0.

3. **Execute Production Vite Build**:

   ```powershell
   npx vite build
   ```

   _Expected Result:_ Build completed successfully with 0 errors.

4. **Verify Pot Dryback Test Suite**:
   ```powershell
   npx vitest run src/components/panels/pot-weight-dryback.test.tsx
   ```
   _Expected Result:_ 21 passed (0 failed).
